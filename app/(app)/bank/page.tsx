"use client"

import * as React from "react"
import { ArrowLeftRight, Landmark } from "lucide-react"
import { useLedger } from "@/lib/ledger"
import { RECONCILED } from "@/lib/mock/seed"
import { bankAccounts, bankSummary, cashTotal } from "@/lib/selectors"
import { Button } from "@/components/ui/button"
import { PageBody } from "@/components/patterns/list-page"
import { PageHeader } from "@/components/patterns/page-header"
import { KpiStrip, type Kpi } from "@/components/patterns/kpi-strip"
import { Money } from "@/components/patterns/money"
import { EmptyState } from "@/components/patterns/empty-state"
import { AccountCard, type BankCardData } from "@/components/banking/account-card"
import { TransferDialog } from "@/components/banking/transfer-dialog"

type Filter = "all" | "bank" | "momo" | "cash"

export default function BankPage() {
  const s = useLedger()
  const [filter, setFilter] = React.useState<Filter>("all")
  const [transferFrom, setTransferFrom] = React.useState<string | null>(null)

  const cards = React.useMemo<BankCardData[]>(
    () =>
      bankAccounts(s).map((account) => {
        const sum = bankSummary(s, account.code)
        return {
          account,
          book: sum.book,
          bankSays: sum.bankSays,
          difference: sum.difference,
          openCount: sum.openCount,
          hasFeed: sum.totalCount > 0,
          lastReconciled: RECONCILED[account.code]?.lastReconciled,
          statementDate: RECONCILED[account.code]?.statementDate,
        }
      }),
    [s]
  )
  const total = React.useMemo(() => cashTotal(s), [s])
  const sumKind = (kind: Filter) => cards.filter((c) => c.account.bank!.kind === kind).reduce((t, c) => t + c.book, 0)
  const countKind = (kind: Filter) => cards.filter((c) => c.account.bank!.kind === kind).length
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

  const kpis: Kpi[] = [
    { id: "all", label: "Total cash & bank", value: <Money amount={total} size="kpi" />, hint: plural(cards.length, "account", "accounts") },
    { id: "bank", label: "In banks", value: <Money amount={sumKind("bank")} size="kpi" />, hint: plural(countKind("bank"), "bank account", "bank accounts") },
    {
      id: "momo",
      label: "Mobile money",
      value: <Money amount={sumKind("momo")} size="kpi" negativeHint="Below zero – a data issue to fix" />,
      hint: sumKind("momo") < 0 ? <span className="text-warning">Below zero – check the wallet</span> : plural(countKind("momo"), "wallet", "wallets"),
      tone: sumKind("momo") < 0 ? "warning" : "default",
    },
    { id: "cash", label: "Cash on hand", value: <Money amount={sumKind("cash")} size="kpi" />, hint: plural(countKind("cash"), "cash box", "cash boxes") },
  ]

  const shown = filter === "all" ? cards : cards.filter((c) => c.account.bank!.kind === filter)

  return (
    <PageBody>
      <PageHeader
        title="Bank & cash"
        description="Every bank account, mobile money wallet and cash box."
        primary={
          <Button onClick={() => setTransferFrom("1010")}>
            <ArrowLeftRight />
            Transfer
          </Button>
        }
      />
      <KpiStrip items={kpis} activeId={filter} onSelect={(id) => setFilter(id === filter ? "all" : (id as Filter))} />
      {shown.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState icon={Landmark} title="No accounts of this kind" description="Show every account to see the rest." action={<Button variant="outline" onClick={() => setFilter("all")}>Show all accounts</Button>} />
        </div>
      ) : (
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => (
            <AccountCard key={c.account.code} data={c} onTransfer={() => setTransferFrom(c.account.code)} />
          ))}
        </div>
      )}
      <TransferDialog key={transferFrom ?? "closed"} fromCode={transferFrom} onClose={() => setTransferFrom(null)} />
    </PageBody>
  )
}
