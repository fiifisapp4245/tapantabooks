"use client"

/**
 * Every figure is computed once here and reused by the dashboard, KPI cards,
 * nav badges and tabs, so they can never disagree.
 *
 * Rules that hold everywhere:
 * - "Due in 7 days" excludes overdue items. Overdue is its own figure.
 * - Days are counted from DEMO_TODAY (lib/dates TODAY), never the clock.
 * - Balances come from posted journals only (reversed ones net to zero
 *   through their reversal entries).
 */
import { useMemo } from "react"
import type { BadgeKey } from "@/lib/nav"
import { useLedger, type LedgerState } from "@/lib/ledger"
import { addDays, daysBetween, endOfMonth, monthKey, TODAY } from "@/lib/dates"
import type { Account, Bill, Contact, Invoice, Journal } from "@/lib/types"
import type { Status } from "@/components/patterns/status-badge"

const r2 = (n: number) => Math.round(n * 100) / 100

/* ---------------- journals & balances ---------------- */

export const inLedger = (j: Journal) => j.status === "posted" || j.status === "reversed"

export type LineFilter = {
  from?: string
  to?: string
  branch?: string
  /** Profit & loss views leave out year-end closing entries. */
  pnl?: boolean
}

export function ledgerLines(s: LedgerState, f: LineFilter = {}) {
  const out: { journal: Journal; accountCode: string; debit: number; credit: number; description?: string }[] = []
  for (const j of s.journals) {
    if (!inLedger(j)) continue
    if (f.from && j.date < f.from) continue
    if (f.to && j.date > f.to) continue
    if (f.branch && f.branch !== "all" && j.branch !== f.branch) continue
    if (f.pnl && j.source === "closing") continue
    for (const l of j.lines) out.push({ journal: j, accountCode: l.accountCode, debit: l.debit, credit: l.credit, description: l.description })
  }
  return out
}

/** Debit-minus-credit movement per account. */
export function movements(s: LedgerState, f: LineFilter = {}) {
  const m = new Map<string, number>()
  for (const l of ledgerLines(s, f)) m.set(l.accountCode, (m.get(l.accountCode) ?? 0) + l.debit - l.credit)
  return m
}

/** Balance in the account's natural direction (positive = normal). */
export function naturalBalance(acc: Account, dr: number) {
  return r2(acc.normal === "debit" ? dr : -dr)
}

export function accountBalance(s: LedgerState, code: string, asOf = TODAY) {
  const acc = s.accounts.find((a) => a.code === code)!
  return naturalBalance(acc, movements(s, { to: asOf }).get(code) ?? 0)
}

export function journalTotal(j: Journal) {
  return r2(j.lines.reduce((t, l) => t + l.debit, 0))
}

/** The amount shown for a journal in lists: the source document's total when there is one. */
export function journalAmount(s: LedgerState, j: Journal) {
  if (j.sourceDocId) {
    const doc = s.invoices.find((d) => d.id === j.sourceDocId) ?? s.bills.find((d) => d.id === j.sourceDocId)
    if (doc) return r2(doc.total * doc.rate)
    const pay = s.payments.find((p) => p.id === j.sourceDocId)
    if (pay) return r2(pay.amount * pay.rate)
  }
  return journalTotal(j)
}

/* ---------------- documents ---------------- */

export type DocRow<T extends Invoice | Bill> = Omit<T, "status"> & {
  /** Stored document status (draft, posted…). `status` is the derived one people see. */
  docStatus: T["status"]
  contact: Contact
  paid: number
  balance: number
  status: Status
  daysOverdue: number
  daysToDue: number
  baseTotal: number
  baseBalance: number
}

function docRow<T extends Invoice | Bill>(s: LedgerState, d: T): DocRow<T> {
  const paid = r2(s.payments.filter((p) => p.docId === d.id).reduce((t, p) => t + p.amount, 0))
  const balance = d.status === "posted" ? r2(d.total - paid) : d.status === "void" ? 0 : d.total
  const daysToDue = daysBetween(TODAY, d.dueDate)
  let status: Status
  if (d.status === "draft") status = "draft"
  else if (d.status === "awaiting_approval") status = "awaiting_approval"
  else if (d.status === "void") status = "void"
  else if (balance <= 0.005) status = "paid"
  else if (daysToDue < 0) status = "overdue"
  else if (paid > 0) status = "part_paid"
  else status = "unpaid"
  return {
    ...d,
    docStatus: d.status,
    contact:
      s.contacts.find((c) => c.id === d.contactId) ??
      // A draft saved before a customer was chosen.
      ({ id: "", kind: "customer", name: ("to" in d && d.to?.name) || "No customer yet", email: "", phone: "", city: "", tin: "", termsDays: 14, currency: d.currency } as Contact),
    paid,
    balance,
    status,
    daysOverdue: status === "overdue" ? -daysToDue : 0,
    daysToDue,
    baseTotal: r2(d.total * d.rate),
    baseBalance: r2(balance * d.rate),
  }
}

export const invoiceRows = (s: LedgerState) => s.invoices.map((i) => docRow(s, i)).sort((a, b) => b.id.localeCompare(a.id))
export const billRows = (s: LedgerState) => s.bills.map((b) => docRow(s, b)).sort((a, b) => b.id.localeCompare(a.id))

type Ageable = { status: Status; daysToDue: number }
const isOpenDoc = (r: Ageable) => r.status === "unpaid" || r.status === "part_paid" || r.status === "overdue"
/** Due within the next 7 days and not yet overdue. */
const isDueSoon = (r: Ageable) => isOpenDoc(r) && r.status !== "overdue" && r.daysToDue >= 0 && r.daysToDue <= 7

export function docSummary<T extends Invoice | Bill>(s: LedgerState, rows: DocRow<T>[]) {
  const open = rows.filter(isOpenDoc)
  const overdue = rows.filter((r) => r.status === "overdue")
  const dueSoon = rows.filter(isDueSoon)
  const monthStart = TODAY.slice(0, 8) + "01"
  const ids = new Set(rows.map((r) => r.id))
  const settledThisMonth = s.payments.filter((p) => p.docId && ids.has(p.docId) && p.date >= monthStart && p.date <= TODAY)
  const sum = (xs: DocRow<T>[]) => r2(xs.reduce((t, r) => t + r.baseBalance, 0))
  return {
    outstanding: { amount: sum(open), count: open.length },
    overdue: { amount: sum(overdue), count: overdue.length },
    dueSoon: { amount: sum(dueSoon), count: dueSoon.length },
    settledThisMonth: { amount: r2(settledThisMonth.reduce((t, p) => t + p.amount * p.rate, 0)), count: settledThisMonth.length },
    filters: { open: isOpenDoc, dueSoon: isDueSoon },
  }
}

export function ageing<T extends Invoice | Bill>(rows: DocRow<T>[]) {
  const buckets = [
    { id: "current", label: "Current", amount: 0, count: 0 },
    { id: "1-30", label: "1–30 days", amount: 0, count: 0 },
    { id: "31-60", label: "31–60 days", amount: 0, count: 0 },
    { id: "61-90", label: "61–90 days", amount: 0, count: 0 },
    { id: "90+", label: "90+ days", amount: 0, count: 0 },
  ]
  for (const r of rows.filter(isOpenDoc)) {
    const d = r.daysOverdue
    const b = d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4
    buckets[b].amount = r2(buckets[b].amount + r.baseBalance)
    buckets[b].count++
  }
  return buckets
}

/** Ageing per contact, for the Who owes you / What you owe reports. */
export function ageingByContact<T extends Invoice | Bill>(rows: DocRow<T>[]) {
  const map = new Map<string, { contact: Contact; buckets: number[]; total: number }>()
  for (const r of rows.filter(isOpenDoc)) {
    const e = map.get(r.contactId) ?? { contact: r.contact, buckets: [0, 0, 0, 0, 0], total: 0 }
    const d = r.daysOverdue
    const b = d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4
    e.buckets[b] = r2(e.buckets[b] + r.baseBalance)
    e.total = r2(e.total + r.baseBalance)
    map.set(r.contactId, e)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

/* ---------------- banking ---------------- */

export function bankAccounts(s: LedgerState) {
  return s.accounts.filter((a) => a.bank)
}

export function bankSummary(s: LedgerState, code: string) {
  const book = accountBalance(s, code)
  const lines = s.bankLines.filter((b) => b.accountCode === code)
  const open = lines.filter((b) => b.status === "open")
  const unmatched = r2(open.reduce((t, b) => t + b.amount, 0))
  return {
    book,
    bankSays: r2(book + unmatched),
    difference: unmatched,
    openCount: open.length,
    matchedCount: lines.filter((b) => b.status !== "open").length,
    totalCount: lines.length,
  }
}

/* ---------------- performance ---------------- */

export const MONTHS_2026 = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]

export function profitByMonth(s: LedgerState) {
  const byType = new Map(s.accounts.map((a) => [a.code, a.type]))
  const rows = MONTHS_2026.map((m) => ({ month: m, revenue: 0, expenses: 0, profit: 0 }))
  for (const l of ledgerLines(s)) {
    const t = byType.get(l.accountCode)
    if (l.journal.source === "opening") continue
    const row = rows.find((r) => r.month === monthKey(l.journal.date))
    if (!row) continue
    if (t === "income") row.revenue += l.credit - l.debit
    if (t === "expense" || t === "cost_of_sales") row.expenses += l.debit - l.credit
  }
  return rows.map((r) => ({ ...r, revenue: r2(r.revenue), expenses: r2(r.expenses), profit: r2(r.revenue - r.expenses) }))
}

export function cashByMonth(s: LedgerState) {
  const cash = new Set(bankAccounts(s).map((a) => a.code))
  return MONTHS_2026.map((m) => {
    const to = m === monthKey(TODAY) ? TODAY : endOfMonth(m)
    const mv = movements(s, { to })
    let total = 0
    for (const c of cash) total += mv.get(c) ?? 0
    return { month: m, cash: r2(total) }
  })
}

export function cashTotal(s: LedgerState, asOf = TODAY) {
  const mv = movements(s, { to: asOf })
  return r2(bankAccounts(s).reduce((t, a) => t + (mv.get(a.code) ?? 0), 0))
}

export function netProfit(s: LedgerState, from: string, to: string) {
  const mv = movements(s, { from, to })
  let p = 0
  for (const a of s.accounts) {
    const v = mv.get(a.code) ?? 0
    if (a.type === "income") p -= v
    if (a.type === "expense" || a.type === "cost_of_sales") p -= v
  }
  return r2(p)
}

/** Profit & loss grouped by type → category → account. */
export function profitAndLoss(s: LedgerState, f: LineFilter) {
  const mv = movements(s, { ...f, pnl: true })
  const section = (types: Account["type"][], sign: 1 | -1) =>
    s.accounts
      .filter((a) => types.includes(a.type))
      .map((a) => ({ account: a, amount: r2(sign * (mv.get(a.code) ?? 0)) }))
  const income = section(["income"], -1)
  const cos = section(["cost_of_sales"], 1)
  const expenses = section(["expense"], 1)
  const sum = (xs: { amount: number }[]) => r2(xs.reduce((t, x) => t + x.amount, 0))
  const grossProfit = r2(sum(income.filter((x) => x.account.category === "Sales")) - sum(cos))
  return {
    sales: income.filter((x) => x.account.category === "Sales"),
    otherIncome: income.filter((x) => x.account.category !== "Sales"),
    cos,
    expenses,
    totals: {
      sales: sum(income.filter((x) => x.account.category === "Sales")),
      otherIncome: sum(income.filter((x) => x.account.category !== "Sales")),
      cos: sum(cos),
      grossProfit,
      expenses: sum(expenses),
      netProfit: r2(sum(income) - sum(cos) - sum(expenses)),
    },
  }
}

export function balanceSheet(s: LedgerState, asOf: string, branch?: string) {
  const mv = movements(s, { to: asOf, branch })
  const yearStart = asOf.slice(0, 4) + "-01-01"
  const profit = profitAndLoss(s, { from: yearStart, to: asOf, branch }).totals.netProfit
  const rows = (type: Account["type"]) =>
    s.accounts.filter((a) => a.type === type).map((a) => ({ account: a, amount: type === "asset" ? r2(mv.get(a.code) ?? 0) : r2(-(mv.get(a.code) ?? 0)) }))
  const assets = rows("asset")
  const liabilities = rows("liability")
  const equity = rows("equity")
  const sum = (xs: { amount: number }[]) => r2(xs.reduce((t, x) => t + x.amount, 0))
  return {
    assets,
    liabilities,
    equity,
    currentYearProfit: profit,
    totals: {
      assets: sum(assets),
      liabilities: sum(liabilities),
      equity: r2(sum(equity) + profit),
    },
  }
}

/** Direct-method cash flow: each cash movement classed by what was on the other side. */
export function cashFlow(s: LedgerState, f: LineFilter) {
  const cash = new Set(bankAccounts(s).map((a) => a.code))
  const accType = new Map(s.accounts.map((a) => [a.code, a]))
  const groups = new Map<string, { section: "Operating" | "Investing" | "Financing"; label: string; amount: number; journals: Set<string> }>()
  const classify = (code: string): [section: "Operating" | "Investing" | "Financing", label: string] => {
    const a = accType.get(code)
    if (!a) return ["Operating", "Other"]
    if (code === "1100") return ["Operating", "Money in from customers"]
    if (code === "2000") return ["Operating", "Money out to suppliers"]
    if (a.category === "Sales") return ["Operating", "Shop and mobile money sales"]
    if (a.category === "Staff costs" || a.category === "Payroll liabilities") return ["Operating", "Staff pay and pensions"]
    if (a.category === "Tax liabilities" || a.category === "Tax assets") return ["Operating", "Taxes paid and collected"]
    if (code === "6300") return ["Operating", "Loan interest paid"]
    if (a.type === "income") return ["Operating", "Other income received"]
    if (a.type === "expense" || a.type === "cost_of_sales") return ["Operating", "Running costs paid directly"]
    if (a.category === "Fixed assets") return ["Investing", "Equipment and vehicles bought"]
    if (code === "2300") return ["Financing", "Loan repayments"]
    if (a.type === "equity") return ["Financing", "Owners' money"]
    return ["Operating", "Other"]
  }
  for (const j of s.journals) {
    if (!inLedger(j) || j.source === "opening") continue
    if (f.from && j.date < f.from) continue
    if (f.to && j.date > f.to) continue
    if (f.branch && f.branch !== "all" && j.branch !== f.branch) continue
    const cashNet = j.lines.filter((l) => cash.has(l.accountCode)).reduce((t, l) => t + l.debit - l.credit, 0)
    if (Math.abs(cashNet) < 0.005) continue // transfers between your own accounts
    const others = j.lines.filter((l) => !cash.has(l.accountCode))
    const otherTotal = others.reduce((t, l) => t + Math.abs(l.debit - l.credit), 0) || 1
    for (const o of others) {
      const share = (Math.abs(o.debit - o.credit) / otherTotal) * cashNet
      const [section, label] = classify(o.accountCode)
      const key = section + label
      const g = groups.get(key) ?? { section, label, amount: 0, journals: new Set<string>() }
      g.amount += share
      g.journals.add(j.id)
      groups.set(key, g)
    }
  }
  const lines = [...groups.values()].map((g) => ({ ...g, amount: r2(g.amount), journals: [...g.journals] }))
  const bySection = (sec: string) => lines.filter((l) => l.section === sec).sort((a, b) => b.amount - a.amount)
  const total = (xs: { amount: number }[]) => r2(xs.reduce((t, x) => t + x.amount, 0))
  const opening = f.from ? cashTotal(s, addDays(f.from, -1)) : 0
  const closing = cashTotal(s, f.to ?? TODAY)
  return {
    operating: bySection("Operating"),
    investing: bySection("Investing"),
    financing: bySection("Financing"),
    opening,
    closing,
    net: total(lines),
  }
}

export function trialBalance(s: LedgerState, asOf = TODAY) {
  const mv = movements(s, { to: asOf })
  return s.accounts
    .map((a) => {
      const v = r2(mv.get(a.code) ?? 0)
      return { account: a, debit: v > 0 ? v : 0, credit: v < 0 ? -v : 0 }
    })
    .filter((r) => r.debit || r.credit)
}

export function vatSummary(s: LedgerState, from: string, to: string) {
  const lines = ledgerLines(s, { from, to })
  const sum = (code: string, side: "debit" | "credit") => r2(lines.filter((l) => l.accountCode === code).reduce((t, l) => t + l[side], 0))
  const output = r2(sum("2100", "credit") - sum("2100", "debit"))
  const input = r2(sum("1300", "debit") - sum("1300", "credit"))
  const wht = r2(sum("2110", "credit") - sum("2110", "debit"))
  const ssnit = r2(sum("2120", "credit"))
  const paye = r2(sum("2130", "credit"))
  return { output, input, vatDue: r2(output - input), wht, ssnit, paye }
}

/** Every posted line on one account, with a running balance. */
export function generalLedger(s: LedgerState, code: string, from: string, to: string) {
  const acc = s.accounts.find((a) => a.code === code)!
  const before = naturalBalance(acc, movements(s, { to: addDays(from, -1) }).get(code) ?? 0)
  let running = before
  const rows = ledgerLines(s, { from, to })
    .filter((l) => l.accountCode === code)
    .sort((a, b) => a.journal.date.localeCompare(b.journal.date) || a.journal.id.localeCompare(b.journal.id))
    .map((l) => {
      running = r2(running + (acc.normal === "debit" ? l.debit - l.credit : l.credit - l.debit))
      return { ...l, balance: running }
    })
  const moneyIn = r2(rows.reduce((t, r) => t + r.debit, 0))
  const moneyOut = r2(rows.reduce((t, r) => t + r.credit, 0))
  return { account: acc, before, rows, moneyIn, moneyOut, closing: running }
}

/** Journal lines behind a report figure, for drill-down drawers. */
export function linesFor(s: LedgerState, codes: string[], f: LineFilter) {
  const set = new Set(codes)
  return ledgerLines(s, f).filter((l) => set.has(l.accountCode))
}

/* ---------------- attention counts (badges, KPIs, tabs, to-do) ---------------- */

export function attention(s: LedgerState) {
  const inv = invoiceRows(s)
  const bills = billRows(s)
  return {
    invoicesOverdue: inv.filter((r) => r.status === "overdue").length,
    billsOverdue: bills.filter((r) => r.status === "overdue").length,
    billsDueSoon: bills.filter(isDueSoon).length,
    reconcileOpen: s.bankLines.filter((b) => b.status === "open").length,
    journalsAwaitingApproval: s.journals.filter((j) => j.status === "awaiting_approval").length,
    importsNeedAttention: s.imports.filter((i) => i.status === "needs_attention").length,
    staleConnections: s.connections.filter((c) => c.connected && c.health === "error"),
  }
}

export function useNavBadges(): Partial<Record<BadgeKey, number>> {
  const s = useLedger()
  return useMemo(() => {
    const a = attention(s)
    return {
      invoicesNeedAttention: a.invoicesOverdue,
      billsDueSoon: a.billsOverdue + a.billsDueSoon,
      reconcileOpen: a.reconcileOpen,
      journalsAwaitingApproval: a.journalsAwaitingApproval,
      importsNeedAttention: a.importsNeedAttention,
    }
  }, [s])
}

/** Recompute a selector only when the ledger changes. */
export function useSelect<T>(fn: (s: LedgerState) => T): T {
  const s = useLedger()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => fn(s), [s])
}

export function contactName(s: LedgerState, id?: string) {
  return s.contacts.find((c) => c.id === id)?.name ?? ""
}

export function accountName(s: LedgerState, code: string) {
  return s.accounts.find((a) => a.code === code)?.name ?? code
}
