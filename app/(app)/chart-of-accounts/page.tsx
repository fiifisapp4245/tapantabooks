"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, ListTree, Plus, Search, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLedger } from "@/lib/ledger"
import { fmtDate, TODAY } from "@/lib/dates"
import { movements } from "@/lib/selectors"
import type { Account, AccountType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PageBody } from "@/components/patterns/list-page"
import { PageHeader } from "@/components/patterns/page-header"
import { FilterChip } from "@/components/patterns/filter-chip"
import { Money } from "@/components/patterns/money"
import { Code } from "@/components/patterns/text"
import { EmptyState } from "@/components/patterns/empty-state"
import { ACCOUNT_TYPES } from "@/components/accounting/account-types"
import { NewAccountDialog } from "@/components/accounting/new-account-dialog"

type Row = { account: Account; amount: number; depth: number; flag?: string }

/** Balances that can't be real, with what to check. */
function flagFor(a: Account, amount: number) {
  if (a.bank?.kind === "momo" && amount < -0.005) return "A wallet can't hold less than zero. Check for a duplicate payout."
  if (a.bank?.kind === "cash" && amount < -0.005) return "A cash box can't hold less than zero. Check for a missing deposit."
  if (a.category === "Suspense" && Math.abs(amount) >= 0.005) return "Suspense should be cleared to zero. Move each amount to the account it belongs in."
  return undefined
}

export default function ChartOfAccountsPage() {
  const router = useRouter()
  const s = useLedger()
  const accounts = s.accounts
  const [tab, setTab] = React.useState<"all" | AccountType>("all")
  // Active only by default; clearing the filter shows every account.
  const [activity, setActivity] = React.useState<"active" | "inactive" | undefined>("active")
  const [query, setQuery] = React.useState("")
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())
  const [creating, setCreating] = React.useState(0)

  const mv = React.useMemo(() => movements(s, { to: TODAY }), [s])
  // Every balance in its type's natural direction, so contra accounts (like depreciation) reduce the subtotal.
  const amountOf = React.useCallback(
    (a: Account) => {
      const dr = mv.get(a.code) ?? 0
      const typeNormal = a.type === "asset" || a.type === "expense" || a.type === "cost_of_sales" ? 1 : -1
      return Math.round(dr * typeNormal * 100) / 100
    },
    [mv]
  )

  const q = query.trim().toLowerCase()
  const matches = accounts.filter((a) => !q || `${a.code} ${a.name} ${a.description} ${a.category}`.toLowerCase().includes(q))
  const visible = matches.filter((a) => !activity || (activity === "active" ? a.active : !a.active))
  const typeOptions = ACCOUNT_TYPES.map((t) => ({ value: t.id, label: t.plural, count: visible.filter((a) => a.type === t.id).length }))
  const activityOptions = [
    { value: "active", label: "Active", count: matches.filter((a) => a.active).length },
    { value: "inactive", label: "Inactive", count: matches.filter((a) => !a.active).length },
  ]

  const sections = ACCOUNT_TYPES.filter((t) => tab === "all" || t.id === tab)
    .map((t) => {
      const ofType = visible.filter((a) => a.type === t.id)
      const cats = [...new Set(ofType.map((a) => a.category))].map((category) => {
        const inCat = ofType.filter((a) => a.category === category)
        // Children sit under their parent; everything else in code order.
        const roots = inCat.filter((a) => !a.parent || !inCat.some((p) => p.code === a.parent))
        const rows: Row[] = []
        const add = (a: Account, depth: number) => {
          const amount = amountOf(a)
          rows.push({ account: a, amount, depth, flag: flagFor(a, amount) })
          inCat.filter((c) => c.parent === a.code).forEach((c) => add(c, depth + 1))
        }
        roots.forEach((a) => add(a, 0))
        return { category, rows, total: rows.reduce((x, r) => x + r.amount, 0) }
      })
      return { type: t, cats, total: cats.reduce((x, c) => x + c.total, 0) }
    })
    .filter((sec) => sec.cats.length > 0)

  const toggle = (key: string) =>
    setCollapsed((c) => {
      const next = new Set(c)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const go = (code: string) => router.push(`/general-ledger?account=${code}`)

  return (
    <PageBody>
      <PageHeader
        title="Chart of accounts"
        description="The accounts your money is sorted into."
        meta={`Balances as at ${fmtDate(TODAY)}`}
        primary={
          <Button onClick={() => setCreating((n) => n + 1)}>
            <Plus />
            New account
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search accounts" aria-label="Search accounts" className="bg-card pl-9" />
          </div>
          <FilterChip label="Type" value={tab === "all" ? undefined : tab} onChange={(v) => setTab((v as AccountType | undefined) ?? "all")} options={typeOptions} />
          <FilterChip label="Status" value={activity} onChange={(v) => setActivity(v as typeof activity)} options={activityOptions} />
        </div>

        <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
          {sections.length === 0 ? (
            <EmptyState icon={ListTree} title="No accounts match" description="Try another type or status, or clear the search." action={<Button variant="outline" onClick={() => { setQuery(""); setTab("all"); setActivity("active") }}>Clear filters</Button>} />
          ) : (
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="h-10 px-4 text-left font-medium">Account</th>
                  <th className="hidden h-10 w-24 px-4 text-left font-medium sm:table-cell">Currency</th>
                  <th className="h-10 w-36 px-4 text-right font-medium sm:w-44">Balance</th>
                </tr>
              </thead>
              {sections.map((sec) => (
                <tbody key={sec.type.id} className="border-b last:border-b-0">
                  {tab === "all" && (
                    <tr className="bg-muted/50">
                      <th scope="rowgroup" className="px-4 py-2.5 text-left text-[13px] font-semibold">{sec.type.plural}</th>
                      <td className="hidden sm:table-cell" />
                      <td className="px-4 py-2.5 text-right font-semibold"><Money amount={sec.total} /></td>
                    </tr>
                  )}
                  {sec.cats.map((cat) => {
                    const key = `${sec.type.id}:${cat.category}`
                    const isOpen = !collapsed.has(key)
                    return (
                      <React.Fragment key={key}>
                        <tr className="border-t">
                          <td colSpan={2} className="p-0">
                            <button type="button" onClick={() => toggle(key)} aria-expanded={isOpen} className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-medium">
                              <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                              <span className="truncate">{cat.category}</span>
                              <span className="text-xs font-normal text-muted-foreground">{cat.rows.length}</span>
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium"><Money amount={cat.total} /></td>
                        </tr>
                        {isOpen &&
                          cat.rows.map((r) => (
                            <tr
                              key={r.account.code}
                              tabIndex={0}
                              role="link"
                              aria-label={`${r.account.name}: open in General ledger`}
                              onClick={() => go(r.account.code)}
                              onKeyDown={(e) => e.key === "Enter" && go(r.account.code)}
                              className={cn("cursor-pointer border-t transition-colors hover:bg-[color-mix(in_oklab,var(--card),var(--foreground)_3%)] focus-visible:outline-offset-[-2px]", !r.account.active && "text-muted-foreground")}
                            >
                              <td className="py-2.5 pr-4" style={{ paddingLeft: 40 + r.depth * 20 }}>
                                <div className="flex min-w-0 items-baseline gap-2">
                                  <Code className="shrink-0">{r.account.code}</Code>
                                  <span className={cn("truncate", r.account.active && "font-medium")}>{r.account.name}</span>
                                  {!r.account.active && <span className="shrink-0 rounded-full bg-neutral-soft px-2 text-[11px] leading-5">Inactive</span>}
                                </div>
                                <p className="truncate text-xs text-muted-foreground" title={r.account.description}>{r.account.description}</p>
                              </td>
                              <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">{r.account.currency}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center justify-end gap-1.5">
                                  {r.flag && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span tabIndex={0} role="img" aria-label={r.flag} onClick={(e) => e.stopPropagation()} className="inline-flex text-warning">
                                          <TriangleAlert className="size-4" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-64">{r.flag}</TooltipContent>
                                    </Tooltip>
                                  )}
                                  <Money amount={r.amount} negativeHint={r.flag ? "Below zero – see the warning" : "Opposite of this account's usual side"} />
                                </div>
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              ))}
            </table>
          )}
        </section>
      </div>

      {creating > 0 && <NewAccountDialog key={creating} open onClose={() => setCreating(0)} />}
    </PageBody>
  )
}
