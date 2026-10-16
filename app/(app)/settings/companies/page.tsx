"use client"

import Link from "next/link"
import { Building2, Plus } from "lucide-react"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { PageBody } from "@/components/patterns/list-page"
import { PageHeader } from "@/components/patterns/page-header"
import { Code } from "@/components/patterns/text"

export default function CompaniesPage() {
  const companies = useLedger((s) => s.companies)
  const current = usePrefs((s) => s.entityId)
  return (
    <PageBody>
      <PageHeader
        title="Companies"
        description="The companies you invoice from, with their details and sender emails."
        exportable={false}
        primary={
          <Button asChild>
            <Link href="/settings/companies/new">
              <Plus />
              Add company
            </Link>
          </Button>
        }
      />
      <ul className="divide-y rounded-xl border bg-card">
        {companies.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold">
              {c.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logoUrl} alt="" className="size-full object-cover" />
              ) : (
                c.short
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium">
                {c.name}
                {c.id === current && <span className="rounded-full bg-muted px-2 text-[11px] font-medium text-muted-foreground">Current</span>}
              </p>
              <p className="truncate text-sm text-muted-foreground">{[c.email, c.address].filter(Boolean).join(" · ")}</p>
            </div>
            {c.taxId && <Code>TIN {c.taxId}</Code>}
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Building2 className="size-3.5" />
        Companies appear in the company switcher and in the invoice editor&apos;s Company step.
      </p>
    </PageBody>
  )
}
