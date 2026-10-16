import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  NotebookPen,
  ReceiptText,
  Truck,
  UserPlus,
  type LucideIcon,
} from "lucide-react"

export type NewActionId = "invoice" | "bill" | "money-in" | "money-out" | "journal" | "customer" | "supplier"

/** The + New menu and the command palette share this list. */
export const NEW_ACTIONS: { id: NewActionId; label: string; icon: LucideIcon; keywords?: string }[] = [
  { id: "invoice", label: "Invoice", icon: FileText, keywords: "sales bill customer" },
  { id: "bill", label: "Bill", icon: ReceiptText, keywords: "supplier purchase" },
  { id: "money-in", label: "Money in", icon: ArrowDownLeft, keywords: "receipt record income" },
  { id: "money-out", label: "Money out", icon: ArrowUpRight, keywords: "payment record expense" },
  { id: "journal", label: "Journal entry", icon: NotebookPen, keywords: "je debit credit" },
  { id: "customer", label: "Customer", icon: UserPlus, keywords: "contact client" },
  { id: "supplier", label: "Supplier", icon: Truck, keywords: "contact vendor" },
]
