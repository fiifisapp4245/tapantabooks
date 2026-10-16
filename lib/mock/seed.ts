/**
 * One seeded script generates the whole demo company. Every invoice, bill,
 * receipt and payment creates its own balanced journal; every balance, KPI,
 * ageing bucket and report is computed from those journals by
 * /lib/selectors — nothing below types a total in by hand.
 */
import type { Currency } from "../constants"
import { addDays, TODAY } from "../dates"
import type {
  Account,
  AuditEvent,
  BankLine,
  Bill,
  BranchId,
  Company,
  Connection,
  Contact,
  CreditNote,
  DocLine,
  ImportBatch,
  Invoice,
  Journal,
  JournalLine,
  Payment,
  PayoutMethod,
  Period,
  TaxCode,
} from "../types"
import { TAX_RATES } from "../types"

/* ---------------- helpers ---------------- */

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20261005)
const between = (min: number, max: number, step = 10) => Math.round((min + rand() * (max - min)) / step) * step
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]
export const r2 = (n: number) => Math.round(n * 100) / 100
const pad = (n: number, w = 4) => String(n).padStart(w, "0")

export const RATES: Record<Currency, number> = { GHS: 1, USD: 12.9001, EUR: 14.0574, GBP: 16.4212 }
export const APPROVAL_THRESHOLD = 50000
export const PERIOD_LOCK_DATE = "2026-09-30"

/* ---------------- chart of accounts ---------------- */

const A = (
  code: string,
  name: string,
  type: Account["type"],
  category: string,
  description: string,
  extra: Partial<Account> = {}
): Account => ({
  code,
  name,
  type,
  category,
  description,
  normal: type === "asset" || type === "expense" || type === "cost_of_sales" ? "debit" : "credit",
  currency: "GHS",
  active: true,
  ...extra,
})

export const ACCOUNTS: Account[] = [
  A("1000", "Cash on hand – Adum", "asset", "Cash & bank", "Notes and coins kept at the Adum branch.", { bank: { kind: "cash", institution: "Cash box", masked: "Adum safe" } }),
  A("1010", "GCB Bank – Current", "asset", "Cash & bank", "Main operating account. Most customers pay in here.", { bank: { kind: "bank", institution: "GCB Bank", masked: "•••• 4471" } }),
  A("1020", "Ecobank – Current", "asset", "Cash & bank", "Second operating account, used for supplier payments.", { bank: { kind: "bank", institution: "Ecobank", masked: "•••• 2096" } }),
  A("1025", "Ecobank – USD", "asset", "Cash & bank", "Dollar account for overseas customers. Revalued each month.", { currency: "USD", bank: { kind: "bank", institution: "Ecobank", masked: "•••• 7310 USD" } }),
  A("1030", "MTN MoMo wallet", "asset", "Cash & bank", "Merchant wallet for mobile money collections and payouts.", { bank: { kind: "momo", institution: "MTN MoMo", masked: "024 •••• 118" } }),
  A("1100", "Who owes you", "asset", "Receivables", "Money customers owe on invoices you've sent. Accounts receivable."),
  A("1200", "Inventory – goods for resale", "asset", "Inventory", "Stock on hand at cost."),
  A("1300", "VAT recoverable", "asset", "Tax assets", "VAT you paid on purchases and can claim back."),
  A("1310", "WHT receivable", "asset", "Tax assets", "Tax customers withheld from what they paid you."),
  A("1500", "Vehicles", "asset", "Fixed assets", "Delivery vans and staff vehicles at cost."),
  A("1510", "Furniture & equipment", "asset", "Fixed assets", "Shop fittings, shelving and office equipment."),
  A("1590", "Accumulated depreciation", "asset", "Fixed assets", "Wear and tear charged on fixed assets so far.", { normal: "credit" }),
  A("2000", "What you owe", "liability", "Payables", "Bills from suppliers you haven't paid yet. Accounts payable."),
  A("2100", "VAT payable", "liability", "Tax liabilities", "VAT charged to customers, owed to GRA."),
  A("2110", "WHT payable", "liability", "Tax liabilities", "Tax you withheld from suppliers, owed to GRA."),
  A("2120", "SSNIT payable", "liability", "Payroll liabilities", "Employee 5.5% and employer 13% pension contributions not yet remitted."),
  A("2130", "PAYE payable", "liability", "Payroll liabilities", "Income tax deducted from salaries, owed to GRA."),
  A("2200", "Accrued expenses", "liability", "Current liabilities", "Costs incurred but not yet billed."),
  A("2300", "Stanbic term loan", "liability", "Loans", "Five-year term loan from Stanbic Bank."),
  A("3000", "Share capital", "equity", "Equity", "Money the owners put into the company."),
  A("3100", "Retained earnings", "equity", "Equity", "Profits kept in the business from earlier years."),
  A("4000", "Sales – goods", "income", "Sales", "Selling goods to customers."),
  A("4010", "Sales – services", "income", "Sales", "Delivery, handling and other services you charge for."),
  A("4100", "Interest received – bank", "income", "Other income", "Interest your bank pays on deposits."),
  A("4150", "Loan interest income", "income", "Other income", "Interest earned on loans made by KT Microfinance.", { active: false }),
  A("4200", "Foreign exchange gains", "income", "Other income", "Gains when foreign currency balances are revalued."),
  A("5000", "Goods bought for resale", "cost_of_sales", "Cost of sales", "What you paid for the goods you sold."),
  A("5010", "Freight & clearing", "cost_of_sales", "Cost of sales", "Shipping, port and clearing costs on stock."),
  A("6000", "Salaries & wages", "expense", "Staff costs", "Gross pay for all staff."),
  A("6010", "Employer SSNIT", "expense", "Staff costs", "The company's 13% pension contribution."),
  A("6100", "Rent", "expense", "Premises", "Rent for shops and the warehouse."),
  A("6110", "Utilities", "expense", "Premises", "Electricity and water."),
  A("6120", "Fuel & transport", "expense", "Running costs", "Fuel for delivery vans and staff transport."),
  A("6130", "Telephone & internet", "expense", "Running costs", "Airtime, data and office broadband."),
  A("6140", "Office supplies", "expense", "Running costs", "Stationery, printing and small items."),
  A("6160", "Bank charges", "expense", "Finance costs", "Account fees, COT and SMS alert charges."),
  A("6170", "MoMo charges", "expense", "Finance costs", "Mobile money transaction fees."),
  A("6200", "Depreciation", "expense", "Running costs", "Monthly wear and tear on fixed assets."),
  A("6300", "Loan interest", "expense", "Finance costs", "Interest on the Stanbic term loan."),
  A("6400", "Professional fees", "expense", "Running costs", "Audit, legal and consulting fees."),
  A("6500", "Marketing", "expense", "Running costs", "Radio, print and online advertising."),
  A("9999", "Suspense", "asset", "Suspense", "Holding account for money you can't place yet. Should be cleared to zero.", { normal: "debit" }),
]

/* ---------------- contacts ---------------- */

const C = (id: string, kind: Contact["kind"], name: string, city: string, termsDays: number, extra: Partial<Contact> = {}): Contact => ({
  id,
  kind,
  name,
  city,
  termsDays,
  email: `accounts@${name.toLowerCase().replace(/[^a-z]+/g, "").slice(0, 14)}.com.gh`,
  phone: `+233 ${between(20, 59, 1)} ${between(100, 999, 1)} ${between(1000, 9999, 1)}`,
  tin: `C00${between(10000000, 99999999, 1)}`,
  currency: "GHS",
  ...extra,
})

export const CONTACTS: Contact[] = [
  C("cus-melcom", "customer", "Melcom Ltd", "Accra", 30),
  C("cus-kasapreko", "customer", "Kasapreko Company", "Accra", 14),
  C("cus-ashfoam", "customer", "Ashfoam Ghana", "Kumasi", 30),
  C("cus-unilever", "customer", "Unilever Ghana", "Tema", 30),
  C("cus-cocobod", "customer", "Ghana Cocoa Board", "Accra", 30),
  C("cus-fanmilk", "customer", "Fan Milk PLC", "Accra", 14),
  C("cus-kbl", "customer", "Kumasi Brewery", "Kumasi", 30),
  C("cus-shoprite", "customer", "Shoprite Accra Mall", "Accra", 30),
  C("cus-electroland", "customer", "Electroland Ghana", "Kumasi", 14),
  C("cus-nyaho", "customer", "Nyaho Medical Centre", "Accra", 30),
  C("cus-takpharma", "customer", "Takoradi Pharmacy Ltd", "Takoradi", 14),
  C("cus-lagos", "customer", "Lagos Retail Partners", "Lagos", 30, { currency: "USD", overseas: true }),
  C("sup-tema", "supplier", "Tema Wholesale Depot", "Tema", 30),
  C("sup-goil", "supplier", "GOIL PLC", "Accra", 14),
  C("sup-ecg", "supplier", "Electricity Company of Ghana", "Kumasi", 14),
  C("sup-gwl", "supplier", "Ghana Water Ltd", "Kumasi", 14),
  C("sup-mtn", "supplier", "MTN Ghana", "Accra", 14),
  C("sup-adumprop", "supplier", "Adum Properties Ltd", "Kumasi", 7),
  C("sup-packaging", "supplier", "Kumasi Packaging Ltd", "Kumasi", 30),
  C("sup-interplast", "supplier", "Interplast Ltd", "Accra", 30),
  C("sup-afrik", "supplier", "Afrik Logistics", "Tema", 14),
  C("sup-officemart", "supplier", "Accra Office Mart", "Accra", 14),
  C("sup-bpca", "supplier", "Boateng & Partners Chartered Accountants", "Kumasi", 30),
  C("sup-joyfm", "supplier", "Multimedia Group – Joy FM", "Accra", 30),
]

export const PRODUCTS = [
  { id: "p-chicken", name: "Frozen chicken (10kg carton)", price: 420, accountCode: "4000" },
  { id: "p-oil", name: "Vegetable oil (25L)", price: 680, accountCode: "4000" },
  { id: "p-rice", name: "Rice – 50kg bag", price: 950, accountCode: "4000" },
  { id: "p-sugar", name: "Sugar – 50kg bag", price: 780, accountCode: "4000" },
  { id: "p-tomato", name: "Tomato paste (carton)", price: 310, accountCode: "4000" },
  { id: "p-water", name: "Bottled water (pack of 12)", price: 38, accountCode: "4000" },
  { id: "p-cement", name: "Cement (50kg)", price: 95, accountCode: "4000" },
  { id: "p-roofing", name: "Roofing sheets (bundle)", price: 1450, accountCode: "4000" },
  { id: "p-delivery", name: "Delivery & handling", price: 250, accountCode: "4010" },
]

const SUPPLIER_SPEND: Record<string, { account: string; tax: TaxCode; min: number; max: number; label: string; wht?: boolean }> = {
  "sup-tema": { account: "5000", tax: "GH-STD", min: 8000, max: 42000, label: "Stock purchase" },
  "sup-packaging": { account: "5000", tax: "GH-STD", min: 2000, max: 9000, label: "Packaging materials" },
  "sup-interplast": { account: "5000", tax: "GH-STD", min: 3000, max: 14000, label: "Plastic crates and containers" },
  "sup-afrik": { account: "5010", tax: "GH-STD", min: 1500, max: 7500, label: "Freight and clearing" },
  "sup-goil": { account: "6120", tax: "GH-STD", min: 1200, max: 4800, label: "Fuel for delivery vans" },
  "sup-ecg": { account: "6110", tax: "GH-STD", min: 900, max: 3200, label: "Electricity" },
  "sup-gwl": { account: "6110", tax: "EXEMPT", min: 200, max: 650, label: "Water" },
  "sup-mtn": { account: "6130", tax: "GH-STD", min: 400, max: 1200, label: "Airtime, data and broadband" },
  "sup-adumprop": { account: "6100", tax: "EXEMPT", min: 6000, max: 6000, label: "Monthly rent – Adum shop and warehouse" },
  "sup-officemart": { account: "6140", tax: "GH-STD", min: 300, max: 1500, label: "Stationery and printing" },
  "sup-bpca": { account: "6400", tax: "GH-STD", min: 4000, max: 12000, label: "Accounting and tax advisory", wht: true },
  "sup-joyfm": { account: "6500", tax: "GH-STD", min: 2500, max: 8000, label: "Radio advertising", wht: true },
}

/* ---------------- builders ---------------- */

const journals: Journal[] = []
let tmp = 0
function je(j: Omit<Journal, "id" | "createdAt" | "status" | "createdBy"> & Partial<Pick<Journal, "status" | "createdBy">>): Journal {
  const lines = j.lines.map((l) => ({ ...l, debit: r2(l.debit), credit: r2(l.credit) }))
  const dr = lines.reduce((s, l) => s + l.debit, 0)
  const cr = lines.reduce((s, l) => s + l.credit, 0)
  const diff = r2(dr - cr)
  if (diff !== 0) {
    // Push rounding pennies onto the largest line so every journal balances exactly.
    const target = diff > 0 ? lines.filter((l) => l.credit > 0).sort((a, b) => b.credit - a.credit)[0] : lines.filter((l) => l.debit > 0).sort((a, b) => b.debit - a.debit)[0]
    if (diff > 0) target.credit = r2(target.credit + diff)
    else target.debit = r2(target.debit - diff)
  }
  const journal: Journal = {
    id: `tmp-${++tmp}`,
    status: "posted",
    createdBy: "efua",
    approvedBy: undefined,
    createdAt: j.date,
    ...j,
    lines,
  }
  journals.push(journal)
  return journal
}

export function docTotals(lines: DocLine[]) {
  let subtotal = 0
  let tax = 0
  for (const l of lines) {
    const net = r2(l.qty * l.unitPrice * (1 - l.discount))
    subtotal += net
    tax += r2(net * TAX_RATES[l.taxCode])
  }
  return { subtotal: r2(subtotal), tax: r2(tax), total: r2(subtotal + tax) }
}

/** Dr Who owes you / Cr revenue / Cr VAT — in base currency. */
export function invoiceJournalLines(inv: Pick<Invoice, "lines" | "rate" | "id">): JournalLine[] {
  const out: JournalLine[] = []
  let total = 0
  const byAccount = new Map<string, number>()
  let tax = 0
  for (const l of inv.lines) {
    const net = r2(l.qty * l.unitPrice * (1 - l.discount) * inv.rate)
    byAccount.set(l.accountCode, r2((byAccount.get(l.accountCode) ?? 0) + net))
    tax += r2(net * TAX_RATES[l.taxCode])
  }
  for (const v of byAccount.values()) total += v
  total = r2(total + tax)
  out.push({ accountCode: "1100", description: inv.id, debit: total, credit: 0 })
  for (const [code, v] of byAccount) out.push({ accountCode: code, description: inv.id, debit: 0, credit: v })
  if (tax) out.push({ accountCode: "2100", description: `VAT on ${inv.id}`, debit: 0, credit: r2(tax) })
  return out
}

/** Dr expense / Dr VAT recoverable / Cr What you owe. */
export function billJournalLines(bill: Pick<Bill, "lines" | "rate" | "id">): JournalLine[] {
  const out: JournalLine[] = []
  let total = 0
  let tax = 0
  for (const l of bill.lines) {
    const net = r2(l.qty * l.unitPrice * (1 - l.discount) * bill.rate)
    out.push({ accountCode: l.accountCode, description: l.description, debit: net, credit: 0 })
    tax += r2(net * TAX_RATES[l.taxCode])
    total += net
  }
  if (tax) out.push({ accountCode: "1300", description: `VAT on ${bill.id}`, debit: r2(tax), credit: 0 })
  out.push({ accountCode: "2000", description: bill.id, debit: 0, credit: r2(total + tax) })
  return out
}

const BRANCH_IDS: BranchId[] = ["adum", "osu", "tak"]

/* ---------------- opening balances ---------------- */

{
  const lines: JournalLine[] = [
    { accountCode: "1000", debit: 6500, credit: 0 },
    { accountCode: "1010", debit: 184200, credit: 0 },
    { accountCode: "1020", debit: 96350, credit: 0 },
    { accountCode: "1025", debit: r2(8000 * 12.55), credit: 0, description: "US$ 8,000.00 at 12.5500" },
    { accountCode: "1030", debit: 4000, credit: 0 },
    { accountCode: "1200", debit: 214500, credit: 0 },
    { accountCode: "1500", debit: 320000, credit: 0 },
    { accountCode: "1510", debit: 85000, credit: 0 },
    { accountCode: "1590", debit: 0, credit: 62500 },
    { accountCode: "2300", debit: 0, credit: 240000 },
    { accountCode: "3000", debit: 0, credit: 200000 },
  ]
  const dr = lines.reduce((s, l) => s + l.debit, 0)
  const cr = lines.reduce((s, l) => s + l.credit, 0)
  lines.push({ accountCode: "3100", debit: 0, credit: r2(dr - cr) })
  je({
    date: "2026-01-01",
    memo: "Starting balances at conversion",
    reference: "OB-2026",
    source: "opening",
    branch: "adum",
    createdBy: "kofi",
    approvedBy: "ama",
    lines,
  })
}

/* ---------------- invoices & receipts ---------------- */

export const INVOICES: Invoice[] = []
export const PAYMENTS: Payment[] = []
let receiptNo = 0
let payNo = 0

function addReceipt(inv: Invoice, date: string, amount: number, accountCode = inv.currency === "USD" ? "1025" : rand() < 0.2 ? "1030" : "1010") {
  const id = `RCPT-${pad(++receiptNo)}`
  const base = r2(amount * inv.rate)
  const j = je({
    date,
    memo: `Payment from ${CONTACTS.find((c) => c.id === inv.contactId)!.name} for ${inv.id}`,
    reference: id,
    source: "sales",
    sourceDocId: id,
    branch: inv.branch,
    lines: [
      { accountCode, debit: base, credit: 0 },
      { accountCode: "1100", description: inv.id, debit: 0, credit: base },
    ],
  })
  PAYMENTS.push({
    id,
    direction: "in",
    date,
    contactId: inv.contactId,
    docId: inv.id,
    accountCode,
    amount: r2(amount),
    currency: inv.currency,
    rate: inv.rate,
    method: accountCode === "1030" ? "MTN MoMo" : "Bank transfer",
    branch: inv.branch,
    memo: `Payment for ${inv.id}`,
    journalId: j.id,
  })
}

type InvSpec = { issue: string; due?: string; status?: Invoice["status"]; paid?: number; customer?: string; big?: boolean }

// The last 14 invoices are placed by hand so every state the redesign needs is on screen.
const RECENT: InvSpec[] = [
  { issue: "2026-07-20", due: "2026-08-19", paid: 0, customer: "cus-cocobod", big: true }, // overdue 47d
  { issue: "2026-08-12", due: "2026-08-26", paid: 0.4, customer: "cus-kasapreko" }, // overdue part paid
  { issue: "2026-08-21", due: "2026-09-04", paid: 1 },
  { issue: "2026-08-28", due: "2026-09-11", paid: 0, customer: "cus-electroland" }, // overdue 24d
  { issue: "2026-09-01", due: "2026-09-15", paid: 0, customer: "cus-fanmilk" }, // overdue 20d
  { issue: "2026-09-08", due: "2026-09-22", paid: 1 },
  { issue: "2026-09-10", due: "2026-09-24", paid: 0, customer: "cus-takpharma" }, // overdue 11d
  { issue: "2026-09-14", due: "2026-10-14", paid: 1 },
  { issue: "2026-09-18", due: "2026-10-02", status: "void", customer: "cus-nyaho" },
  { issue: "2026-09-22", due: "2026-10-09", paid: 0.5, customer: "cus-ashfoam" }, // part paid, due in 4d
  { issue: "2026-09-26", due: "2026-10-10", paid: 0, customer: "cus-melcom" }, // due in 5d
  { issue: "2026-09-29", due: "2026-10-29", paid: 0, customer: "cus-lagos" }, // USD, not due
  { issue: "2026-10-02", due: "2026-11-01", status: "awaiting_approval", customer: "cus-unilever", big: true },
  { issue: "2026-10-04", due: "2026-10-18", status: "draft", customer: "cus-kbl" },
]

const customerIds = CONTACTS.filter((c) => c.kind === "customer" && !c.overseas).map((c) => c.id)
const specs: InvSpec[] = []
for (let i = 0; i < 29; i++) {
  const issue = addDays("2026-01-06", Math.round(i * 6.6))
  specs.push({ issue, paid: 1 })
}
specs.push(...RECENT)

specs.forEach((s, i) => {
  const id = `INV-${pad(i + 1)}`
  const customerId = s.customer ?? pick(customerIds)
  const customer = CONTACTS.find((c) => c.id === customerId)!
  const currency = customer.currency
  const nLines = 1 + Math.floor(rand() * 3)
  const lines: DocLine[] = []
  const used = new Set<string>()
  for (let k = 0; k < nLines; k++) {
    let p = pick(PRODUCTS)
    while (used.has(p.id)) p = pick(PRODUCTS)
    used.add(p.id)
    const qty = p.id === "p-delivery" ? 1 : Math.max(1, Math.round((s.big ? between(40, 70, 1) : between(4, 28, 1)) * (p.price > 900 ? 0.6 : 1)))
    lines.push({
      description: p.name,
      qty,
      unitPrice: currency === "USD" ? r2(p.price / RATES.USD) : p.price,
      discount: k === 0 && rand() < 0.15 ? 0.05 : 0,
      taxCode: customer.overseas ? "ZERO" : "GH-STD",
      accountCode: p.accountCode,
    })
  }
  const t = docTotals(lines)
  const issue = s.issue
  const due = s.due ?? addDays(issue, customer.termsDays)
  const inv: Invoice = {
    kind: "invoice",
    id,
    contactId: customer.id,
    issueDate: issue,
    dueDate: due,
    currency,
    rate: RATES[currency],
    branch: pick(BRANCH_IDS),
    reference: rand() < 0.4 ? `PO-${between(1100, 4800, 1)}` : undefined,
    lines,
    status: s.status ?? "posted",
    ...t,
    createdBy: pick(["efua", "efua", "kofi"]),
    deliveryRoute: customer.overseas ? "Export (overseas)" : "Local",
  }
  if (inv.status === "posted" || inv.status === "void") {
    const j = je({
      date: issue,
      memo: `Invoice ${id} – ${customer.name}`,
      reference: id,
      source: "sales",
      sourceDocId: id,
      branch: inv.branch,
      createdBy: inv.createdBy,
      lines: invoiceJournalLines(inv),
    })
    inv.journalId = j.id
    if (inv.status === "void") {
      j.status = "reversed"
      const rev = je({
        date: "2026-09-19",
        memo: `Reversal of ${id} – issued in error`,
        reference: id,
        source: "sales",
        sourceDocId: id,
        branch: inv.branch,
        createdBy: "kofi",
        reverses: j.id,
        lines: j.lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit })),
      })
      j.reversedBy = rev.id
    }
  }
  if (inv.status === "posted" && s.paid) {
    if (s.paid >= 1) {
      const payDate = addDays(issue, Math.min(customer.termsDays, between(5, customer.termsDays + 4, 1)))
      addReceipt(inv, payDate > TODAY ? TODAY : payDate, inv.total)
    } else {
      addReceipt(inv, addDays(issue, 6), r2(inv.total * s.paid))
    }
  }
  const overdueDays = inv.status === "posted" && s.paid !== 1 ? Math.max(0, Math.round((Date.parse(TODAY) - Date.parse(due)) / 86400000)) : 0
  if (overdueDays > 7) inv.remindersSent = [addDays(due, 3), ...(overdueDays > 20 ? [addDays(due, 17)] : [])]
  INVOICES.push(inv)
})

/* ---------------- bills & payments made ---------------- */

export const BILLS: Bill[] = []
const supplierIds = Object.keys(SUPPLIER_SPEND)

function addBillPayment(bill: Bill, date: string, amount: number) {
  const id = `PAY-${pad(++payNo)}`
  const spend = SUPPLIER_SPEND[bill.contactId]
  const accountCode = bill.contactId === "sup-goil" && rand() < 0.5 ? "1030" : rand() < 0.55 ? "1020" : "1010"
  const lines: JournalLine[] = [{ accountCode: "2000", description: bill.id, debit: r2(amount), credit: 0 }]
  if (spend?.wht && amount >= bill.total) {
    const wht = r2(bill.subtotal * 0.075)
    lines.push({ accountCode: "2110", description: "WHT 7.5%", debit: 0, credit: wht })
    lines.push({ accountCode, debit: 0, credit: r2(amount - wht) })
  } else {
    lines.push({ accountCode, debit: 0, credit: r2(amount) })
  }
  const supplier = CONTACTS.find((c) => c.id === bill.contactId)!
  const j = je({
    date,
    memo: `Payment to ${supplier.name} for ${bill.id}`,
    reference: id,
    source: "purchases",
    sourceDocId: id,
    branch: bill.branch,
    lines,
  })
  PAYMENTS.push({
    id,
    direction: "out",
    date,
    contactId: bill.contactId,
    docId: bill.id,
    accountCode,
    amount: r2(amount),
    currency: "GHS",
    rate: 1,
    method: accountCode === "1030" ? "MTN MoMo" : pick(["Bank transfer", "Bank transfer", "Cheque"] as const),
    branch: bill.branch,
    memo: `Payment for ${bill.id}`,
    journalId: j.id,
  })
}

type BillSpec = { supplier: string; date: string; due?: string; paid: number; status?: Bill["status"] }
const billSpecs: BillSpec[] = []
// Rent every month on the 1st.
for (let m = 1; m <= 10; m++) billSpecs.push({ supplier: "sup-adumprop", date: `2026-${pad(m, 2)}-01`, paid: m < 10 ? 1 : 0, due: `2026-${pad(m, 2)}-08` })
// The rest spread across the year.
const others = supplierIds.filter((s) => s !== "sup-adumprop")
for (let i = 0; i < 59; i++) {
  billSpecs.push({ supplier: others[i % others.length], date: addDays("2026-01-04", Math.round(i * 4.4)), paid: 1 })
}
// Recent bills placed by hand.
billSpecs.push(
  { supplier: "sup-tema", date: "2026-08-20", due: "2026-09-19", paid: 0 }, // overdue 16d
  { supplier: "sup-afrik", date: "2026-09-05", due: "2026-09-19", paid: 0.5 }, // overdue part paid
  { supplier: "sup-goil", date: "2026-09-12", due: "2026-09-26", paid: 0 }, // overdue 9d
  { supplier: "sup-packaging", date: "2026-09-18", due: "2026-10-08", paid: 0 }, // due in 3d
  { supplier: "sup-ecg", date: "2026-09-24", due: "2026-10-08", paid: 0 }, // due in 3d
  { supplier: "sup-tema", date: "2026-09-28", due: "2026-10-28", paid: 0 },
  { supplier: "sup-bpca", date: "2026-10-01", due: "2026-10-31", paid: 0 },
  { supplier: "sup-officemart", date: "2026-10-04", due: "2026-10-18", paid: 0, status: "draft" }
)
billSpecs.sort((a, b) => a.date.localeCompare(b.date))

billSpecs.forEach((s, i) => {
  const id = `BILL-${pad(i + 1)}`
  const spend = SUPPLIER_SPEND[s.supplier]
  const supplier = CONTACTS.find((c) => c.id === s.supplier)!
  const amount = spend.min === spend.max ? spend.min : between(spend.min, spend.max, 10)
  const lines: DocLine[] = [
    { description: spend.label, qty: 1, unitPrice: amount, discount: 0, taxCode: spend.tax, accountCode: spend.account },
  ]
  const t = docTotals(lines)
  const bill: Bill = {
    kind: "bill",
    id,
    contactId: s.supplier,
    issueDate: s.date,
    dueDate: s.due ?? addDays(s.date, supplier.termsDays),
    currency: "GHS",
    rate: 1,
    branch: s.supplier === "sup-adumprop" ? "adum" : pick(BRANCH_IDS),
    reference: `${supplier.name.split(" ")[0].toUpperCase().slice(0, 4)}-${between(10000, 99999, 1)}`,
    lines,
    status: s.status ?? "posted",
    ...t,
    createdBy: "efua",
  }
  if (bill.status === "posted") {
    const j = je({
      date: s.date,
      memo: `Supplier bill ${id} – ${supplier.name}`,
      reference: bill.reference,
      source: "purchases",
      sourceDocId: id,
      branch: bill.branch,
      lines: billJournalLines(bill),
    })
    bill.journalId = j.id
    if (s.paid >= 1) {
      const d = addDays(s.date, Math.min(supplier.termsDays, between(3, supplier.termsDays, 1)))
      addBillPayment(bill, d > TODAY ? TODAY : d, bill.total)
    } else if (s.paid > 0) {
      addBillPayment(bill, addDays(s.date, 5), r2(bill.total * s.paid))
    }
  }
  BILLS.push(bill)
})

/* ---------------- credit notes ---------------- */

export const CREDIT_NOTES: CreditNote[] = []
{
  const inv = INVOICES[20]
  const amount = r2(inv.subtotal * 0.1)
  const tax = r2(amount * 0.2)
  const j = je({
    date: addDays(inv.issueDate, 4),
    memo: `Credit note CN-0001 – damaged goods on ${inv.id}`,
    reference: "CN-0001",
    source: "sales",
    sourceDocId: "CN-0001",
    branch: inv.branch,
    lines: [
      { accountCode: "4000", debit: amount, credit: 0 },
      { accountCode: "2100", debit: tax, credit: 0 },
      { accountCode: "1100", debit: 0, credit: r2(amount + tax) },
    ],
  })
  // Refunded straight away so the invoice stays fully settled.
  const refund = je({
    date: addDays(inv.issueDate, 5),
    memo: `Refund for CN-0001`,
    reference: "CN-0001",
    source: "banking",
    branch: inv.branch,
    lines: [
      { accountCode: "1100", debit: r2(amount + tax), credit: 0 },
      { accountCode: "1010", debit: 0, credit: r2(amount + tax) },
    ],
  })
  void refund
  CREDIT_NOTES.push({ id: "CN-0001", kind: "credit_note", contactId: inv.contactId, date: addDays(inv.issueDate, 4), docId: inv.id, reason: "Damaged cartons on delivery", amount, tax, total: r2(amount + tax), applied: r2(amount + tax), status: "applied", branch: inv.branch, journalId: j.id })
  CREDIT_NOTES.push({ id: "CN-0002", kind: "credit_note", contactId: "cus-melcom", date: "2026-10-03", reason: "Price agreed after delivery", amount: 400, tax: 80, total: 480, applied: 0, status: "open", branch: "osu" })
  CREDIT_NOTES.push({ id: "SC-0001", kind: "supplier_credit", contactId: "sup-tema", date: "2026-09-02", reason: "Short delivery – 12 bags of rice", amount: 1140, tax: 228, total: 1368, applied: 0, status: "open", branch: "adum" })
  CREDIT_NOTES.push({ id: "SC-0002", kind: "supplier_credit", contactId: "sup-interplast", date: "2026-06-11", reason: "Returned cracked crates", amount: 620, tax: 124, total: 744, applied: 744, status: "applied", branch: "tak" })
}
// Post the open supplier credit so What you owe reflects it.
{
  const sc = CREDIT_NOTES.find((c) => c.id === "SC-0001")!
  sc.journalId = je({
    date: sc.date,
    memo: `Supplier credit SC-0001 – ${sc.reason}`,
    reference: "SC-0001",
    source: "purchases",
    sourceDocId: "SC-0001",
    branch: sc.branch,
    lines: [
      { accountCode: "2000", debit: sc.total, credit: 0 },
      { accountCode: "5000", debit: 0, credit: sc.amount },
      { accountCode: "1300", debit: 0, credit: sc.tax },
    ],
  }).id
}

/* ---------------- monthly operations ---------------- */

const monthsToDate = ["01", "02", "03", "04", "05", "06", "07", "08", "09"]
let loanBalance = 240000
monthsToDate.forEach((mm, i) => {
  const gross = 16000 + i * 120
  const eom = new Date(Date.UTC(2026, Number(mm), 0)).toISOString().slice(0, 10)
  je({
    date: eom,
    memo: `Salaries – ${new Date(eom).toLocaleString("en-GB", { month: "long" })}`,
    reference: `PAY-RUN-${mm}`,
    source: "payroll",
    branch: "adum",
    createdBy: "kofi",
    lines: [
      { accountCode: "6000", debit: gross, credit: 0 },
      { accountCode: "6010", debit: gross * 0.13, credit: 0 },
      { accountCode: "2120", debit: 0, credit: gross * 0.185 },
      { accountCode: "2130", debit: 0, credit: gross * 0.12 },
      { accountCode: "1010", debit: 0, credit: gross * 0.825 },
    ],
  })
  if (addDays(eom, 14) <= TODAY) je({
    date: addDays(eom, 14),
    memo: `SSNIT and PAYE remittance – ${new Date(eom).toLocaleString("en-GB", { month: "long" })}`,
    reference: `SSNIT-${mm}`,
    source: "banking",
    branch: "adum",
    lines: [
      { accountCode: "2120", debit: gross * 0.185, credit: 0 },
      { accountCode: "2130", debit: gross * 0.12, credit: 0 },
      { accountCode: "1010", debit: 0, credit: gross * 0.305 },
    ],
  })
  je({
    date: eom,
    memo: `Depreciation – ${new Date(eom).toLocaleString("en-GB", { month: "long" })}`,
    reference: `DEP-${mm}`,
    source: "manual",
    branch: "adum",
    createdBy: "kofi",
    lines: [
      { accountCode: "6200", debit: 3250, credit: 0 },
      { accountCode: "1590", debit: 0, credit: 3250 },
    ],
  })
  const charges = between(120, 260, 1)
  je({
    date: eom,
    memo: `Bank charges – ${new Date(eom).toLocaleString("en-GB", { month: "long" })}`,
    reference: `CHG-${mm}`,
    source: "banking",
    branch: "adum",
    lines: [
      { accountCode: "6160", debit: charges, credit: 0 },
      { accountCode: "1010", debit: 0, credit: charges },
    ],
  })
})

// Loan instalments on the 5th, January to October.
for (let m = 1; m <= 10; m++) {
  const interest = r2(loanBalance * 0.24 / 12)
  const principal = 8000
  loanBalance -= principal
  const month = new Date(Date.UTC(2026, m - 1, 5)).toLocaleString("en-GB", { month: "long" })
  je({
    date: `2026-${pad(m, 2)}-05`,
    memo: `Stanbic term loan instalment – ${month}`,
    reference: `STB-LN-${pad(m, 2)}`,
    source: "loans",
    branch: "adum",
    createdBy: "kofi",
    lines: [
      { accountCode: "2300", debit: principal, credit: 0 },
      { accountCode: "6300", debit: interest, credit: 0 },
      { accountCode: "1010", debit: 0, credit: principal + interest },
    ],
  })
}

// Revaluation of the USD account, month ends Jul–Sep.
;["2026-07-31", "2026-08-31", "2026-09-30"].forEach((d, i) => {
  je({
    date: d,
    memo: `Currency revaluation – Ecobank USD (${["July", "August", "September"][i]})`,
    reference: `REVAL-${d.slice(5, 7)}`,
    source: "revaluation",
    branch: "adum",
    createdBy: "kofi",
    approvedBy: "ama",
    lines: [
      { accountCode: "1025", debit: [412.6, 286.15, 198.4][i], credit: 0 },
      { accountCode: "4200", debit: 0, credit: [412.6, 286.15, 198.4][i] },
    ],
  })
})

// Transfers between banks, once a quarter.
;["2026-03-16", "2026-06-15", "2026-09-15"].forEach((d) =>
  je({
    date: d,
    memo: "Transfer GCB → Ecobank for supplier payments",
    reference: `TRF-${d.slice(5, 7)}`,
    source: "banking",
    branch: "adum",
    lines: [
      { accountCode: "1020", debit: 90000, credit: 0 },
      { accountCode: "1010", debit: 0, credit: 90000 },
    ],
  })
)

// MoMo collections and payouts. Payouts overshoot so the wallet ends negative —
// a deliberate data issue the chart of accounts flags.
for (let i = 0; i < 9; i++) {
  const d = addDays("2026-01-20", i * 29)
  const gross = between(3000, 6800, 10)
  const net = r2(gross / 1.2)
  je({
    date: d,
    memo: `MoMo merchant collections – ${d.slice(5, 7)}/${d.slice(0, 4)}`,
    reference: `MOMO-C-${pad(i + 1, 3)}`,
    source: "momo",
    branch: "osu",
    createdBy: "system",
    lines: [
      { accountCode: "1030", debit: gross, credit: 0 },
      { accountCode: "4000", debit: 0, credit: net },
      { accountCode: "2100", debit: 0, credit: r2(gross - net) },
    ],
  })
  je({
    date: addDays(d, 3),
    memo: "MoMo transaction fees",
    reference: `MOMO-F-${pad(i + 1, 3)}`,
    source: "momo",
    branch: "osu",
    createdBy: "system",
    lines: [
      { accountCode: "6170", debit: r2(gross * 0.01), credit: 0 },
      { accountCode: "1030", debit: 0, credit: r2(gross * 0.01) },
    ],
  })
}

// Manual entries that show the review states.
je({
  date: "2026-08-14",
  memo: "Fuel accrual – August (duplicate)",
  reference: "ACC-0814",
  source: "manual",
  branch: "tak",
  status: "reversed",
  lines: [
    { accountCode: "6120", debit: 2400, credit: 0 },
    { accountCode: "2200", debit: 0, credit: 2400 },
  ],
})
const dup = journals[journals.length - 1]
const dupRev = je({
  date: "2026-08-16",
  memo: "Reversal: fuel accrual – August (duplicate)",
  reference: "ACC-0814",
  source: "manual",
  branch: "tak",
  createdBy: "kofi",
  reverses: dup.id,
  lines: dup.lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit })),
})
dup.reversedBy = dupRev.id

je({
  date: "2026-10-03",
  memo: "Reclassify Q3 freight costs to inventory",
  reference: "ADJ-Q3-01",
  source: "manual",
  branch: "adum",
  status: "awaiting_approval",
  createdBy: "efua",
  lines: [
    { accountCode: "1200", description: "Freight on stock still on hand", debit: 65000, credit: 0 },
    { accountCode: "5010", description: "Freight on stock still on hand", debit: 0, credit: 65000 },
  ],
})
je({
  date: "2026-10-04",
  memo: "Reclass van tyres from Office Supplies to Repairs",
  reference: "ADJ-1004",
  source: "manual",
  branch: "osu",
  status: "draft",
  createdBy: "efua",
  lines: [
    { accountCode: "6120", debit: 1850, credit: 0 },
    { accountCode: "6140", debit: 0, credit: 1850 },
  ],
})

/* ---------------- POS daily sales (pads volume to 354 journals) ---------------- */

const SWEEP_COUNT = 9

{
  const TARGET = 354
  const posCount = TARGET - journals.length - 1 - SWEEP_COUNT // payout and sweeps are added below
  const start = Date.parse("2026-01-03")
  const end = Date.parse("2026-10-03")
  for (let i = 0; i < posCount; i++) {
    const d = new Date(start + ((end - start) * i) / Math.max(1, posCount - 1)).toISOString().slice(0, 10)
    const branch: BranchId = i % 3 === 0 ? "osu" : i % 3 === 1 ? "adum" : "tak"
    const gross = between(4200, 11800, 10)
    const net = r2(gross / 1.2)
    je({
      date: d,
      memo: `POS daily sales – ${branch === "adum" ? "Adum" : branch === "osu" ? "Osu" : "Takoradi"}`,
      reference: `POS-${d.replace(/-/g, "").slice(2)}-${branch.toUpperCase()}`,
      source: "pos",
      branch,
      createdBy: "system",
      lines: [
        { accountCode: "1010", debit: gross, credit: 0 },
        { accountCode: "4000", debit: 0, credit: net },
        { accountCode: "2100", debit: 0, credit: r2(gross - net) },
      ],
    })
  }
}

// Month-end sweeps keep the MoMo wallet small, as the business would.
for (const eom of ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31", "2026-06-30", "2026-07-31", "2026-08-31", "2026-09-30"]) {
  const bal = journals
    .filter((j) => j.status === "posted" && j.date <= eom)
    .flatMap((j) => j.lines)
    .filter((l) => l.accountCode === "1030")
    .reduce((s, l) => s + l.debit - l.credit, 0)
  const sweep = r2(bal - 2500)
  if (sweep <= 0) continue
  je({
    date: eom,
    memo: "Sweep MoMo wallet to GCB",
    reference: `SWP-${eom.slice(5, 7)}`,
    source: "banking",
    branch: "osu",
    lines: [
      { accountCode: "1010", debit: sweep, credit: 0 },
      { accountCode: "1030", debit: 0, credit: sweep },
    ],
  })
}

// MoMo payout that drives the wallet below zero.
{
  const bal = journals
    .filter((j) => j.status === "posted" && j.date <= "2026-09-27")
    .flatMap((j) => j.lines)
    .filter((l) => l.accountCode === "1030")
    .reduce((s, l) => s + l.debit - l.credit, 0)
  const later = journals
    .filter((j) => j.status === "posted" && j.date > "2026-09-27")
    .flatMap((j) => j.lines)
    .filter((l) => l.accountCode === "1030")
    .reduce((s, l) => s + l.debit - l.credit, 0)
  const payout = r2(bal + later + 10080.1)
  je({
    date: "2026-09-27",
    memo: "MoMo payout – Tema Wholesale Depot (sent twice)",
    reference: "MOMO-P-118",
    source: "momo",
    branch: "osu",
    createdBy: "system",
    lines: [
      { accountCode: "5000", debit: payout, credit: 0 },
      { accountCode: "1030", debit: 0, credit: payout },
    ],
  })
}

/* ---------------- 2025 history from QuickBooks ---------------- */

// The business ran on QuickBooks before Tapanta. Its 2025 profit & loss
// arrives as one summary journal a month, about 10–20% below 2026, so
// "Same period last year" has something real to compare with. A closing
// entry on 31 Dec 2025 carries the year's profit into retained earnings, so
// 2026 balances and the balance sheet are exactly as before. Added after the
// POS padding, so 2026 still has 354 journals.
{
  const pl = new Map(ACCOUNTS.filter((a) => ["income", "cost_of_sales", "expense"].includes(a.type)).map((a) => [a.code, a]))
  const avg = new Map<string, number>()
  for (const j of journals) {
    if (j.status !== "posted" || j.date < "2026-01-01" || j.date > "2026-09-30") continue
    for (const l of j.lines) if (pl.has(l.accountCode)) avg.set(l.accountCode, (avg.get(l.accountCode) ?? 0) + (l.debit - l.credit) / 9)
  }
  // Keep only accounts with ordinary monthly activity.
  const skip = new Set(["4200", "9999"])
  const totals = new Map<string, number>()
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  for (let m = 1; m <= 12; m++) {
    const mm = pad(m, 2)
    const factor = 0.8 + rand() * 0.12
    const lines: JournalLine[] = []
    let net = 0
    for (const [code, a] of avg) {
      if (skip.has(code) || Math.abs(a) < 1) continue
      const amt = r2(Math.abs(a) * factor * (0.92 + rand() * 0.16))
      const isIncome = pl.get(code)!.type === "income"
      lines.push(isIncome ? { accountCode: code, debit: 0, credit: amt } : { accountCode: code, debit: amt, credit: 0 })
      net += isIncome ? amt : -amt
      totals.set(code, r2((totals.get(code) ?? 0) + (isIncome ? -amt : amt)))
    }
    lines.push(net >= 0 ? { accountCode: "3100", description: "Profit for the month, carried in summary", debit: r2(net), credit: 0 } : { accountCode: "3100", description: "Loss for the month, carried in summary", debit: 0, credit: r2(-net) })
    je({
      date: endOfMonthIso(2025, m),
      memo: `QuickBooks summary – ${MONTH_NAMES[m - 1]} 2025`,
      reference: `QB-2025-${mm}`,
      source: "quickbooks",
      branch: "adum",
      createdBy: "system",
      approvedBy: "kofi",
      lines,
    })
  }
  // Close the year: zero every 2025 income and expense account into retained earnings.
  const closeLines: JournalLine[] = []
  let profit = 0
  for (const [code, t] of totals) {
    // t is debit-minus-credit for the year; reverse it.
    closeLines.push(t > 0 ? { accountCode: code, debit: 0, credit: t } : { accountCode: code, debit: -t, credit: 0 })
    profit -= t
  }
  closeLines.push(profit >= 0 ? { accountCode: "3100", description: "2025 profit to retained earnings", debit: 0, credit: r2(profit) } : { accountCode: "3100", description: "2025 loss to retained earnings", debit: r2(-profit), credit: 0 })
  je({ date: "2025-12-31", memo: "Year-end close 2025", reference: "CLOSE-2025", source: "closing", branch: "adum", createdBy: "kofi", approvedBy: "ama", lines: closeLines })
}

function endOfMonthIso(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

/* ---------------- number journals by date ---------------- */

journals.sort((a, b) => a.date.localeCompare(b.date) || (a.source === "opening" ? -1 : 0))
// Keep the October loan instalment last, as in the current demo.
{
  const i = journals.findIndex((j) => j.reference === "STB-LN-10")
  const [loan] = journals.splice(i, 1)
  journals.push(loan)
}
// Numbered per year: JE-2025-0001… for the QuickBooks history, JE-2026-0001… for this year.
const idMap = new Map<string, string>()
const perYear = new Map<string, number>()
journals.forEach((j) => {
  const year = j.date.slice(0, 4)
  const n = (perYear.get(year) ?? 0) + 1
  perYear.set(year, n)
  const id = `JE-${year}-${pad(n)}`
  idMap.set(j.id, id)
  j.id = id
})
for (const j of journals) {
  if (j.reversedBy) j.reversedBy = idMap.get(j.reversedBy)
  if (j.reverses) j.reverses = idMap.get(j.reverses)
  if (j.status === "posted" || j.status === "reversed") j.approvedBy ??= j.createdBy === "system" ? undefined : j.createdBy === "efua" ? "kofi" : undefined
}
for (const d of [...INVOICES, ...BILLS]) if (d.journalId) d.journalId = idMap.get(d.journalId)
for (const p of PAYMENTS) p.journalId = idMap.get(p.journalId)!
for (const c of CREDIT_NOTES) if (c.journalId) c.journalId = idMap.get(c.journalId)

export const JOURNALS = journals

/* ---------------- GCB statement: 24 lines, 14 matched, 10 open ---------------- */

export const BANK_LINES: BankLine[] = []
{
  const gcbMoves = journals
    .filter((j) => j.status === "posted" && j.date >= "2026-09-14" && j.lines.some((l) => l.accountCode === "1010"))
    .slice(-14)
  gcbMoves.forEach((j, i) => {
    const amt = r2(j.lines.filter((l) => l.accountCode === "1010").reduce((s, l) => s + l.debit - l.credit, 0))
    BANK_LINES.push({
      id: `BL-${pad(i + 1, 3)}`,
      accountCode: "1010",
      date: j.date,
      description: j.memo.toUpperCase().slice(0, 38),
      reference: j.reference ?? "",
      amount: amt,
      status: "matched",
      matchedJournalId: j.id,
    })
  })
  const melcom = INVOICES.find((i) => i.contactId === "cus-melcom" && i.status === "posted" && i.dueDate === "2026-10-10")!
  const goil = BILLS.find((b) => b.contactId === "sup-goil" && b.dueDate === "2026-09-26")!
  const open: Omit<BankLine, "id" | "accountCode" | "status">[] = [
    { date: "2026-09-27", description: "SMS ALERT CHARGES", reference: "CHG-SEP", amount: -18, suggestion: { label: "Bank charges", confidence: "High" } },
    { date: "2026-09-29", description: "COT CHARGES SEP", reference: "COT-0929", amount: -45, suggestion: { label: "Bank charges", confidence: "High" } },
    { date: "2026-09-30", description: `TRF FRM MELCOM LTD ${melcom.id.replace("-", "")}`, reference: "GIP-883120", amount: melcom.total, suggestion: { docId: melcom.id, label: `Payment for ${melcom.id} – Melcom Ltd`, confidence: "High" } },
    { date: "2026-10-01", description: "INTEREST CREDIT SEP", reference: "INT-0930", amount: 312.4, suggestion: { label: "Interest received – bank", confidence: "Medium" } },
    { date: "2026-10-02", description: "MOMO TRF 0244XXX118 KOFI A.", reference: "MM-55102", amount: 1250, suggestion: { label: "No match found", confidence: "Low" } },
    { date: "2026-10-02", description: "ECG PREPAID TOKEN ADUM", reference: "ECG-77120", amount: -600, suggestion: { label: "Utilities", confidence: "Medium" } },
    { date: "2026-10-03", description: `CHQ 001245 GOIL PLC`, reference: "CHQ-001245", amount: -goil.total, suggestion: { docId: goil.id, label: `Payment for ${goil.id} – GOIL PLC`, confidence: "Medium" } },
    { date: "2026-10-04", description: "HUBTEL POS SETTLEMENT", reference: "HBT-20261004", amount: 4810, suggestion: { label: "POS daily sales – Osu", confidence: "Medium" } },
    { date: "2026-10-05", description: "CASH DEPOSIT ADUM BRANCH", reference: "DEP-1005", amount: 6500, suggestion: { label: "Transfer from Cash on hand – Adum", confidence: "Medium" } },
    { date: "2026-10-05", description: "TRF FRM UNKNOWN 0201XXX554", reference: "GIP-883977", amount: 0, suggestion: { label: "No match found", confidence: "Low" } },
  ]
  // The last line takes whatever makes the unmatched total GH₵ 25,186.50.
  const sum = open.slice(0, -1).reduce((s, l) => s + l.amount, 0)
  open[open.length - 1].amount = r2(25186.5 - sum)
  open.forEach((l, i) => BANK_LINES.push({ ...l, id: `BL-${pad(15 + i, 3)}`, accountCode: "1010", status: "open" }))
  BANK_LINES.sort((a, b) => a.date.localeCompare(b.date))
}

export const RECONCILED: Record<string, { lastReconciled: string; statementDate: string }> = {
  "1010": { lastReconciled: "2026-08-31", statementDate: "2026-10-05" },
  "1020": { lastReconciled: "2026-09-30", statementDate: "2026-09-30" },
  "1025": { lastReconciled: "2026-09-30", statementDate: "2026-09-30" },
  "1030": { lastReconciled: "2026-08-31", statementDate: "2026-10-05" },
  "1000": { lastReconciled: "2026-09-30", statementDate: "2026-09-30" },
}

/* ---------------- integrations ---------------- */

export const CONNECTIONS: Connection[] = [
  { id: "con-pos-adum", name: "POS – Adum", kind: "POS", connected: true, lastSync: "2026-10-05T08:40", health: "healthy", records30d: 31 },
  { id: "con-pos-osu", name: "POS – Osu", kind: "POS", connected: true, lastSync: "2026-10-05T08:42", health: "healthy", records30d: 30 },
  { id: "con-pos-tak", name: "POS – Takoradi", kind: "POS", connected: true, lastSync: "2026-10-03T21:10", health: "delayed", records30d: 27, note: "No sync for 36 hours. The till may be offline." },
  { id: "con-momo", name: "MTN MoMo merchant", kind: "Mobile money", connected: true, lastSync: "2026-10-05T07:55", health: "healthy", records30d: 64 },
  { id: "con-loans", name: "KT Loan system", kind: "Loans", connected: true, lastSync: "2026-10-05T06:00", health: "healthy", records30d: 12 },
  { id: "con-gcb", name: "GCB bank feed", kind: "Bank feed", connected: true, lastSync: "2026-10-05T06:15", health: "healthy", records30d: 24 },
  { id: "con-hubtel", name: "Hubtel payments", kind: "Payments", connected: true, lastSync: "2026-10-04T23:00", health: "error", records30d: 9, note: "Last import failed: 2 rows had no matching customer." },
  { id: "con-qb", name: "QuickBooks Online", kind: "Accounting", connected: true, lastSync: "2025-12-23T17:20", health: "error", records30d: 0, note: "Hasn't synced for 286 days. The access token has expired." },
  { id: "con-ecobank", name: "Ecobank bank feed", kind: "Bank feed", connected: false, records30d: 0 },
  { id: "con-paystack", name: "Paystack", kind: "Payments", connected: false, records30d: 0 },
  { id: "con-shopify", name: "Shopify", kind: "E-commerce", connected: false, records30d: 0 },
  { id: "con-sheets", name: "Google Sheets", kind: "Spreadsheet", connected: false, records30d: 0 },
]

export const IMPORTS: ImportBatch[] = [
  { id: "IMP-001", connectionId: "con-pos-adum", receivedAt: "2026-10-05T08:40", rows: 214, posted: 214, held: 0, failed: 0, status: "posted" },
  { id: "IMP-002", connectionId: "con-pos-osu", receivedAt: "2026-10-05T08:42", rows: 188, posted: 188, held: 0, failed: 0, status: "posted" },
  { id: "IMP-003", connectionId: "con-momo", receivedAt: "2026-10-05T07:55", rows: 96, posted: 91, held: 5, failed: 0, status: "needs_attention", issue: "5 collections have no matching customer. Held for review." },
  { id: "IMP-004", connectionId: "con-loans", receivedAt: "2026-10-05T06:00", rows: 12, posted: 12, held: 0, failed: 0, status: "posted" },
  { id: "IMP-005", connectionId: "con-gcb", receivedAt: "2026-10-05T06:15", rows: 24, posted: 24, held: 0, failed: 0, status: "posted" },
  { id: "IMP-006", connectionId: "con-hubtel", receivedAt: "2026-10-04T23:00", rows: 41, posted: 39, held: 0, failed: 2, status: "needs_attention", issue: "2 rows failed: customer code not found in mapping." },
  { id: "IMP-007", connectionId: "con-pos-tak", receivedAt: "2026-10-03T21:10", rows: 0, posted: 0, held: 0, failed: 0, status: "processing" },
]

/* ---------------- periods ---------------- */

export const PERIODS: Period[] = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"].map((m) => ({
  month: `2026-${m}`,
  label: new Date(Date.UTC(2026, Number(m) - 1, 1)).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
  status: Number(m) <= 8 ? "closed" : m === "09" ? "locked" : "open",
}))

/* ---------------- audit trail ---------------- */

export const AUDIT: AuditEvent[] = (() => {
  const out: AuditEvent[] = []
  const recent = journals.filter((j) => j.date >= "2026-09-20")
  let n = 0
  for (const j of recent) {
    const hh = 8 + (n % 9)
    const at = `${j.date}T${pad(hh, 2)}:${pad((n * 7) % 60, 2)}`
    const user = j.createdBy === "system" ? "system" : j.createdBy
    const verb = j.status === "draft" ? "Saved draft journal" : j.status === "awaiting_approval" ? "Submitted journal for approval" : "Posted journal"
    out.push({ id: `AU-${pad(++n, 5)}`, at, userId: user, action: `${verb} ${j.id}`, code: j.status === "posted" ? "journal.post" : j.status === "draft" ? "journal.draft" : "journal.submit", entity: j.id, summary: j.memo })
  }
  out.push({ id: `AU-${pad(++n, 5)}`, at: "2026-10-01T09:12", userId: "ama", action: "Locked period September 2026", code: "period.lock", entity: "2026-09", summary: "Period locked so no one can post into September while the close is reviewed." })
  out.push({ id: `AU-${pad(++n, 5)}`, at: "2026-10-02T11:30", userId: "kofi", action: "Changed approval threshold", code: "settings.update", entity: "controls", summary: "Journals over GH₵ 50,000.00 now need a second approver (was GH₵ 100,000.00)." })
  out.push({ id: `AU-${pad(++n, 5)}`, at: "2026-10-04T23:02", userId: "system", action: "Import IMP-006 finished with errors", code: "import.failed", entity: "IMP-006", summary: "Hubtel payments: 39 rows posted, 2 rows failed because the customer code was not in the mapping." })
  out.push({ id: `AU-${pad(++n, 5)}`, at: "2026-10-05T07:58", userId: "system", action: "Import IMP-003 held 5 rows", code: "import.held", entity: "IMP-003", summary: "MTN MoMo merchant: 5 collections held for review because no customer matched." })
  return out.sort((a, b) => b.at.localeCompare(a.at))
})()

export const ORG_PARTY = {
  name: "Kumasi Traders Ltd",
  email: "accounts@kumasitraders.com.gh",
  address: "Adum Road, PO Box 1182, Kumasi",
  taxId: "C0004417201",
}

export const ORG_EMAILS = ["accounts@kumasitraders.com.gh", "billing@kumasitraders.com.gh", "ama@kumasitraders.com.gh"]

export const COMPANIES: Company[] = [
  { id: "kt", short: "KT", ...ORG_PARTY, emails: ORG_EMAILS, phone: "+233 32 202 4411" },
  {
    id: "ktm",
    short: "KM",
    name: "KT Microfinance Ltd",
    email: "accounts@ktmicrofinance.com.gh",
    emails: ["accounts@ktmicrofinance.com.gh", "loans@ktmicrofinance.com.gh"],
    phone: "+233 32 202 7720",
    address: "Harper Road, Adum, Kumasi",
    taxId: "C0009923105",
  },
]

export const PAYOUT_METHODS: PayoutMethod[] = [
  { id: "pm-gcb", type: "bank", nickname: "GCB operating account", country: "GH", currency: "GHS", rail: "local", fields: { bankName: "GCB Bank", branch: "Adum", accountNumber: "1021 4471 0013", accountName: "Kumasi Traders Ltd" } },
  { id: "pm-momo", type: "momo", nickname: "MTN MoMo merchant", network: "MTN", number: "024 555 0118", name: "Kumasi Traders Ltd" },
  { id: "pm-ecobank-usd", type: "bank", nickname: "Ecobank USD", country: "GH", currency: "USD", rail: "swift", fields: { swift: "ECOCGHAC", accountNumber: "0441 7310 2266", accountName: "Kumasi Traders Ltd" } },
]

export const EXCHANGE_RATES = [
  { currency: "USD" as Currency, rate: RATES.USD, updated: "2026-10-05", source: "Bank of Ghana" },
  { currency: "EUR" as Currency, rate: RATES.EUR, updated: "2026-10-05", source: "Bank of Ghana" },
  { currency: "GBP" as Currency, rate: RATES.GBP, updated: "2026-10-05", source: "Bank of Ghana" },
]
