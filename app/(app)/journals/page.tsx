"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { NotebookPen, Plus } from "lucide-react"
import { usePrefs } from "@/lib/store"
import { fmtDate, monthKey, TODAY } from "@/lib/dates"
import { journalAmount, useSelect } from "@/lib/selectors"
import type { Journal } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ListPage } from "@/components/patterns/list-page"
import { FilterChip } from "@/components/patterns/filter-chip"
import { EmptyState } from "@/components/patterns/empty-state"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Money, MoneyCell } from "@/components/patterns/money"
import { Code } from "@/components/patterns/text"
import type { Kpi } from "@/components/patterns/kpi-strip"
import { JournalDrawer, SOURCE_LABELS } from "@/components/drawers/journal-drawer"
import { branchName, branchOptions, userName } from "@/components/bills/shared"

type Row = Journal & { amount: number }

const COLUMNS: ColumnDef<Row, unknown>[] = [
  { accessorKey: "id", header: "Entry", cell: ({ getValue }) => <Code>{getValue<string>()}</Code>, meta: { width: "140px" } },
  { accessorKey: "date", header: "Date", cell: ({ getValue }) => <span className="text-muted-foreground">{fmtDate(getValue<string>())}</span> },
  {
    accessorKey: "memo",
    header: "Memo",
    cell: ({ row }) => {
      const j = row.original
      return (
        <div className="flex min-w-56 flex-wrap items-center gap-x-2 gap-y-1">
          <span>{j.memo}</span>
          {j.status !== "posted" && <StatusBadge status={j.status} />}
        </div>
      )
    },
    meta: { wrap: true },
  },
  {
    id: "source",
    accessorFn: (r) => SOURCE_LABELS[r.source],
    header: "Source",
    cell: ({ getValue }) => (
      <span className="inline-flex h-6 items-center rounded-full bg-neutral-soft px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground">{getValue<string>()}</span>
    ),
  },
  { id: "branch", accessorFn: (r) => branchName(r.branch), header: "Branch" },
  { id: "createdBy", accessorFn: (r) => userName(r.createdBy), header: "Created by" },
  { accessorKey: "amount", header: "Amount", cell: ({ getValue }) => <MoneyCell amount={getValue<number>()} />, meta: { align: "right" } },
]

const TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "awaiting_approval", label: "Awaiting approval" },
  { id: "posted", label: "Posted" },
  { id: "reversed", label: "Reversed" },
] as const

/** A KPI count, sized like <Money size="kpi">. */
function Count({ children }: { children: React.ReactNode }) {
  return <span className="font-heading text-[clamp(20px,11.5cqw,30px)] leading-tight font-semibold tracking-[-0.02em] tabular">{children}</span>
}

const r2 = (n: number) => Math.round(n * 100) / 100

export default function JournalsPage() {
  const rows = useSelect((s) =>
    s.journals
      .map((j): Row => ({ ...j, amount: journalAmount(s, j) }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  )
  const [tab, setTab] = React.useState("all")
  const [kpi, setKpi] = React.useState<string>()
  const [source, setSource] = React.useState<string>()
  const [branch, setBranch] = React.useState<string>()
  const [openId, setOpenId] = React.useState<string | null>(null)

  const month = monthKey(TODAY)
  const inMonth = (j: Row) => monthKey(j.date) === month
  const postedMonth = rows.filter((j) => j.status === "posted" && inMonth(j))
  const awaiting = rows.filter((j) => j.status === "awaiting_approval")
  const drafts = rows.filter((j) => j.status === "draft")
  const monthAll = rows.filter(inMonth)
  const fromIntegrations = monthAll.filter((j) => j.source !== "manual")
  const pct = monthAll.length ? Math.round((fromIntegrations.length / monthAll.length) * 100) : 0
  const sum = (xs: Row[]) => r2(xs.reduce((t, j) => t + j.amount, 0))

  const kpis: Kpi[] = [
    { id: "postedMonth", label: "Posted this month", value: <Count>{postedMonth.length}</Count>, hint: <Money amount={sum(postedMonth)} size="sm" className="text-muted-foreground" /> },
    {
      id: "awaiting",
      label: "Awaiting approval",
      value: <Count>{awaiting.length}</Count>,
      hint: <Money amount={sum(awaiting)} size="sm" className="text-muted-foreground" />,
      tone: awaiting.length ? "warning" : "default",
    },
    { id: "drafts", label: "Drafts", value: <Count>{drafts.length}</Count>, hint: "Not in the books yet" },
    { id: "integrations", label: "From integrations", value: <Count>{pct}%</Count>, hint: `${fromIntegrations.length} of ${monthAll.length} this month` },
  ]

  const scoped = rows.filter(
    (j) =>
      (!source || j.source === source) &&
      (!branch || j.branch === branch) &&
      (kpi === "postedMonth" ? j.status === "posted" && inMonth(j) : kpi === "integrations" ? inMonth(j) && j.source !== "manual" : true)
  )
  const tabs = TABS.map((t) => ({ ...t, count: t.id === "all" ? scoped.length : scoped.filter((j) => j.status === t.id).length }))
  const data = tab === "all" ? scoped : scoped.filter((j) => j.status === tab)

  const selectKpi = (id: string) => {
    if (id === kpi) {
      setKpi(undefined)
      setTab("all")
      return
    }
    setKpi(id)
    // Awaiting approval and Drafts are tabs already; the KPI just jumps there.
    setTab(id === "awaiting" ? "awaiting_approval" : id === "drafts" ? "draft" : "all")
  }
  const clear = () => {
    setTab("all")
    setKpi(undefined)
    setSource(undefined)
    setBranch(undefined)
  }

  return (
    <ListPage
      primary={
        <Button onClick={() => usePrefs.getState().openForm("journal")}>
          <Plus />
          New journal entry
        </Button>
      }
      kpis={kpis}
      activeKpi={kpi}
      onKpiSelect={selectKpi}
      tabs={tabs}
      tab={tab}
      onTabChange={(t) => {
        setTab(t)
        if (kpi === "awaiting" || kpi === "drafts") setKpi(undefined)
      }}
      columns={COLUMNS}
      data={data}
      getRowId={(r) => r.id}
      onRowClick={(r) => setOpenId(r.id)}
      hiddenColumns={["branch", "createdBy"]}
      searchPlaceholder="Search journals"
      filters={
        <>
          <FilterChip label="Source" value={source} onChange={setSource} options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }))} />
          <FilterChip label="Branch" value={branch} onChange={setBranch} options={branchOptions} />
        </>
      }
      empty={
        <EmptyState
          icon={NotebookPen}
          title={tab === "awaiting_approval" ? "Nothing waiting for approval" : "No journals match"}
          description={tab === "awaiting_approval" ? "Entries over the approval threshold land here." : "Try another tab or clear the filters."}
          action={<Button variant="outline" onClick={clear}>Clear filters</Button>}
        />
      }
    >
      <JournalDrawer journalId={openId} onClose={() => setOpenId(null)} />
    </ListPage>
  )
}
