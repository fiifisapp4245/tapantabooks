"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { BookOpen } from "lucide-react"
import { useLedger } from "@/lib/ledger"
import { addDays, endOfMonth, fmtDate, TODAY } from "@/lib/dates"
import { generalLedger } from "@/lib/selectors"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageBody } from "@/components/patterns/list-page"
import { PageHeader } from "@/components/patterns/page-header"
import { KpiStrip, type Kpi } from "@/components/patterns/kpi-strip"
import { DataTable } from "@/components/patterns/data-table"
import { AccountPicker } from "@/components/patterns/pickers"
import { Money, MoneyCell } from "@/components/patterns/money"
import { Code, Term } from "@/components/patterns/text"
import { EmptyState } from "@/components/patterns/empty-state"
import { JournalDrawer, SOURCE_LABELS } from "@/components/drawers/journal-drawer"
import { TrialBalance } from "@/components/accounting/trial-balance"

const DEFAULT_ACCOUNT = "1010"

type PeriodId = "this-month" | "last-month" | "this-quarter" | "ytd"

function periodRange(id: PeriodId): { from: string; to: string; label: string } {
  const [y, m] = TODAY.split("-").map(Number)
  const firstOfMonth = TODAY.slice(0, 8) + "01"
  switch (id) {
    case "this-month":
      return { from: firstOfMonth, to: TODAY, label: "This month" }
    case "last-month": {
      const to = addDays(firstOfMonth, -1)
      return { from: to.slice(0, 8) + "01", to: endOfMonth(to.slice(0, 7)), label: "Last month" }
    }
    case "this-quarter": {
      const qm = Math.floor((m - 1) / 3) * 3 + 1
      return { from: `${y}-${String(qm).padStart(2, "0")}-01`, to: TODAY, label: "This quarter" }
    }
    case "ytd":
      return { from: `${y}-01-01`, to: TODAY, label: "Year to date" }
  }
}

const PERIODS: PeriodId[] = ["this-month", "last-month", "this-quarter", "ytd"]

type LedgerRow = ReturnType<typeof generalLedger>["rows"][number] & { rowId: string }

export default function GeneralLedgerPage() {
  return (
    <React.Suspense fallback={<LedgerFallback />}>
      <GeneralLedger />
    </React.Suspense>
  )
}

function LedgerFallback() {
  return (
    <PageBody>
      <PageHeader title="General ledger" description="Every movement on an account, with a running balance." />
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    </PageBody>
  )
}

function GeneralLedger() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const s = useLedger()
  const requested = params.get("account") ?? DEFAULT_ACCOUNT
  const code = s.accounts.some((a) => a.code === requested) ? requested : DEFAULT_ACCOUNT
  const [tab, setTab] = React.useState(params.get("tab") === "trial-balance" ? "trial-balance" : "ledger")
  const [period, setPeriod] = React.useState<PeriodId>("ytd")
  const [side, setSide] = React.useState<"in" | "out" | undefined>()
  const [journalId, setJournalId] = React.useState<string | null>(null)

  const setAccount = (next: string) => {
    setSide(undefined)
    router.replace(`${pathname}?account=${next}`, { scroll: false })
  }

  const range = periodRange(period)
  const gl = React.useMemo(() => generalLedger(s, code, range.from, range.to), [s, code, range.from, range.to])
  const rows = React.useMemo<LedgerRow[]>(() => gl.rows.map((r, i) => ({ ...r, rowId: `${r.journal.id}-${i}` })), [gl])
  const shown = side === "in" ? rows.filter((r) => r.debit) : side === "out" ? rows.filter((r) => r.credit) : rows
  const acc = gl.account

  const columns = React.useMemo<ColumnDef<LedgerRow, unknown>[]>(
    () => [
      { id: "date", accessorFn: (r) => r.journal.date, header: "Date", cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.journal.date)}</span>, meta: { width: "120px" } },
      {
        id: "entry",
        accessorFn: (r) => r.journal.id,
        header: "Entry",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Code>{row.original.journal.id}</Code>
            <span className="text-xs text-muted-foreground">{SOURCE_LABELS[row.original.journal.source]}</span>
          </div>
        ),
        meta: { width: "140px" },
      },
      {
        id: "memo",
        accessorFn: (r) => `${r.journal.memo} ${r.description ?? ""}`,
        header: "Memo",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.journal.source === "opening" ? (
            <div className="min-w-48">
              <span className="inline-flex h-6 items-center rounded-full bg-neutral-soft px-2.5 text-xs font-medium">
                <Term term="Opening balance">Starting balance</Term>
              </span>
              <p className="mt-0.5 text-xs text-muted-foreground">Brought in at conversion on {fmtDate(row.original.journal.date)}</p>
            </div>
          ) : (
            <div className="min-w-48">
              <p className="line-clamp-2">{row.original.journal.memo}</p>
              {row.original.description && <p className="text-xs text-muted-foreground">{row.original.description}</p>}
            </div>
          ),
        meta: { wrap: true },
      },
      { id: "debit", accessorKey: "debit", header: "Debit", enableSorting: false, cell: ({ row }) => (row.original.debit ? <MoneyCell amount={row.original.debit} hideSymbol /> : null), meta: { align: "right", width: "130px" } },
      { id: "credit", accessorKey: "credit", header: "Credit", enableSorting: false, cell: ({ row }) => (row.original.credit ? <MoneyCell amount={row.original.credit} hideSymbol /> : null), meta: { align: "right", width: "130px" } },
      {
        id: "balance",
        accessorKey: "balance",
        header: "Running balance",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => <MoneyCell amount={row.original.balance} className="font-medium" />,
        meta: { align: "right", width: "160px" },
      },
    ],
    []
  )

  const asAtBefore = fmtDate(addDays(range.from, -1))
  const kpis: Kpi[] = [
    { id: "before", label: "Balance before period", value: <Money amount={gl.before} size="kpi" />, hint: `as at ${asAtBefore}` },
    { id: "in", label: "Money in (debits)", value: <Money amount={gl.moneyIn} size="kpi" />, hint: `${rows.filter((r) => r.debit).length} lines` },
    { id: "out", label: "Money out (credits)", value: <Money amount={gl.moneyOut} size="kpi" />, hint: `${rows.filter((r) => r.credit).length} lines` },
    { id: "closing", label: "Closing balance", value: <Money amount={gl.closing} size="kpi" />, hint: `as at ${fmtDate(range.to)}` },
  ]

  return (
    <PageBody>
      <PageHeader title="General ledger" description="Every movement on an account, with a running balance." />
      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList className="h-9">
          <TabsTrigger value="ledger" className="data-[state=active]:bg-card">Ledger</TabsTrigger>
          <TabsTrigger value="trial-balance" className="data-[state=active]:bg-card">Trial balance</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-80">
              <span className="text-[13px] font-medium">Account</span>
              <AccountPicker value={code} onChange={setAccount} />
            </div>
            <div className="flex w-full flex-col gap-1.5 sm:w-48">
              <span className="text-[13px] font-medium">Period</span>
              <Select value={period} onValueChange={(v) => { setPeriod(v as PeriodId); setSide(undefined) }}>
                <SelectTrigger className="w-full bg-card" aria-label="Period"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => <SelectItem key={p} value={p}>{periodRange(p).label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="pb-2 text-xs text-muted-foreground">
              {fmtDate(range.from)} – {fmtDate(range.to)} · {acc.description}
            </p>
          </div>

          <KpiStrip
            items={kpis}
            activeId={side}
            onSelect={(id) => setSide(id === "in" || id === "out" ? (id === side ? undefined : id) : undefined)}
          />

          <DataTable
            columns={columns}
            data={shown}
            getRowId={(r) => r.rowId}
            onRowClick={(r) => setJournalId(r.journal.id)}
            searchPlaceholder="Search entries"
            empty={
              <EmptyState
                icon={BookOpen}
                title="No movements in this period"
                description={`${acc.name} didn't change between ${fmtDate(range.from)} and ${fmtDate(range.to)}.`}
                action={<Button variant="outline" onClick={() => { setPeriod("ytd"); setSide(undefined) }}>Show year to date</Button>}
              />
            }
          />
        </TabsContent>

        <TabsContent value="trial-balance" className="min-w-0">
          <TrialBalance
            onOpenAccount={(c) => {
              setAccount(c)
              setTab("ledger")
            }}
          />
        </TabsContent>
      </Tabs>
      <JournalDrawer journalId={journalId} onClose={() => setJournalId(null)} />
    </PageBody>
  )
}
