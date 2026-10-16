import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarCheck,
  ChartColumn,
  FileClock,
  FileMinus,
  FileText,
  FolderInput,
  GitCompareArrows,
  History,
  House,
  Landmark,
  ListTree,
  NotebookPen,
  Plug,
  Receipt,
  ReceiptText,
  Scale,
  Settings,
  Shuffle,
  TrendingUp,
  Truck,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react"

/** Keys the nav badges are read from. Each is computed once in /lib/selectors. */
export type BadgeKey =
  | "invoicesNeedAttention"
  | "billsDueSoon"
  | "reconcileOpen"
  | "journalsAwaitingApproval"
  | "importsNeedAttention"

export type NavItem = {
  /** Page title. The sidebar label is the same string. */
  label: string
  href: string
  icon: LucideIcon
  /** One line under the page title. */
  description: string
  /** The accountant's word for it, shown muted or in a tooltip. */
  term?: string
  badge?: BadgeKey
  /** Group name used in ⌘K. */
  group: string
}

/* ---------------- every page ---------------- */

const p = (item: NavItem) => item

export const PAGES = {
  home: p({ label: "Home", href: "/", icon: House, group: "Go to", description: "How the business is doing and what needs doing today." }),

  invoices: p({ label: "Invoices", href: "/invoices", icon: FileText, group: "Money in", description: "Bill customers and track what they owe you.", badge: "invoicesNeedAttention" }),
  creditNotes: p({ label: "Credit notes", href: "/credit-notes", icon: FileMinus, group: "Money in", description: "Amounts you've given back or written off for customers." }),
  paymentsReceived: p({ label: "Payments received", href: "/payments-received", icon: ArrowDownLeft, group: "Money in", description: "Money customers have paid you.", term: "Receipts" }),
  customers: p({ label: "Customers", href: "/customers", icon: Users, group: "Money in", description: "Who you sell to, what they owe, and their statements." }),

  bills: p({ label: "Bills", href: "/bills", icon: ReceiptText, group: "Money out", description: "Supplier bills you need to pay.", badge: "billsDueSoon" }),
  supplierCredits: p({ label: "Supplier credits", href: "/supplier-credits", icon: Receipt, group: "Money out", description: "Credits suppliers owe back to you." }),
  paymentsMade: p({ label: "Payments made", href: "/payments-made", icon: ArrowUpRight, group: "Money out", description: "Money you've paid to suppliers.", term: "Supplier payments" }),
  suppliers: p({ label: "Suppliers", href: "/suppliers", icon: Truck, group: "Money out", description: "Who you buy from, what you owe, and their statements." }),

  bank: p({ label: "Bank & cash", href: "/bank", icon: Landmark, group: "Banking", description: "Every bank account, mobile money wallet and cash box." }),
  reconcile: p({ label: "Reconcile", href: "/reconcile", icon: GitCompareArrows, group: "Banking", description: "Match your bank statement to your books.", term: "Bank reconciliation", badge: "reconcileOpen" }),

  reports: p({ label: "Reports", href: "/reports", icon: ChartColumn, group: "Reports", description: "Every report, grouped by the question it answers." }),
  profitAndLoss: p({ label: "Profit & loss", href: "/reports/profit-and-loss", icon: TrendingUp, group: "Reports", description: "What you earned, what you spent, and what's left.", term: "Statement of profit or loss" }),
  balanceSheet: p({ label: "Balance sheet", href: "/reports/balance-sheet", icon: Scale, group: "Reports", description: "What the business owns and owes on a date.", term: "Statement of financial position" }),
  cashFlow: p({ label: "Cash flow", href: "/reports/cash-flow", icon: Waves, group: "Reports", description: "Where cash came from and where it went.", term: "Statement of cash flows" }),
  whoOwesYou: p({ label: "Who owes you", href: "/reports/who-owes-you", icon: FileClock, group: "Reports", description: "Customer balances by how long they've been due.", term: "Accounts receivable ageing" }),
  whatYouOwe: p({ label: "What you owe", href: "/reports/what-you-owe", icon: FileClock, group: "Reports", description: "Supplier balances by how long they've been due.", term: "Accounts payable ageing" }),
  vat: p({ label: "VAT & taxes", href: "/reports/vat-and-taxes", icon: Building2, group: "Reports", description: "VAT, withholding tax and SSNIT due for the period." }),

  journals: p({ label: "Journals", href: "/journals", icon: NotebookPen, group: "Accounting", description: "Every entry in the books, and the ones waiting for approval.", term: "Journal entries", badge: "journalsAwaitingApproval" }),
  generalLedger: p({ label: "General ledger", href: "/general-ledger", icon: BookOpen, group: "Accounting", description: "Every movement on an account, with a running balance." }),
  chartOfAccounts: p({ label: "Chart of accounts", href: "/chart-of-accounts", icon: ListTree, group: "Accounting", description: "The accounts your money is sorted into." }),
  periodClose: p({ label: "Period close", href: "/period-close", icon: CalendarCheck, group: "Accounting", description: "Close the month, revalue currencies and set starting balances." }),

  settings: p({ label: "Settings", href: "/settings", icon: Settings, group: "Settings", description: "Your organisation, controls, currencies and team." }),
  companies: p({ label: "Companies", href: "/settings/companies", icon: Building2, group: "Settings", description: "The companies you invoice from, with their details and sender emails." }),
  connections: p({ label: "Connections", href: "/settings/connections", icon: Plug, group: "Settings", description: "The systems that send transactions into your books.", term: "Data sources" }),
  imports: p({ label: "Imports", href: "/settings/imports", icon: FolderInput, group: "Settings", description: "Batches of transactions brought in from your connections.", badge: "importsNeedAttention" }),
  mapping: p({ label: "Mapping & rules", href: "/settings/mapping", icon: Shuffle, group: "Settings", description: "How incoming data becomes invoices, bills and journals." }),
  auditTrail: p({ label: "Audit trail", href: "/settings/audit-trail", icon: History, group: "Settings", description: "Who changed what, and when." }),
}

export const ALL_PAGES: NavItem[] = Object.values(PAGES)

/* ---------------- sidebar ---------------- */

/** A sidebar entry. It stays highlighted on every page listed in `covers`. */
export type SidebarItem = NavItem & { covers?: string[]; badges?: BadgeKey[] }
export type NavGroup = { label?: string; items: SidebarItem[] }

/**
 * 15 destinations, ordered by how often people use them. Pages that left the
 * sidebar are one click away as tabs on their parent page (see SECTIONS) and
 * always findable with ⌘K.
 */
export const NAV: NavGroup[] = [
  { items: [PAGES.home] },
  {
    label: "Money in",
    items: [{ ...PAGES.invoices, covers: ["/credit-notes", "/invoices/"] }, PAGES.paymentsReceived, PAGES.customers],
  },
  {
    label: "Money out",
    items: [{ ...PAGES.bills, covers: ["/supplier-credits"] }, PAGES.paymentsMade, PAGES.suppliers],
  },
  { label: "Banking", items: [PAGES.bank, PAGES.reconcile] },
  { label: "Reports", items: [{ ...PAGES.reports, covers: ["/reports/"] }] },
  { label: "Accounting", items: [PAGES.journals, PAGES.generalLedger, PAGES.chartOfAccounts, PAGES.periodClose] },
]

/** Pinned to the foot of the sidebar. Its badge counts what needs attention inside Settings. */
export const NAV_FOOTER: SidebarItem = { ...PAGES.settings, covers: ["/settings/"], badges: ["importsNeedAttention"] }

export const SIDEBAR_ITEMS: SidebarItem[] = [...NAV.flatMap((g) => g.items), NAV_FOOTER]

/* ---------------- sections: tabs that join related pages ---------------- */

export type Section = { id: string; label: string; pages: NavItem[] }

export const SECTIONS: Section[] = [
  { id: "invoices", label: "Invoices", pages: [PAGES.invoices, PAGES.creditNotes] },
  { id: "bills", label: "Bills", pages: [PAGES.bills, PAGES.supplierCredits] },
  {
    id: "reports",
    label: "Reports",
    pages: [{ ...PAGES.reports, label: "All reports" }, PAGES.profitAndLoss, PAGES.balanceSheet, PAGES.cashFlow, PAGES.whoOwesYou, PAGES.whatYouOwe, PAGES.vat],
  },
  {
    id: "settings",
    label: "Settings",
    pages: [{ ...PAGES.settings, label: "General" }, PAGES.companies, PAGES.connections, PAGES.imports, PAGES.mapping, PAGES.auditTrail],
  },
]

export function findSection(pathname: string) {
  return SECTIONS.find((s) => s.pages.some((p) => p.href === pathname))
}

/* ---------------- lookups ---------------- */

/** The page for a path: exact match first, then the longest prefix. */
export function findNavItem(pathname: string): NavItem | undefined {
  const exact = ALL_PAGES.find((i) => i.href === pathname)
  if (exact) return exact
  return ALL_PAGES.filter((i) => i.href !== "/" && pathname.startsWith(i.href + "/")).sort((a, b) => b.href.length - a.href.length)[0]
}

/** Which sidebar entry should be highlighted for a path. */
export function activeSidebarHref(pathname: string): string | undefined {
  const exact = SIDEBAR_ITEMS.find((i) => i.href === pathname)
  if (exact) return exact.href
  return SIDEBAR_ITEMS.find((i) => i.covers?.some((c) => (c.endsWith("/") ? pathname.startsWith(c) : pathname === c || pathname.startsWith(c + "/"))))?.href
}

export function navGroupOf(item: NavItem): string {
  return item.group
}
