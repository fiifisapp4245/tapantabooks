import type { Currency } from "./constants"

export type ISODate = string // "2026-10-05"
export type BranchId = "adum" | "osu" | "tak"

export type AccountType = "asset" | "liability" | "equity" | "income" | "cost_of_sales" | "expense"

export type Account = {
  code: string
  name: string
  type: AccountType
  /** Report category, e.g. "Cash & bank", "Current liabilities". */
  category: string
  description: string
  normal: "debit" | "credit"
  currency: Currency
  active: boolean
  parent?: string
  /** Bank, MoMo and cash accounts. */
  bank?: { kind: "bank" | "momo" | "cash"; institution: string; masked: string }
}

export type TaxCode = "GH-STD" | "ZERO" | "EXEMPT"
export const TAX_RATES: Record<TaxCode, number> = { "GH-STD": 0.2, ZERO: 0, EXEMPT: 0 }
export const TAX_LABELS: Record<TaxCode, string> = {
  "GH-STD": "Standard VAT 20%",
  ZERO: "Zero-rated 0%",
  EXEMPT: "Exempt",
}

export type Contact = {
  id: string
  kind: "customer" | "supplier"
  name: string
  email: string
  phone: string
  city: string
  tin: string
  termsDays: number
  currency: Currency
  /** Customers abroad: invoices are zero-rated. */
  overseas?: boolean
}

export type DocLine = {
  description: string
  qty: number
  unitPrice: number
  discount: number // fraction, 0.05 = 5%
  taxCode: TaxCode
  accountCode: string
}

export type DocStatus = "draft" | "awaiting_approval" | "posted" | "void"

type DocBase = {
  id: string
  contactId: string
  issueDate: ISODate
  dueDate: ISODate
  currency: Currency
  rate: number
  branch: BranchId
  reference?: string
  lines: DocLine[]
  status: DocStatus
  subtotal: number
  tax: number
  total: number
  journalId?: string
  createdBy: string
  remindersSent?: ISODate[]
}

/** A party on an invoice, as printed. Customer details can differ from the contact record. */
export type Party = {
  name: string
  email: string
  address?: string
  taxId?: string
  logoUrl?: string
}

export type Invoice = DocBase & {
  kind: "invoice"
  deliveryRoute: "Local" | "Export (overseas)"
  /** Set by the step-by-step editor. Older seeded invoices fall back to org and contact details. */
  from?: Party
  to?: Party
  note?: string
  /** Whole-invoice discount, in major units. Spread across lines as `DocLine.discount` for posting. */
  discountAmount?: number
  payoutMethodIds?: string[]
}

/** A company you invoice from (a legal entity in this workspace). */
export type Company = {
  id: string
  name: string
  /** Two-letter badge used in the company switcher. */
  short: string
  email: string
  /** Verified sender addresses for invoices. */
  emails: string[]
  phone?: string
  address?: string
  taxId?: string
  logoUrl?: string
}

export type PayoutMethod =
  | { id: string; type: "bank"; nickname?: string; country: string; currency: Currency; rail: "swift" | "iban" | "local"; fields: Record<string, string> }
  | { id: string; type: "momo"; nickname?: string; network: string; number: string; name: string }
  | { id: string; type: "crypto"; name: string; address: string; network?: string }
export type Bill = DocBase & { kind: "bill" }

/** Money in (from a customer, or any other source) and money out. */
export type Payment = {
  id: string
  direction: "in" | "out"
  date: ISODate
  contactId?: string
  /** Document it settles, if any. */
  docId?: string
  accountCode: string // bank / cash account
  /** Income or expense account, when there's no document. */
  categoryCode?: string
  amount: number // in document currency
  currency: Currency
  rate: number
  method: "Bank transfer" | "MTN MoMo" | "Cash" | "Cheque"
  branch: BranchId
  memo: string
  journalId: string
}

export type CreditNote = {
  id: string
  kind: "credit_note" | "supplier_credit"
  contactId: string
  date: ISODate
  docId?: string
  reason: string
  amount: number
  tax: number
  total: number
  applied: number
  status: "open" | "applied" | "void"
  branch: BranchId
  journalId?: string
}

export type JournalSource =
  | "manual"
  | "sales"
  | "purchases"
  | "banking"
  | "pos"
  | "momo"
  | "loans"
  | "payroll"
  | "quickbooks"
  | "revaluation"
  | "opening"
  /** Year-end entry that carries a year's profit into retained earnings. */
  | "closing"

export type JournalStatus = "draft" | "awaiting_approval" | "posted" | "reversed"

export type JournalLine = {
  accountCode: string
  description?: string
  debit: number
  credit: number
  costCentre?: string
}

export type Journal = {
  id: string
  date: ISODate
  memo: string
  reference?: string
  source: JournalSource
  sourceDocId?: string
  status: JournalStatus
  branch: BranchId
  lines: JournalLine[]
  createdBy: string
  createdAt: ISODate
  approvedBy?: string
  reversedBy?: string
  reverses?: string
}

export type BankLine = {
  id: string
  accountCode: string
  date: ISODate
  description: string
  reference: string
  amount: number // + in, − out
  status: "matched" | "open" | "excluded"
  suggestion?: { journalId?: string; docId?: string; label: string; confidence: "High" | "Medium" | "Low" }
  matchedJournalId?: string
}

export type Connection = {
  id: string
  name: string
  kind: "POS" | "Mobile money" | "Loans" | "Accounting" | "Bank feed" | "Payments" | "E-commerce" | "Spreadsheet"
  connected: boolean
  lastSync?: string // ISO datetime
  health?: "healthy" | "delayed" | "error"
  records30d: number
  note?: string
}

export type ImportBatch = {
  id: string
  connectionId: string
  receivedAt: string
  rows: number
  posted: number
  held: number
  failed: number
  status: "posted" | "needs_attention" | "processing"
  issue?: string
}

export type AuditEvent = {
  id: string
  at: string
  userId: string
  action: string
  code: string
  entity: string
  summary: string
}

export type Period = { month: string; label: string; status: "open" | "locked" | "closed" }
