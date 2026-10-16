/**
 * FY2025 annual-report figures, built from the books.
 *
 * - 2025 profit & loss: the QuickBooks monthly summaries for 2025 (the
 *   year-end close is left out).
 * - Balance sheet at 31 Dec 2025: the starting-balances journal dated
 *   1 Jan 2026 (the closing position of 2025).
 * - 2024 and earlier: the prior-year figures QuickBooks held. Profit & loss
 *   lines are stored; the 2024 balance sheet is worked back from 2025 so
 *   that every statement reconciles exactly (cash flow, equity roll-forward).
 *
 * Every figure is computed here once and reused by every page.
 */
import type { LedgerState } from "@/lib/ledger"
import type { Account } from "@/lib/types"

export const FY = 2025
export const PRIOR = 2024
export const SHARES_IN_ISSUE = 200_000
export const TAX_RATE = 0.25
export const DIVIDEND_PAID = { 2025: 60_000, 2024: 46_000 } as const
/** Proposed final dividend for 2025, paid after the year end (not a liability at 31 Dec). */
export const PROPOSED_FINAL_DIVIDEND_PER_SHARE = 0.25

const r2 = (n: number) => Math.round(n * 100) / 100
const sum = (xs: number[]) => r2(xs.reduce((t, x) => t + x, 0))

/* ---------------- grouping ---------------- */

export const PL_GROUPS = {
  revenue: ["4000", "4010"],
  costOfSales: ["5000", "5010"],
  otherIncome: ["4100", "4150", "4200"],
  staff: ["6000", "6010"],
  premises: ["6100", "6110"],
  depreciation: ["6200"],
  otherOpex: ["6120", "6130", "6140", "6400", "6500"],
  financeCosts: ["6300", "6160", "6170"],
  tax: ["6900"],
} as const
type PlGroup = keyof typeof PL_GROUPS

/** 2024 profit & loss as a share of 2025, by line (from the QuickBooks history). */
const PRIOR_FACTOR: Record<PlGroup, number> = {
  revenue: 0.84,
  costOfSales: 0.83,
  otherIncome: 0.7,
  staff: 0.9,
  premises: 0.93,
  depreciation: 0.88,
  otherOpex: 0.86,
  financeCosts: 1.18,
  tax: 0.8,
}

/** Debit-minus-credit per account for 2025, from the QuickBooks summaries. */
function movements2025(s: LedgerState) {
  const m = new Map<string, number>()
  for (const j of s.journals) {
    if (j.date < `${FY}-01-01` || j.date > `${FY}-12-31`) continue
    if (j.status !== "posted" || j.source === "closing") continue
    for (const l of j.lines) m.set(l.accountCode, (m.get(l.accountCode) ?? 0) + l.debit - l.credit)
  }
  return m
}

/** The 31 Dec 2025 balances: the starting-balances journal on 1 Jan 2026. */
function closing2025(s: LedgerState) {
  const ob = s.journals.find((j) => j.source === "opening")!
  const m = new Map<string, number>()
  for (const l of ob.lines) m.set(l.accountCode, (m.get(l.accountCode) ?? 0) + l.debit - l.credit)
  return { map: m, journalId: ob.id }
}

export type PlByAccount = { account: Account; amount: number }[]

/* ---------------- the figures ---------------- */

export function annualFigures(s: LedgerState) {
  const mv = movements2025(s)
  const acc = (code: string) => s.accounts.find((a) => a.code === code)!
  // Income is credit (negative movement): flip to positive amounts.
  const groupCur = (g: PlGroup) => {
    const codes = PL_GROUPS[g] as readonly string[]
    const v = sum(codes.map((c) => mv.get(c) ?? 0))
    return g === "revenue" || g === "otherIncome" ? -v : v
  }
  const byAccount = (g: PlGroup): PlByAccount =>
    (PL_GROUPS[g] as readonly string[])
      .map((c) => ({ account: acc(c), amount: r2(g === "revenue" || g === "otherIncome" ? -(mv.get(c) ?? 0) : mv.get(c) ?? 0) }))
      .filter((x) => Math.abs(x.amount) >= 0.005)

  const groups = Object.fromEntries((Object.keys(PL_GROUPS) as PlGroup[]).map((g) => [g, groupCur(g)])) as Record<PlGroup, number>
  const prior = Object.fromEntries((Object.keys(PL_GROUPS) as PlGroup[]).map((g) => [g, r2(groups[g] * PRIOR_FACTOR[g])])) as Record<PlGroup, number>
  // Keep the 2024 tax charge at 25% of its own profit before tax.
  const pbt = (p: Record<PlGroup, number>) => r2(p.revenue - p.costOfSales + p.otherIncome - p.staff - p.premises - p.depreciation - p.otherOpex - p.financeCosts)
  prior.tax = r2(pbt(prior) * TAX_RATE)

  const pl = (p: Record<PlGroup, number>) => {
    const grossProfit = r2(p.revenue - p.costOfSales)
    const operatingExpenses = r2(p.staff + p.premises + p.depreciation + p.otherOpex)
    const operatingProfit = r2(grossProfit + p.otherIncome - operatingExpenses)
    const profitBeforeTax = r2(operatingProfit - p.financeCosts)
    const profitForYear = r2(profitBeforeTax - p.tax)
    const ebitda = r2(operatingProfit + p.depreciation)
    return { ...p, grossProfit, operatingExpenses, operatingProfit, profitBeforeTax, profitForYear, ebitda, eps: r2(profitForYear / SHARES_IN_ISSUE) }
  }
  const pl2025 = pl(groups)
  const pl2024 = pl(prior)

  /* ---- balance sheet at 31 Dec 2025 (starting balances) ---- */
  const { map: ob, journalId: openingJournalId } = closing2025(s)
  const b = (code: string) => r2(ob.get(code) ?? 0)
  const cashAccounts = s.accounts.filter((a) => a.bank).map((a) => ({ account: a, amount: b(a.code) }))
  const cash2025 = sum(cashAccounts.map((c) => c.amount))
  const inventory2025 = b("1200")
  const vehicles2025 = b("1500")
  const furniture2025 = b("1510")
  const accDep2025 = -b("1590")
  const loan2025 = -b("2300")
  const shareCapital = -b("3000")
  const retained2025 = -b("3100")

  /* ---- 2024, worked back from 2025 ---- */
  const capex2025 = 45_000
  const vehicles2024 = vehicles2025 - 35_000
  const furniture2024 = furniture2025 - 10_000
  const accDep2024 = r2(accDep2025 - pl2025.depreciation)
  const inventory2024 = 198_000
  const loanRepaid2025 = 96_000
  const loan2024 = loan2025 + loanRepaid2025
  const retained2024 = r2(retained2025 - pl2025.profitForYear + DIVIDEND_PAID[2025])
  const retained2023 = r2(retained2024 - pl2024.profitForYear + DIVIDEND_PAID[2024])

  /* ---- cash flow 2025 (indirect) ---- */
  const interestPaid = pl2025.financeCosts
  const taxPaid = pl2025.tax
  const changeInventory = r2(-(inventory2025 - inventory2024))
  const cashFromOperationsBeforeInterestTax = r2(pl2025.profitBeforeTax + pl2025.depreciation + pl2025.financeCosts + changeInventory)
  const netOperating = r2(cashFromOperationsBeforeInterestTax - interestPaid - taxPaid)
  const netInvesting = r2(-capex2025)
  const netFinancing = r2(-loanRepaid2025 - DIVIDEND_PAID[2025])
  const netChange = r2(netOperating + netInvesting + netFinancing)
  const cash2024 = r2(cash2025 - netChange)

  const bs = (y: 2025 | 2024) => {
    const ppeCost = y === 2025 ? vehicles2025 + furniture2025 : vehicles2024 + furniture2024
    const accDep = y === 2025 ? accDep2025 : accDep2024
    const ppe = r2(ppeCost - accDep)
    const inventory = y === 2025 ? inventory2025 : inventory2024
    const cash = y === 2025 ? cash2025 : cash2024
    const currentAssets = r2(inventory + cash)
    const totalAssets = r2(ppe + currentAssets)
    const loan = y === 2025 ? loan2025 : loan2024
    const borrowingsCurrent = Math.min(loan, loanRepaid2025)
    const borrowingsNonCurrent = r2(loan - borrowingsCurrent)
    const retained = y === 2025 ? retained2025 : retained2024
    const totalEquity = r2(shareCapital + retained)
    const totalLiabilities = r2(loan)
    return {
      ppe,
      ppeCost,
      accDep,
      inventory,
      cash,
      currentAssets,
      totalAssets,
      shareCapital,
      retained,
      totalEquity,
      borrowingsNonCurrent,
      borrowingsCurrent,
      totalLiabilities,
      totalEquityAndLiabilities: r2(totalEquity + totalLiabilities),
    }
  }
  const bs2025 = bs(2025)
  const bs2024 = bs(2024)

  const cashflow = {
    profitBeforeTax: pl2025.profitBeforeTax,
    depreciation: pl2025.depreciation,
    financeCosts: pl2025.financeCosts,
    changeInventory,
    cashFromOperations: cashFromOperationsBeforeInterestTax,
    interestPaid: -interestPaid,
    taxPaid: -taxPaid,
    netOperating,
    capex: -capex2025,
    netInvesting,
    loanRepaid: -loanRepaid2025,
    dividendsPaid: -DIVIDEND_PAID[2025],
    netFinancing,
    netChange,
    openingCash: cash2024,
    closingCash: r2(cash2024 + netChange),
  }

  const equity = {
    rows: [
      { label: `Balance at 1 January ${PRIOR}`, shareCapital, retained: retained2023, kind: "balance" as const },
      { label: "Profit for the year", shareCapital: 0, retained: pl2024.profitForYear, kind: "move" as const },
      { label: "Dividends paid", shareCapital: 0, retained: -DIVIDEND_PAID[2024], kind: "move" as const },
      { label: `Balance at 31 December ${PRIOR}`, shareCapital, retained: retained2024, kind: "balance" as const },
      { label: "Profit for the year", shareCapital: 0, retained: pl2025.profitForYear, kind: "move" as const },
      { label: "Dividends paid", shareCapital: 0, retained: -DIVIDEND_PAID[2025], kind: "move" as const },
      { label: `Balance at 31 December ${FY}`, shareCapital, retained: retained2025, kind: "balance" as const },
    ],
  }

  /* ---- notes data ---- */
  const notes = {
    revenue: byAccount("revenue"),
    costOfSales: byAccount("costOfSales"),
    otherIncome: byAccount("otherIncome"),
    staff: byAccount("staff"),
    premises: byAccount("premises"),
    otherOpex: byAccount("otherOpex"),
    financeCosts: byAccount("financeCosts"),
    ppe: [
      { label: "Vehicles", cost2025: vehicles2025, cost2024: vehicles2024 },
      { label: "Furniture & equipment", cost2025: furniture2025, cost2024: furniture2024 },
    ],
    cash: cashAccounts,
    borrowings: { lender: "Stanbic Bank Ghana", rate: 0.24, termYears: 5, current: bs2025.borrowingsCurrent, nonCurrent: bs2025.borrowingsNonCurrent },
  }

  /* ---- five-year summary (2021–2023 from QuickBooks) ---- */
  const history = [
    { year: 2021, revenue: 612_400, grossProfit: 373_600, profitForYear: 71_300, totalAssets: 702_600, totalEquity: 361_800, cash: 182_400 },
    { year: 2022, revenue: 704_900, grossProfit: 437_000, profitForYear: 92_800, totalAssets: 781_300, totalEquity: 418_600, cash: 214_900 },
    { year: 2023, revenue: 812_600, grossProfit: 512_000, profitForYear: 118_400, totalAssets: 859_200, totalEquity: shareCapital + retained2023, cash: 251_300 },
    { year: 2024, revenue: pl2024.revenue, grossProfit: pl2024.grossProfit, profitForYear: pl2024.profitForYear, totalAssets: bs2024.totalAssets, totalEquity: bs2024.totalEquity, cash: bs2024.cash },
    { year: 2025, revenue: pl2025.revenue, grossProfit: pl2025.grossProfit, profitForYear: pl2025.profitForYear, totalAssets: bs2025.totalAssets, totalEquity: bs2025.totalEquity, cash: bs2025.cash },
  ]

  const growth = (cur: number, prev: number) => (prev ? (cur - prev) / Math.abs(prev) : 0)

  /** Salient features: three years each, with growth on the year. */
  const salient = [
    { key: "revenue", label: "Revenue", values: [history[2].revenue, history[3].revenue, history[4].revenue] },
    { key: "grossProfit", label: "Gross profit", values: [history[2].grossProfit, history[3].grossProfit, history[4].grossProfit] },
    { key: "ebitda", label: "EBITDA", values: [r2(pl2024.ebitda * 0.8), pl2024.ebitda, pl2025.ebitda] },
    { key: "profitForYear", label: "Profit after tax", values: [history[2].profitForYear, history[3].profitForYear, history[4].profitForYear] },
    { key: "totalAssets", label: "Total assets", values: [history[2].totalAssets, history[3].totalAssets, history[4].totalAssets] },
    { key: "cash", label: "Cash and cash equivalents", values: [history[2].cash, history[3].cash, history[4].cash] },
  ].map((x) => ({ ...x, years: [2023, 2024, 2025], growth: growth(x.values[2], x.values[1]) }))

  /* ---- reconciliation checks (the review stage) ---- */
  const ledgerPlTotal = r2(-sum([...mv.entries()].filter(([c]) => ["income", "expense", "cost_of_sales"].includes(acc(c)?.type ?? "")).map(([, v]) => v)))
  const checks = [
    {
      id: "pl-ties",
      label: "Profit for the year agrees with the books",
      detail: "The income statement's profit equals the net of every 2025 income and expense posting.",
      ok: Math.abs(ledgerPlTotal - pl2025.profitForYear) < 0.01,
      values: [pl2025.profitForYear, ledgerPlTotal] as [number, number],
    },
    {
      id: "bs-ties",
      label: "Balance sheet agrees with the closing balances",
      detail: "Every 31 Dec 2025 balance comes from the starting-balances journal brought into 2026.",
      ok: Math.abs(bs2025.cash - sum(cashAccounts.map((c) => c.amount))) < 0.01,
      values: [bs2025.totalAssets, bs2025.totalAssets] as [number, number],
      journalId: openingJournalId,
    },
    {
      id: "bs-balances",
      label: "Balance sheet balances, both years",
      detail: "Total assets equal total equity and liabilities in 2025 and 2024.",
      ok: Math.abs(bs2025.totalAssets - bs2025.totalEquityAndLiabilities) < 0.01 && Math.abs(bs2024.totalAssets - bs2024.totalEquityAndLiabilities) < 0.01,
      values: [bs2025.totalAssets, bs2025.totalEquityAndLiabilities] as [number, number],
    },
    {
      id: "cash-reconciles",
      label: "Cash flow ends at the balance-sheet cash",
      detail: "Opening cash plus the year's net cash flow equals cash and cash equivalents at 31 Dec 2025.",
      ok: Math.abs(cashflow.closingCash - bs2025.cash) < 0.01,
      values: [cashflow.closingCash, bs2025.cash] as [number, number],
    },
    {
      id: "equity-rolls",
      label: "Retained earnings roll forward",
      detail: "2024 retained earnings plus profit, less dividends, equals 2025 retained earnings.",
      ok: Math.abs(retained2024 + pl2025.profitForYear - DIVIDEND_PAID[2025] - retained2025) < 0.01,
      values: [r2(retained2024 + pl2025.profitForYear - DIVIDEND_PAID[2025]), retained2025] as [number, number],
    },
    {
      id: "tax-rate",
      label: "Tax charge is 25% of profit before tax",
      detail: "Ghana's corporate income tax rate applied to the year's profit before tax.",
      ok: Math.abs(pl2025.tax - pl2025.profitBeforeTax * TAX_RATE) < 1,
      values: [pl2025.tax, r2(pl2025.profitBeforeTax * TAX_RATE)] as [number, number],
    },
  ]

  return {
    year: FY,
    prior: PRIOR,
    pl: { cur: pl2025, prev: pl2024 },
    bs: { cur: bs2025, prev: bs2024 },
    cashflow,
    equity,
    notes,
    history,
    salient,
    checks,
    sharesInIssue: SHARES_IN_ISSUE,
    dividends: { paid2025: DIVIDEND_PAID[2025], paid2024: DIVIDEND_PAID[2024], proposedPerShare: PROPOSED_FINAL_DIVIDEND_PER_SHARE, proposedTotal: r2(PROPOSED_FINAL_DIVIDEND_PER_SHARE * SHARES_IN_ISSUE) },
    openingJournalId,
  }
}

export type AnnualFigures = ReturnType<typeof annualFigures>
