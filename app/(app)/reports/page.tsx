"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  Building2,
  FileClock,
  FileText,
  History,
  Scale,
  TrendingUp,
  Waves,
  type LucideIcon,
} from "lucide-react"
import { findNavItem } from "@/lib/nav"
import { PageBody } from "@/components/patterns/list-page"
import { PageHeader } from "@/components/patterns/page-header"

type ReportCard = { name: string; formal: string; description: string; href: string; icon: LucideIcon }

const GROUPS: { title: string; question: string; reports: ReportCard[] }[] = [
  {
    title: "Performance",
    question: "Are we making money?",
    reports: [
      { name: "Profit & loss", formal: "Statement of profit or loss", description: "What you earned, what you spent, and what's left.", href: "/reports/profit-and-loss", icon: TrendingUp },
    ],
  },
  {
    title: "Position",
    question: "What do we own and owe?",
    reports: [
      { name: "Balance sheet", formal: "Statement of financial position", description: "What the business owns and owes on a date.", href: "/reports/balance-sheet", icon: Scale },
    ],
  },
  {
    title: "Cash",
    question: "Where did the cash go?",
    reports: [
      { name: "Cash flow", formal: "Statement of cash flows", description: "Where cash came from and where it went.", href: "/reports/cash-flow", icon: Waves },
    ],
  },
  {
    title: "Customers & suppliers",
    question: "Who owes whom?",
    reports: [
      { name: "Who owes you", formal: "Accounts receivable ageing", description: "Customer balances by how long they've been due.", href: "/reports/who-owes-you", icon: FileClock },
      { name: "What you owe", formal: "Accounts payable ageing", description: "Supplier balances by how long they've been due.", href: "/reports/what-you-owe", icon: FileClock },
      { name: "Statements", formal: "Customer and supplier statements", description: "Every invoice, payment and credit for one contact. Open a customer or supplier.", href: "/customers", icon: FileText },
    ],
  },
  {
    title: "Tax",
    question: "What do we owe GRA and SSNIT?",
    reports: [
      { name: "VAT & taxes", formal: "VAT, withholding tax and payroll taxes", description: "VAT, withholding tax and SSNIT due for the period.", href: "/reports/vat-and-taxes", icon: Building2 },
    ],
  },
  {
    title: "Accountant",
    question: "Checks for whoever keeps the books.",
    reports: [
      { name: "Trial balance", formal: "Trial balance", description: "Every account's debit or credit balance, so you can see the books add up.", href: "/general-ledger?tab=trial-balance", icon: BookOpen },
      { name: "Audit trail", formal: "Audit log", description: "Who changed what, and when.", href: "/settings/audit-trail", icon: History },
    ],
  },
]

export default function Page() {
  const nav = findNavItem(usePathname())
  return (
    <PageBody>
      <PageHeader title={nav?.label ?? "All reports"} description={nav?.description} exportable={false} />
      <div className="flex flex-col gap-8">
        {GROUPS.map((g) => (
          <section key={g.title} className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">{g.title}</h2>
              <p className="text-[13px] text-muted-foreground">{g.question}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.reports.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="group flex min-w-0 gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground">
                    <r.icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0 space-y-0.5">
                    <span className="block text-sm font-medium">{r.name}</span>
                    <span className="block text-xs text-muted-foreground">{r.formal}</span>
                    <span className="block pt-1 text-[13px] text-foreground/75">{r.description}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageBody>
  )
}
