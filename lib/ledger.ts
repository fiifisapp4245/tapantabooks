"use client"

import { create } from "zustand"
import * as seed from "./mock/seed"
import { invoiceJournalLines, r2, RATES } from "./mock/seed"
import { TODAY } from "./dates"
import type { Currency, UserId } from "./constants"
import type {
  Account,
  AuditEvent,
  BankLine,
  Bill,
  BranchId,
  Company,
  Contact,
  DocLine,
  Invoice,
  Journal,
  JournalLine,
  Party,
  Payment,
  PayoutMethod,
  Period,
  TaxCode,
} from "./types"
import { TAX_RATES } from "./types"

/**
 * The in-memory books. Seeded once from /lib/mock/seed.ts; anything created
 * in the prototype lands here and shows up in its list until refresh.
 */
export type LedgerState = {
  accounts: Account[]
  contacts: Contact[]
  companies: Company[]
  invoices: Invoice[]
  bills: Bill[]
  payments: Payment[]
  payoutMethods: PayoutMethod[]
  creditNotes: typeof seed.CREDIT_NOTES
  journals: Journal[]
  bankLines: BankLine[]
  connections: typeof seed.CONNECTIONS
  imports: typeof seed.IMPORTS
  periods: Period[]
  audit: AuditEvent[]
  settings: { approvalThreshold: number; periodLockDate: string; orgName: string; baseCurrency: Currency }
}

type Actions = {
  saveInvoice: (input: InvoiceInput, mode: "draft" | "post", userId: UserId) => Invoice
  /** Create or update a draft from the step-by-step editor. Returns the invoice id. */
  saveDraftInvoice: (input: DraftInvoiceInput, userId: UserId) => string
  /** Turn a draft into a posted invoice with its journal. */
  postInvoice: (id: string, userId: UserId) => Invoice
  addPayoutMethod: (m: PayoutMethod) => void
  recordInvoicePayment: (invoiceId: string, input: { amount: number; date: string; accountCode: string }, userId: UserId) => Payment
  sendReminder: (invoiceId: string, userId: UserId) => void
  recordMoney: (input: MoneyInput, userId: UserId) => Payment
  saveJournal: (input: JournalInput, mode: "draft" | "post", userId: UserId) => Journal
  approveJournal: (id: string, userId: UserId) => void
  reverseJournal: (id: string, userId: UserId) => void
  acceptBankLine: (lineId: string, userId: UserId) => void
  excludeBankLine: (lineId: string, userId: UserId) => void
  addContact: (c: Omit<Contact, "id">) => Contact
  addCompany: (c: Omit<Company, "id" | "short">) => Company
  addAccount: (a: Account) => void
  setPeriodStatus: (month: string, status: Period["status"], userId: UserId, reason?: string) => void
  updateSettings: (s: Partial<LedgerState["settings"]>, userId: UserId) => void
}

export type InvoiceInput = {
  contactId: string
  issueDate: string
  dueDate: string
  currency: Currency
  branch: BranchId
  reference?: string
  lines: DocLine[]
}

export type DraftInvoiceInput = InvoiceInput & {
  /** The draft being edited; omit to create one. */
  id?: string
  /** Invoice number chosen in the editor. */
  number: string
  from: Party
  to: Party
  note?: string
  discountAmount: number
  payoutMethodIds: string[]
}

export type MoneyInput = {
  direction: "in" | "out"
  amount: number
  date: string
  accountCode: string
  categoryCode: string
  contactId?: string
  taxCode: TaxCode
  branch: BranchId
  memo: string
  bankLineId?: string
}

export type JournalInput = {
  date: string
  reference?: string
  memo: string
  branch: BranchId
  lines: JournalLine[]
}

const nextId = (prefix: string, ids: string[], width = 4) => {
  const max = ids.reduce((m, id) => Math.max(m, Number(id.replace(/\D/g, "").slice(-width)) || 0), 0)
  return `${prefix}${String(max + 1).padStart(width, "0")}`
}
const nextJournalId = (js: Journal[]) => nextId("JE-2026-", js.map((j) => j.id))

function totals(lines: DocLine[]) {
  let subtotal = 0
  let tax = 0
  for (const l of lines) {
    const net = r2(l.qty * l.unitPrice * (1 - l.discount))
    subtotal += net
    tax += r2(net * TAX_RATES[l.taxCode])
  }
  return { subtotal: r2(subtotal), tax: r2(tax), total: r2(subtotal + tax) }
}

const nowStamp = () => `${TODAY}T${new Date().toTimeString().slice(0, 5)}`

export const useLedger = create<LedgerState & Actions>((set, get) => {
  const log = (userId: string, action: string, code: string, entity: string, summary: string) =>
    set((s) => ({ audit: [{ id: nextId("AU-", s.audit.map((a) => a.id), 5), at: nowStamp(), userId, action, code, entity, summary }, ...s.audit] }))

  return {
    accounts: seed.ACCOUNTS,
    contacts: seed.CONTACTS,
    companies: seed.COMPANIES,
    invoices: seed.INVOICES,
    bills: seed.BILLS,
    payments: seed.PAYMENTS,
    payoutMethods: seed.PAYOUT_METHODS,
    creditNotes: seed.CREDIT_NOTES,
    journals: seed.JOURNALS,
    bankLines: seed.BANK_LINES,
    connections: seed.CONNECTIONS,
    imports: seed.IMPORTS,
    periods: seed.PERIODS,
    audit: seed.AUDIT,
    settings: { approvalThreshold: seed.APPROVAL_THRESHOLD, periodLockDate: seed.PERIOD_LOCK_DATE, orgName: "Kumasi Traders Ltd", baseCurrency: "GHS" },

    saveInvoice: (input, mode, userId) => {
      const s = get()
      const id = nextId("INV-", s.invoices.map((i) => i.id))
      const rate = RATES[input.currency]
      const inv: Invoice = {
        kind: "invoice",
        id,
        ...input,
        rate,
        status: mode === "draft" ? "draft" : "posted",
        ...totals(input.lines),
        createdBy: userId,
        deliveryRoute: s.contacts.find((c) => c.id === input.contactId)?.overseas ? "Export (overseas)" : "Local",
      }
      let journals = s.journals
      if (mode === "post") {
        const name = s.contacts.find((c) => c.id === input.contactId)?.name
        const j: Journal = {
          id: nextJournalId(s.journals),
          date: input.issueDate,
          memo: `Invoice ${id} – ${name}`,
          reference: id,
          source: "sales",
          sourceDocId: id,
          status: "posted",
          branch: input.branch,
          lines: invoiceJournalLines(inv),
          createdBy: userId,
          createdAt: TODAY,
          approvedBy: userId,
        }
        inv.journalId = j.id
        journals = [...journals, j]
      }
      set({ invoices: [...s.invoices, inv], journals })
      log(userId, mode === "draft" ? `Saved draft invoice ${id}` : `Approved and posted invoice ${id}`, mode === "draft" ? "invoice.draft" : "invoice.post", id, `${inv.currency} ${inv.total.toFixed(2)}`)
      return inv
    },

    saveDraftInvoice: (input, userId) => {
      const s = get()
      const { id: existingId, number, ...rest } = input
      const existing = existingId ? s.invoices.find((i) => i.id === existingId) : undefined
      const free = (n: string) => !!n && !s.invoices.some((i) => i.id === n)
      // A renamed draft keeps its record but takes the new number, if it's free.
      const id = existing ? (number !== existing.id && free(number) ? number : existing.id) : free(number) ? number : nextId("INV-", s.invoices.map((i) => i.id))
      const inv: Invoice = {
        kind: "invoice",
        ...rest,
        id,
        rate: RATES[input.currency],
        status: "draft",
        ...totals(input.lines),
        createdBy: existing?.createdBy ?? userId,
        deliveryRoute: s.contacts.find((c) => c.id === input.contactId)?.overseas ? "Export (overseas)" : "Local",
      }
      set({ invoices: existing ? s.invoices.map((i) => (i.id === existing.id ? inv : i)) : [...s.invoices, inv] })
      if (!existing) log(userId, `Saved draft invoice ${id}`, "invoice.draft", id, inv.to?.name ?? "")
      return id
    },

    postInvoice: (id, userId) => {
      const s = get()
      const inv = s.invoices.find((i) => i.id === id)!
      const name = inv.to?.name ?? s.contacts.find((c) => c.id === inv.contactId)?.name
      const j: Journal = {
        id: nextJournalId(s.journals),
        date: inv.issueDate,
        memo: `Invoice ${id} – ${name}`,
        reference: id,
        source: "sales",
        sourceDocId: id,
        status: "posted",
        branch: inv.branch,
        lines: invoiceJournalLines(inv),
        createdBy: userId,
        createdAt: TODAY,
        approvedBy: userId,
      }
      const posted: Invoice = { ...inv, status: "posted", journalId: j.id }
      set({ invoices: s.invoices.map((i) => (i.id === id ? posted : i)), journals: [...s.journals, j] })
      log(userId, `Created invoice ${id}`, "invoice.post", id, `${inv.currency} ${inv.total.toFixed(2)}`)
      return posted
    },

    addPayoutMethod: (m) => set((s) => ({ payoutMethods: [...s.payoutMethods, m] })),

    recordInvoicePayment: (invoiceId, { amount, date, accountCode }, userId) => {
      const s = get()
      const inv = s.invoices.find((i) => i.id === invoiceId)!
      const id = nextId("RCPT-", s.payments.filter((p) => p.direction === "in").map((p) => p.id))
      const base = r2(amount * inv.rate)
      const name = s.contacts.find((c) => c.id === inv.contactId)?.name
      const j: Journal = {
        id: nextJournalId(s.journals),
        date,
        memo: `Payment from ${name} for ${inv.id}`,
        reference: id,
        source: "sales",
        sourceDocId: id,
        status: "posted",
        branch: inv.branch,
        lines: [
          { accountCode, debit: base, credit: 0 },
          { accountCode: "1100", description: inv.id, debit: 0, credit: base },
        ],
        createdBy: userId,
        createdAt: TODAY,
      }
      const p: Payment = { id, direction: "in", date, contactId: inv.contactId, docId: inv.id, accountCode, amount, currency: inv.currency, rate: inv.rate, method: accountCode === "1030" ? "MTN MoMo" : "Bank transfer", branch: inv.branch, memo: `Payment for ${inv.id}`, journalId: j.id }
      set({ payments: [...s.payments, p], journals: [...s.journals, j] })
      log(userId, `Recorded payment ${id} on ${inv.id}`, "payment.record", id, `${inv.currency} ${amount.toFixed(2)}`)
      return p
    },

    sendReminder: (invoiceId, userId) => {
      set((s) => ({ invoices: s.invoices.map((i) => (i.id === invoiceId ? { ...i, remindersSent: [...(i.remindersSent ?? []), TODAY] } : i)) }))
      log(userId, `Sent reminder for ${invoiceId}`, "invoice.remind", invoiceId, "Payment reminder emailed to the customer.")
    },

    recordMoney: (input, userId) => {
      const s = get()
      const prefix = input.direction === "in" ? "RCPT-" : "PAY-"
      const id = nextId(prefix, s.payments.filter((p) => p.direction === input.direction).map((p) => p.id))
      const net = TAX_RATES[input.taxCode] ? r2(input.amount / (1 + TAX_RATES[input.taxCode])) : input.amount
      const tax = r2(input.amount - net)
      const lines: JournalLine[] =
        input.direction === "in"
          ? [
              { accountCode: input.accountCode, debit: input.amount, credit: 0 },
              { accountCode: input.categoryCode, description: input.memo, debit: 0, credit: net },
              ...(tax ? [{ accountCode: "2100", description: "VAT", debit: 0, credit: tax }] : []),
            ]
          : [
              { accountCode: input.categoryCode, description: input.memo, debit: net, credit: 0 },
              ...(tax ? [{ accountCode: "1300", description: "VAT", debit: tax, credit: 0 }] : []),
              { accountCode: input.accountCode, debit: 0, credit: input.amount },
            ]
      const j: Journal = {
        id: nextJournalId(s.journals),
        date: input.date,
        memo: input.memo || (input.direction === "in" ? "Money in" : "Money out"),
        reference: id,
        source: "banking",
        sourceDocId: id,
        status: "posted",
        branch: input.branch,
        lines,
        createdBy: userId,
        createdAt: TODAY,
      }
      const p: Payment = { id, direction: input.direction, date: input.date, contactId: input.contactId, accountCode: input.accountCode, categoryCode: input.categoryCode, amount: input.amount, currency: "GHS", rate: 1, method: input.accountCode === "1030" ? "MTN MoMo" : input.accountCode === "1000" ? "Cash" : "Bank transfer", branch: input.branch, memo: input.memo, journalId: j.id }
      set({
        payments: [...s.payments, p],
        journals: [...s.journals, j],
        bankLines: input.bankLineId ? s.bankLines.map((b) => (b.id === input.bankLineId ? { ...b, status: "matched", matchedJournalId: j.id } : b)) : s.bankLines,
      })
      log(userId, `Recorded money ${input.direction} ${id}`, "money.record", id, input.memo)
      return p
    },

    saveJournal: (input, mode, userId) => {
      const s = get()
      const total = input.lines.reduce((t, l) => t + l.debit, 0)
      const status: Journal["status"] = mode === "draft" ? "draft" : total > s.settings.approvalThreshold ? "awaiting_approval" : "posted"
      const j: Journal = { id: nextJournalId(s.journals), ...input, source: "manual", status, createdBy: userId, createdAt: TODAY }
      set({ journals: [...s.journals, j] })
      log(userId, `${status === "posted" ? "Posted" : status === "draft" ? "Saved draft" : "Submitted for approval"} journal ${j.id}`, `journal.${status === "posted" ? "post" : status === "draft" ? "draft" : "submit"}`, j.id, j.memo)
      return j
    },

    approveJournal: (id, userId) => {
      set((s) => ({ journals: s.journals.map((j) => (j.id === id ? { ...j, status: "posted", approvedBy: userId } : j)) }))
      log(userId, `Approved and posted journal ${id}`, "journal.approve", id, "Second approval given.")
    },

    reverseJournal: (id, userId) => {
      const s = get()
      const orig = s.journals.find((j) => j.id === id)!
      const rev: Journal = {
        ...orig,
        id: nextJournalId(s.journals),
        date: TODAY,
        memo: `Reversal: ${orig.memo}`,
        status: "posted",
        reverses: id,
        reversedBy: undefined,
        createdBy: userId,
        createdAt: TODAY,
        lines: orig.lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit })),
      }
      set({ journals: [...s.journals.map((j) => (j.id === id ? { ...j, status: "reversed" as const, reversedBy: rev.id } : j)), rev] })
      log(userId, `Reversed journal ${id}`, "journal.reverse", id, `Reversed by ${rev.id}`)
    },

    acceptBankLine: (lineId, userId) => {
      const s = get()
      const line = s.bankLines.find((b) => b.id === lineId)!
      const sug = line.suggestion
      if (sug?.docId?.startsWith("INV-")) {
        const p = get().recordInvoicePayment(sug.docId, { amount: Math.abs(line.amount), date: line.date, accountCode: line.accountCode }, userId)
        set((st) => ({ bankLines: st.bankLines.map((b) => (b.id === lineId ? { ...b, status: "matched", matchedJournalId: p.journalId } : b)) }))
        return
      }
      if (sug?.docId?.startsWith("BILL-")) {
        const bill = s.bills.find((b) => b.id === sug.docId)!
        const id = nextId("PAY-", s.payments.filter((p) => p.direction === "out").map((p) => p.id))
        const j: Journal = {
          id: nextJournalId(s.journals),
          date: line.date,
          memo: `Payment to ${s.contacts.find((c) => c.id === bill.contactId)?.name} for ${bill.id}`,
          reference: id,
          source: "purchases",
          sourceDocId: id,
          status: "posted",
          branch: bill.branch,
          lines: [
            { accountCode: "2000", description: bill.id, debit: Math.abs(line.amount), credit: 0 },
            { accountCode: line.accountCode, debit: 0, credit: Math.abs(line.amount) },
          ],
          createdBy: userId,
          createdAt: TODAY,
        }
        const p: Payment = { id, direction: "out", date: line.date, contactId: bill.contactId, docId: bill.id, accountCode: line.accountCode, amount: Math.abs(line.amount), currency: "GHS", rate: 1, method: "Cheque", branch: bill.branch, memo: `Payment for ${bill.id}`, journalId: j.id }
        set({ payments: [...s.payments, p], journals: [...s.journals, j], bankLines: s.bankLines.map((b) => (b.id === lineId ? { ...b, status: "matched", matchedJournalId: j.id } : b)) })
        log(userId, `Matched bank line to ${bill.id}`, "bank.match", lineId, line.description)
        return
      }
      // Category suggestions become a simple money in / out.
      const category = s.accounts.find((a) => a.name === sug?.label) ?? s.accounts.find((a) => a.code === (line.amount < 0 ? "6160" : "9999"))!
      const transfer = sug?.label.startsWith("Transfer from")
      get().recordMoney(
        {
          direction: line.amount >= 0 ? "in" : "out",
          amount: Math.abs(line.amount),
          date: line.date,
          accountCode: line.accountCode,
          categoryCode: transfer ? "1000" : sug?.label.startsWith("POS") ? "4000" : category.code,
          taxCode: sug?.label.startsWith("POS") ? "GH-STD" : "EXEMPT",
          branch: "adum",
          memo: line.description,
          bankLineId: lineId,
        },
        userId
      )
    },

    excludeBankLine: (lineId, userId) => {
      set((s) => ({ bankLines: s.bankLines.map((b) => (b.id === lineId ? { ...b, status: "excluded" } : b)) }))
      log(userId, `Excluded bank line ${lineId}`, "bank.exclude", lineId, "Left out of this reconciliation.")
    },

    addContact: (c) => {
      const contact = { ...c, id: `${c.kind === "customer" ? "cus" : "sup"}-${Date.now().toString(36)}` }
      set((s) => ({ contacts: [...s.contacts, contact] }))
      return contact
    },

    addCompany: (c) => {
      const short = c.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "CO"
      const company: Company = { ...c, short, id: `co-${Date.now().toString(36)}` }
      set((s) => ({ companies: [...s.companies, company] }))
      return company
    },

    addAccount: (a) => set((s) => ({ accounts: [...s.accounts, a].sort((x, y) => x.code.localeCompare(y.code)) })),

    setPeriodStatus: (month, status, userId, reason) => {
      set((s) => ({ periods: s.periods.map((p) => (p.month === month ? { ...p, status } : p)) }))
      log(userId, `${status === "open" ? "Reopened" : status === "locked" ? "Locked" : "Closed"} period ${month}`, `period.${status}`, month, reason ?? "")
    },

    updateSettings: (patch, userId) => {
      set((s) => ({ settings: { ...s.settings, ...patch } }))
      log(userId, "Changed settings", "settings.update", "settings", Object.keys(patch).join(", "))
    },
  }
})
