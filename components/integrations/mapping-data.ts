/**
 * How incoming data becomes documents and journals. Each mapping leads with
 * a plain-language summary; the field paths are the technical detail.
 */
export type FieldMapping = {
  id: string
  connectionIds: string[]
  /** "POS sale" */
  from: string
  /** "Sales invoice" */
  to: string
  description: string
  fields: { source: string; target: string; note?: string }[]
}

export const MAPPINGS: FieldMapping[] = [
  {
    id: "map-pos",
    connectionIds: ["con-pos-adum", "con-pos-osu", "con-pos-tak"],
    from: "POS sale",
    to: "Sales invoice",
    description: "Each till receipt becomes a paid sales invoice for the branch that rang it up.",
    fields: [
      { source: "payload.receipt_no", target: "invoice.reference" },
      { source: "payload.branch_code", target: "invoice.branch", note: "ADM → Adum, OSU → Osu, TKD → Takoradi" },
      { source: "payload.items[].sku", target: "line.product_code" },
      { source: "payload.items[].qty", target: "line.qty" },
      { source: "payload.items[].unit_price", target: "line.unit_price" },
      { source: "payload.items[].vat_code", target: "line.tax_code", note: "S → GH-STD, Z → ZERO, E → EXEMPT" },
      { source: "payload.tender", target: "payment.account_code", note: "cash → 1000, momo → 1030, card → 1010" },
    ],
  },
  {
    id: "map-momo",
    connectionIds: ["con-momo"],
    from: "MoMo collection",
    to: "Money in to MTN MoMo wallet",
    description: "Customer mobile money payments land in the MoMo wallet, matched to the customer by phone number.",
    fields: [
      { source: "payload.financialTransactionId", target: "payment.reference" },
      { source: "payload.amount", target: "payment.amount" },
      { source: "payload.payer.partyId", target: "contact.phone", note: "Used to find the customer" },
      { source: "payload.payerMessage", target: "payment.memo" },
      { source: "payload.createdAt", target: "payment.date" },
    ],
  },
  {
    id: "map-momo-fees",
    connectionIds: ["con-momo"],
    from: "MoMo fee",
    to: "Money out from MTN MoMo wallet to MoMo charges",
    description: "Transaction fees the network deducts from the wallet.",
    fields: [
      { source: "payload.fee.amount", target: "payment.amount" },
      { source: "payload.fee.type", target: "payment.memo" },
    ],
  },
  {
    id: "map-loans",
    connectionIds: ["con-loans"],
    from: "Loan repayment",
    to: "Journal: Dr Loan / Cr Bank",
    description: "Borrowers' repayments from the KT loan system are split into principal and interest in one journal.",
    fields: [
      { source: "payload.loan_id", target: "journal.reference" },
      { source: "payload.value_date", target: "journal.date" },
      { source: "payload.amount_paid", target: "line[Dr GCB Bank – Current].debit" },
      { source: "payload.principal", target: "line[Cr Loan – principal].credit" },
      { source: "payload.interest", target: "line[Cr Loan interest income].credit" },
    ],
  },
  {
    id: "map-bank",
    connectionIds: ["con-gcb"],
    from: "Bank statement line",
    to: "Line to reconcile on GCB Bank – Current",
    description: "Statement lines wait in Reconcile until they're matched to something in your books.",
    fields: [
      { source: "stmt.txn_date", target: "bank_line.date" },
      { source: "stmt.narration", target: "bank_line.description" },
      { source: "stmt.ref_no", target: "bank_line.reference" },
      { source: "stmt.credit − stmt.debit", target: "bank_line.amount" },
    ],
  },
  {
    id: "map-hubtel",
    connectionIds: ["con-hubtel"],
    from: "Hubtel payment",
    to: "Payment received against an invoice",
    description: "Online card and MoMo payments, matched to the customer's open invoice.",
    fields: [
      { source: "Data.CustomerCode", target: "contact.code", note: "Must exist in Customers, or the row fails" },
      { source: "Data.ClientReference", target: "payment.doc_id", note: "The invoice number, e.g. INV-0042" },
      { source: "Data.Amount", target: "payment.amount" },
      { source: "Data.Charges", target: "line[Dr MoMo charges].debit" },
    ],
  },
  {
    id: "map-qb",
    connectionIds: ["con-qb"],
    from: "QuickBooks bill",
    to: "Bill",
    description: "Bills entered in the old QuickBooks file come across as bills to pay.",
    fields: [
      { source: "Bill.VendorRef.value", target: "bill.contact_id" },
      { source: "Bill.TxnDate", target: "bill.issue_date" },
      { source: "Bill.DueDate", target: "bill.due_date" },
      { source: "Bill.Line[].AccountBasedExpenseLineDetail.AccountRef", target: "line.account_code" },
      { source: "Bill.Line[].Amount", target: "line.unit_price" },
    ],
  },
]

export type AccountingRule = { id: string; when: string; then: string; on: boolean }

export const RULES: AccountingRule[] = [
  { id: "rule-pos", when: "When a POS sale arrives", then: "post to Sales – goods with Standard VAT 20%", on: true },
  { id: "rule-pos-services", when: "When a POS line is a delivery charge", then: "post to Sales – services with Standard VAT 20%", on: true },
  { id: "rule-momo-match", when: "When a MoMo collection has no matching customer", then: "hold it for review instead of posting", on: true },
  { id: "rule-momo-fee", when: "When MTN takes a MoMo fee", then: "post to MoMo charges with no VAT", on: true },
  { id: "rule-loan", when: "When a loan repayment arrives", then: "credit the principal to the loan and the interest to Loan interest income", on: true },
  { id: "rule-overseas", when: "When the customer is overseas", then: "use Zero-rated 0% VAT", on: true },
  { id: "rule-threshold", when: "When an imported journal is over the approval threshold", then: "send it for approval instead of posting", on: true },
  { id: "rule-bank-charges", when: "When a bank statement line says “COT” or “SMS alert”", then: "suggest Bank charges in Reconcile", on: true },
  { id: "rule-new-customer", when: "When a payment's customer code isn't found", then: "create the customer automatically", on: false },
]
