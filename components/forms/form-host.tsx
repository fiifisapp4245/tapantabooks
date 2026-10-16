"use client"

import { usePrefs } from "@/lib/store"
import { MoneyDialog, type MoneyPrefill } from "./money-dialog"
import { ContactDialog } from "./contact-dialog"
import { InvoiceEditorHost } from "@/components/invoices/invoice-editor"
import { BillDialog } from "@/components/bills/bill-dialog"
import { JournalDialog } from "@/components/journals/journal-dialog"

/**
 * Every create form, mounted once. + New, ⌘K and page buttons open them with
 * usePrefs.getState().openForm(kind, prefill).
 */
export function FormHost() {
  const form = usePrefs((s) => s.form)
  const close = usePrefs((s) => s.closeForm)
  const kind = form?.kind
  const prefill = form?.prefill
  // A new key per open gives every form fresh state.
  const k = form?.nonce ?? 0
  return (
    <>
      <InvoiceEditorHost />
      <BillDialog key={`bill-${k}`} open={kind === "bill"} onClose={close} prefill={prefill} />
      <JournalDialog key={`je-${k}`} open={kind === "journal"} onClose={close} prefill={prefill} />
      <MoneyDialog
        key={`money-${k}`}
        open={kind === "money-in" || kind === "money-out"}
        onClose={close}
        prefill={{ direction: kind === "money-out" ? "out" : "in", ...(prefill as MoneyPrefill) }}
      />
      <ContactDialog key={`cus-${k}`} open={kind === "customer"} kind="customer" onClose={close} />
      <ContactDialog key={`sup-${k}`} open={kind === "supplier"} kind="supplier" onClose={close} />
    </>
  )
}
