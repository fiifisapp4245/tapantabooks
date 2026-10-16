"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { FolderInput, RefreshCw, Wrench } from "lucide-react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { attention, useSelect } from "@/lib/selectors"
import { fmtDateTime, relative, TODAY } from "@/lib/dates"
import type { ImportBatch } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ListPage } from "@/components/patterns/list-page"
import { FilterChip } from "@/components/patterns/filter-chip"
import { EmptyState } from "@/components/patterns/empty-state"
import { Banner } from "@/components/patterns/banner"
import { Code } from "@/components/patterns/text"
import { DrawerSection, EntityDrawer, FactList } from "@/components/patterns/entity-drawer"
import { HELD_DEFINITION, HeldHint, heldTotal, ImportStatus } from "@/components/integrations/shared"

type Row = ImportBatch & { source: string }
type KpiId = "today" | "posted" | "held" | "failed"

const num = (n: number) => <span className="tabular">{n.toLocaleString("en-GB")}</span>
const big = (n: number) => <span className="font-heading text-[28px] font-semibold tabular">{n.toLocaleString("en-GB")}</span>

export default function Page() {
  const imports = useLedger((s) => s.imports)
  const connections = useLedger((s) => s.connections)
  // The same figure the nav badge shows.
  const needAttention = useSelect((s) => attention(s).importsNeedAttention)
  const [tab, setTab] = React.useState("all")
  const [kpi, setKpi] = React.useState<KpiId | undefined>()
  const [source, setSource] = React.useState<string | undefined>()
  const [openId, setOpenId] = React.useState<string | null>(null)

  const rows: Row[] = imports.map((i) => ({ ...i, source: connections.find((c) => c.id === i.connectionId)?.name ?? i.connectionId }))
  const today = rows.filter((r) => r.receivedAt.startsWith(TODAY))

  const tabs = [
    { id: "all", label: "All", count: rows.length },
    { id: "needs_attention", label: "Needs attention", count: needAttention },
    { id: "posted", label: "Posted", count: rows.filter((r) => r.status === "posted").length },
    { id: "processing", label: "Processing", count: rows.filter((r) => r.status === "processing").length },
  ]

  const data = rows.filter((r) => {
    if (tab !== "all" && r.status !== tab) return false
    if (source && r.connectionId !== source) return false
    if (kpi === "today" && !r.receivedAt.startsWith(TODAY)) return false
    if (kpi === "posted" && r.posted === 0) return false
    if (kpi === "held" && r.held === 0) return false
    if (kpi === "failed" && r.failed === 0) return false
    return true
  })

  const columns: ColumnDef<Row, unknown>[] = [
    {
      id: "batch",
      accessorFn: (r) => `${r.id} ${r.source}`,
      header: "Batch",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium">{row.original.source}</p>
          <Code>{row.original.id}</Code>
        </div>
      ),
    },
    {
      id: "received",
      accessorKey: "receivedAt",
      header: "Received",
      cell: ({ row }) => (
        <div>
          <p>{fmtDateTime(row.original.receivedAt)}</p>
          <p className="text-xs text-muted-foreground">{relative(row.original.receivedAt)}</p>
        </div>
      ),
    },
    { accessorKey: "rows", header: "Rows", meta: { align: "right" }, cell: ({ row }) => num(row.original.rows) },
    { accessorKey: "posted", header: "Posted", meta: { align: "right" }, cell: ({ row }) => num(row.original.posted) },
    { accessorKey: "held", header: "Held for review", meta: { align: "right", label: "Held for review" }, cell: ({ row }) => num(row.original.held) },
    { accessorKey: "failed", header: "Failed", meta: { align: "right" }, cell: ({ row }) => num(row.original.failed) },
    {
      id: "issue",
      accessorFn: (r) => r.issue ?? "",
      header: "Issue",
      meta: { wrap: true },
      cell: ({ row }) => <span className="text-[13px] text-muted-foreground">{row.original.issue ?? "—"}</span>,
    },
    { id: "status", accessorKey: "status", header: "Status", cell: ({ row }) => <ImportStatus batch={row.original} /> },
  ]

  const open = rows.find((r) => r.id === openId)

  return (
    <ListPage
      primary={
        <Button onClick={() => toast("Uploading a file is mocked in the prototype")}>
          <FolderInput />
          Import file
        </Button>
      }
      kpis={[
        { id: "today", label: "Batches today", value: big(today.length), hint: `${rows.length} batches in all` },
        { id: "posted", label: "Rows posted", value: big(rows.reduce((t, r) => t + r.posted, 0)), hint: "Into your books" },
        { id: "held", label: "Held for review", value: big(heldTotal(rows)), hint: <HeldHint>Need a person to check</HeldHint>, tone: heldTotal(rows) ? "warning" : "default" },
        { id: "failed", label: "Failed", value: big(rows.reduce((t, r) => t + r.failed, 0)), hint: "Couldn't be read or matched", tone: rows.some((r) => r.failed) ? "warning" : "default" },
      ]}
      activeKpi={kpi}
      onKpiSelect={(id) => setKpi((k) => (k === id ? undefined : (id as KpiId)))}
      tabs={tabs}
      tab={tab}
      onTabChange={setTab}
      columns={columns}
      data={data}
      getRowId={(r) => r.id}
      onRowClick={(r) => setOpenId(r.id)}
      hiddenColumns={["issue"]}
      searchPlaceholder="Search imports"
      filters={
        <FilterChip
          label="Connection"
          value={source}
          onChange={setSource}
          options={connections.filter((c) => c.connected).map((c) => ({ value: c.id, label: c.name }))}
        />
      }
      empty={<EmptyState icon={FolderInput} title="No import batches here" description="Try another tab or clear the filters." />}
    >
      <EntityDrawer
        open={!!open}
        onOpenChange={(o) => !o && setOpenId(null)}
        code={open?.id}
        title={open?.source ?? ""}
        subtitle={open ? `Received ${fmtDateTime(open.receivedAt)} · ${relative(open.receivedAt)}` : undefined}
        status={open && <ImportStatus batch={open} />}
        actions={
          open &&
          (open.status === "needs_attention" ? (
            <Button onClick={() => toast.success(`${open.id}: fixes applied and rows re-queued`)}>
              <Wrench />
              Fix
            </Button>
          ) : open.status === "processing" ? (
            <Button variant="outline" onClick={() => toast(`${open.id}: checking again`)}>
              <RefreshCw />
              Check again
            </Button>
          ) : null)
        }
      >
        {open && (
          <>
            {open.issue && (
              <Banner tone={open.failed > 0 ? "error" : "warning"} title="What needs fixing">
                {open.issue}
              </Banner>
            )}
            {open.status === "processing" && (
              <Banner tone="info" title="Still waiting for rows">
                The till hasn&apos;t sent anything since {fmtDateTime(open.receivedAt)}. It may be offline.
              </Banner>
            )}
            <DrawerSection title="Rows">
              <FactList
                items={[
                  { label: "Received", value: num(open.rows) },
                  { label: "Posted", value: num(open.posted) },
                  { label: "Held for review", value: <span>{num(open.held)} <span className="text-xs text-muted-foreground">· {HELD_DEFINITION}</span></span> },
                  { label: "Failed", value: num(open.failed) },
                ]}
              />
            </DrawerSection>
          </>
        )}
      </EntityDrawer>
    </ListPage>
  )
}

