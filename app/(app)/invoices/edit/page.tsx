import { InvoiceEditorPage } from "@/components/invoices/invoice-editor"

/** Editing a draft: /invoices/edit?id=INV-0043&step=items */
export default function Page() {
  return <InvoiceEditorPage mode="edit" />
}
