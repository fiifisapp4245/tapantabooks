"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { History } from "lucide-react"
import { useLedger } from "@/lib/ledger"
import { USERS } from "@/lib/constants"
import { addDays, fmtDateTime, relative, TODAY } from "@/lib/dates"
import type { AuditEvent } from "@/lib/types"
import { ListPage } from "@/components/patterns/list-page"
import { FilterChip } from "@/components/patterns/filter-chip"
import { EmptyState } from "@/components/patterns/empty-state"
import { Code } from "@/components/patterns/text"
import { JournalDrawer } from "@/components/drawers/journal-drawer"

type Row = AuditEvent & { who: string }
type KpiId = "today" | "week" | "people" | "system"

const userName = (id: string) => (id === "system" ? "System (integration)" : USERS.find((u) => u.id === id)?.name ?? id)
const WEEK_START = addDays(TODAY, -6)

const TAB_OF = (code: string) =>
  code.startsWith("journal.") ? "journals" : code.startsWith("settings.") || code.startsWith("period.") ? "settings" : code.startsWith("import.") ? "imports" : "other"

const big = (n: number) => <span className="font-heading text-[28px] font-semibold tabular">{n}</span>

export default function Page() {
  const audit = useLedger((s) => s.audit)
  const journals = useLedger((s) => s.journals)
  const [tab, setTab] = React.useState("all")
  const [kpi, setKpi] = React.useState<KpiId | undefined>()
  const [user, setUser] = React.useState<string | undefined>()
  const [journalId, setJournalId] = React.useState<string | null>(null)

  const rows: Row[] = audit.map((a) => ({ ...a, who: userName(a.userId) }))
  const today = rows.filter((r) => r.at.startsWith(TODAY))
  const week = rows.filter((r) => r.at.slice(0, 10) >= WEEK_START)
  const people = new Set(week.filter((r) => r.userId !== "system").map((r) => r.userId))
  const system = rows.filter((r) => r.userId === "system")

  const tabs = [
    { id: "all", label: "All", count: rows.length },
    { id: "journals", label: "Journals", count: rows.filter((r) => TAB_OF(r.code) === "journals").length },
    { id: "settings", label: "Settings & periods", count: rows.filter((r) => TAB_OF(r.code) === "settings").length },
    { id: "imports", label: "Imports", count: rows.filter((r) => TAB_OF(r.code) === "imports").length },
  ]

  const data = rows.filter((r) => {
    if (tab !== "all" && TAB_OF(r.code) !== tab) return false
    if (user && r.userId !== user) return false
    if (kpi === "today" && !r.at.startsWith(TODAY)) return false
    if (kpi === "week" && r.at.slice(0, 10) < WEEK_START) return false
    if (kpi === "people" && (r.userId === "system" || r.at.slice(0, 10) < WEEK_START)) return false
    if (kpi === "system" && r.userId !== "system") return false
    return true
  })

  const columns: ColumnDef<Row, unknown>[] = [
    {
      id: "when",
      accessorKey: "at",
      header: "When",
      meta: { width: "130px" },
      cell: ({ row }) => (
        <div>
          <p>{fmtDateTime(row.original.at)}</p>
          <p className="text-xs text-muted-foreground">{relative(row.original.at)}</p>
        </div>
      ),
    },
    {
      id: "action",
      accessorFn: (r) => `${r.action} ${r.code}`,
      header: "Action",
      meta: { wrap: true },
      cell: ({ row }) => (
        <div className="min-w-[200px]">
          <p className="font-medium">{row.original.action}</p>
          <Code className="text-xs">{row.original.code}</Code>
        </div>
      ),
    },
    { id: "who", accessorKey: "who", header: "Who", cell: ({ row }) => <span className="whitespace-nowrap">{row.original.who}</span> },
    { id: "summary", accessorKey: "summary", header: "Summary", meta: { wrap: true }, cell: ({ row }) => <p className="min-w-[240px] text-[13px] text-muted-foreground">{row.original.summary || "—"}</p> },
    { id: "entity", accessorKey: "entity", header: "Record", cell: ({ row }) => <Code>{row.original.entity}</Code> },
  ]

  return (
    <ListPage
      tabLabel="Type"
      kpis={[
        { id: "today", label: "Events today", value: big(today.length) },
        { id: "week", label: "Events this week", value: big(week.length), hint: "Last 7 days" },
        { id: "people", label: "People active", value: big(people.size), hint: [...people].map(userName).map((n) => n.split(" ")[0]).join(", ") || "This week" },
        { id: "system", label: "System events", value: big(system.length), hint: "From connections and imports" },
      ]}
      activeKpi={kpi}
      onKpiSelect={(id) => setKpi((k) => (k === id ? undefined : (id as KpiId)))}
      tabs={tabs}
      tab={tab}
      onTabChange={setTab}
      columns={columns}
      data={data}
      getRowId={(r) => r.id}
      onRowClick={(r) => journals.some((j) => j.id === r.entity) && setJournalId(r.entity)}
      searchPlaceholder="Search the audit trail"
      filters={
        <FilterChip
          label="User"
          value={user}
          onChange={setUser}
          options={[...USERS.map((u) => ({ value: u.id as string, label: u.name })), { value: "system", label: "System (integration)" }]}
        />
      }
      empty={<EmptyState icon={History} title="No events match" description="Try another tab or clear the User filter." />}
    >
      <JournalDrawer journalId={journalId} onClose={() => setJournalId(null)} />
    </ListPage>
  )
}
