"use client"

import { create } from "zustand"
import { z } from "zod"
import type { Currency } from "@/lib/constants"
import { addDays, TODAY } from "@/lib/dates"
import { COMPANIES, docTotals, PRODUCTS } from "@/lib/mock/seed"
import type { BranchId, Company, DocLine, Invoice, Party, TaxCode } from "@/lib/types"
import type { DraftInvoiceInput, LedgerState } from "@/lib/ledger"

/* ---------------- model ---------------- */

/** Integer minor units (pesewas, cents). Never a float. */
export type Money = number

export type LineItem = { id: string; name: string; qty: number; unitPrice: Money }

export type InvoiceDraft = {
  /** Set once the draft exists in the books. */
  id?: string
  number: string
  issueDate: string
  dueDate: string
  currency: Currency
  from: Party & { companyId?: string }
  to: Party & { contactId?: string }
  items: LineItem[]
  note: string
  discount: Money
  payoutMethodIds: string[]
  /* Accounting extras, tucked under "Additional details". */
  taxCode: TaxCode
  branch: BranchId
  revenueAccount: string
}

export const toMinor = (major: number) => Math.round(major * 100)
export const toMajor = (minor: Money) => minor / 100

let lineSeq = 0
export const newLine = (): LineItem => ({ id: `line-${++lineSeq}`, name: "", qty: 1, unitPrice: 0 })

/** The "From" party, as printed, taken from a company record. */
export const partyFromCompany = (c: Company): InvoiceDraft["from"] => ({ companyId: c.id, name: c.name, email: c.email, address: c.address, taxId: c.taxId, logoUrl: c.logoUrl })

export function emptyDraft(number: string, company: Company = COMPANIES[0]): InvoiceDraft {
  return {
    number,
    issueDate: TODAY,
    dueDate: addDays(TODAY, 14),
    currency: "GHS",
    from: partyFromCompany(company),
    to: { name: "", email: "" },
    items: [newLine()],
    note: "",
    discount: 0,
    payoutMethodIds: ["pm-gcb", "pm-momo"],
    taxCode: "GH-STD",
    branch: "adum",
    revenueAccount: "4000",
  }
}

/** Open an existing draft invoice in the editor. */
export function draftFromInvoice(inv: Invoice, s: LedgerState): InvoiceDraft {
  const contact = s.contacts.find((c) => c.id === inv.contactId)
  const gross = inv.lines.reduce((t, l) => t + l.qty * l.unitPrice, 0)
  return {
    id: inv.id,
    number: inv.id,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    currency: inv.currency,
    from: inv.from ?? partyFromCompany(COMPANIES[0]),
    to: { ...(inv.to ?? { name: contact?.name ?? "", email: contact?.email ?? "", taxId: contact?.tin, address: contact?.city }), contactId: inv.contactId },
    items: inv.lines.map((l) => ({ ...newLine(), name: l.description, qty: l.qty, unitPrice: toMinor(l.unitPrice) })),
    note: inv.note ?? "",
    discount: toMinor(inv.discountAmount ?? r2(gross - inv.subtotal)),
    payoutMethodIds: inv.payoutMethodIds ?? ["pm-gcb", "pm-momo"],
    taxCode: inv.lines[0]?.taxCode ?? "GH-STD",
    branch: inv.branch,
    revenueAccount: inv.lines[0]?.accountCode ?? "4000",
  }
}

const r2 = (n: number) => Math.round(n * 100) / 100

/* ---------------- maths ---------------- */

/** Lines as the books see them: the whole-invoice discount spread as a fraction per line. */
export function docLines(d: InvoiceDraft): DocLine[] {
  const subtotal = d.items.reduce((t, i) => t + Math.round(i.qty * i.unitPrice), 0)
  const discount = Math.min(d.discount, subtotal)
  const fraction = subtotal > 0 ? discount / subtotal : 0
  return d.items
    .filter((i) => i.name.trim())
    .map((i) => {
      const product = PRODUCTS.find((p) => p.name === i.name)
      return {
        description: i.name.trim(),
        qty: i.qty,
        unitPrice: toMajor(i.unitPrice),
        discount: fraction,
        taxCode: d.taxCode,
        accountCode: product?.accountCode === "4010" ? "4010" : d.revenueAccount,
      }
    })
}

/** Totals in minor units. Total never drops below zero. */
export function draftTotals(d: InvoiceDraft) {
  const amounts = d.items.map((i) => Math.round(i.qty * i.unitPrice))
  const subtotal = amounts.reduce((t, a) => t + a, 0)
  const discount = Math.min(d.discount, subtotal)
  const t = docTotals(docLines(d))
  return { amounts, subtotal, discount, tax: toMinor(t.tax), total: Math.max(0, toMinor(t.total)) }
}

export function toLedgerInput(d: InvoiceDraft, contactId: string): DraftInvoiceInput {
  return {
    id: d.id,
    number: d.number,
    contactId,
    issueDate: d.issueDate,
    dueDate: d.dueDate,
    currency: d.currency,
    branch: d.branch,
    lines: docLines(d),
    from: d.from,
    to: { name: d.to.name, email: d.to.email, address: d.to.address, taxId: d.to.taxId, logoUrl: d.to.logoUrl },
    note: d.note || undefined,
    discountAmount: toMajor(d.discount),
    payoutMethodIds: d.payoutMethodIds,
  }
}

/* ---------------- steps & validation ---------------- */

export type StepId = "company" | "customer" | "items" | "payment" | "terms"

export const STEPS: { id: StepId; pill: string; heading: string }[] = [
  { id: "company", pill: "Company", heading: "Company" },
  { id: "customer", pill: "Customer", heading: "Who's this invoice for?" },
  { id: "items", pill: "Items", heading: "Details" },
  { id: "payment", pill: "Payment instructions", heading: "Payment details" },
  { id: "terms", pill: "Terms", heading: "Terms" },
]

const email = z.string().trim().min(1, "Enter an email").email("Check the email address")

const SCHEMAS: Record<StepId, z.ZodType<unknown>> = {
  company: z.object({ from: z.object({ name: z.string().trim().min(1, "Enter your company name"), email }) }),
  customer: z.object({ to: z.object({ name: z.string().trim().min(1, "Choose or add a customer"), email }) }),
  items: z.object({
    items: z
      .array(
        z.object({
          name: z.string(),
          qty: z.number(),
          unitPrice: z.number(),
        })
      )
      .superRefine((items, ctx) => {
        const valid = items.filter((i) => i.name.trim() && i.qty > 0 && i.unitPrice >= 0)
        items.forEach((i, idx) => {
          const touched = i.name.trim() || i.unitPrice > 0
          if (!touched && valid.length > 0) return
          if (!i.name.trim()) ctx.addIssue({ code: "custom", path: [idx, "name"], message: "Name the item" })
          if (!(i.qty > 0)) ctx.addIssue({ code: "custom", path: [idx, "qty"], message: "Qty must be more than 0" })
          if (i.unitPrice < 0) ctx.addIssue({ code: "custom", path: [idx, "unitPrice"], message: "Price can't be negative" })
        })
        if (valid.length === 0 && items.every((i) => !i.name.trim())) ctx.addIssue({ code: "custom", path: [0, "name"], message: "Add at least one item" })
      }),
  }),
  payment: z.object({ payoutMethodIds: z.array(z.string()).min(1, "Please select at least one payment method") }),
  terms: z
    .object({
      number: z.string().trim().min(1, "Enter an invoice number"),
      issueDate: z.string().min(1, "Choose an issue date"),
      dueDate: z.string().min(1, "Choose a due date"),
    })
    .refine((v) => v.dueDate >= v.issueDate, { path: ["dueDate"], message: "Due date can't be before the issue date" }),
}

/** Field id → message. Field ids match the inputs' `id`, so the first one can be focused. */
export type StepErrors = Record<string, string>

export function validateStep(step: StepId, d: InvoiceDraft, taken: (n: string) => boolean): StepErrors {
  const res = SCHEMAS[step].safeParse(d)
  const errors: StepErrors = {}
  if (!res.success) {
    for (const issue of res.error.issues) {
      const key = fieldId(step, issue.path)
      errors[key] ??= issue.message
    }
  }
  if (step === "terms" && d.number.trim() && d.number !== d.id && taken(d.number.trim())) errors["inv-number"] = "That number is already used"
  return errors
}

function fieldId(step: StepId, path: PropertyKey[]): string {
  if (step === "company") return path[1] === "email" ? "inv-from-email" : "inv-from-name"
  if (step === "customer") return path[1] === "email" ? "inv-to-email" : "inv-to-name"
  if (step === "items") return `inv-item-${String(path[1])}-${String(path[2])}`
  if (step === "payment") return "payment"
  if (step === "terms") return path[0] === "number" ? "inv-number" : path[0] === "issueDate" ? "inv-issue" : "inv-due"
  return String(path.join("."))
}

/* ---------------- the one draft store ---------------- */

type DraftStore = {
  draft: InvoiceDraft
  errors: StepErrors
  /** Bumped on every edit; autosave compares it with the last saved version. */
  version: number
  savedVersion: number
  load: (d: InvoiceDraft) => void
  update: (fn: (d: InvoiceDraft) => InvoiceDraft) => void
  setErrors: (e: StepErrors) => void
  markSaved: (id: string, version: number) => void
}

/** The form and the preview both read from here, so the preview updates on every keystroke. */
export const useDraft = create<DraftStore>((set) => ({
  draft: emptyDraft("INV-0000"),
  errors: {},
  version: 0,
  savedVersion: 0,
  load: (draft) => set({ draft, errors: {}, version: 0, savedVersion: 0 }),
  update: (fn) => set((s) => ({ draft: fn(s.draft), version: s.version + 1 })),
  setErrors: (errors) => set({ errors }),
  markSaved: (id, version) => set((s) => ({ draft: { ...s.draft, id }, savedVersion: Math.max(s.savedVersion, version) })),
}))
