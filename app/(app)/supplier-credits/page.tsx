"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Download, Receipt } from "lucide-react"
import { toast } from "sonner"
import { fmtDate, TODAY } from "@/lib/dates"
import { useSelect } from "@/lib/selectors"
import { useLedger } from "@/lib/ledger"
import type { CreditNote } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ListPage } from "@/components/patterns/list-page"
import { FilterChip } from "@/components/patterns/filter-chip"
import { EmptyState } from "@/components/patterns/empty-state"
import { StatusBadge, type Status } from "@/components/patterns/status-badge"
import { Money, MoneyCell } from "@/components/patterns/money"
import { Code } from "@/components/patterns/text"
import { DrawerSection, EntityDrawer, FactList } from "@/components/patterns/entity-drawer"
import { JournalLines } from "@/components/patterns/journal-lines"
import type { Kpi } from "@/components/patterns/kpi-strip"
import { JournalDrawer } from "@/components/drawers/journal-drawer"
import { BillDrawer } from "@/components/bills/bill-drawer"
import { branchName, branchOptions, r2 } from "@/components/bills/shared"

type Row = CreditNote & { supplier: string; remaining: number }

/** StatusBadge has no "Applied"; a fully used credit reads as Closed. */
const badge = (s: CreditNote["status"]): Status => (s === "open" ? "open" : s === "void" ? "void" : "applied")

const COLUMNS: ColumnDef<Row, unknown>[] = [
  { accessorKey: "id", header: "Number", cell: ({ getValue }) => <Code>{getValue<string>()}</Code>, meta: { width: "110px" } },
  { accessorKey: "supplier", header: "Supplier", cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span> },
  { accessorKey: "date", header: "Date", cell: ({ getValue }) => <span className="text-muted-foreground">{fmtDate(getValue<string>())}</span> },
  { accessorKey: "reason", header: "Reason", meta: { wrap: true } },
  { id: "branch", accessorFn: (r) => branchName(r.branch), header: "Branch" },
  { id: "remaining", accessorKey: "remaining", header: "Left to use", cell: ({ getValue }) => <MoneyCell amount={getValue<number>()} />, meta: { align: "right" } },
  { accessorKey: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={badge(getValue<CreditNote["status"]>())} /> },
  { accessorKey: "total", header: "Amount", cell: ({ getValue }) => <MoneyCell amount={getValue<number>()} />, meta: { align: "right" } },
]

export default function SupplierCreditsPage() {
  const rows = useSelect((s) =>
    s.creditNotes
      .filter((c) => c.kind === "supplier_credit")
      .map((c): Row => ({ ...c, supplier: s.contacts.find((x) => x.id === c.contactId)?.name ?? "—", remaining: c.status === "void" ? 0 : r2(c.total - c.applied) }))
      .sort((a, b) => b.id.localeCompare(a.id))
  )
  const contacts = useLedger((s) => s.contacts)
  const [tab, setTab] = React.useState("all")
  const [kpi, setKpi] = React.useState<string>()
  const [branch, setBranch] = React.useState<string>()
  const [supplier, setSupplier] = React.useState<string>()
  const [openId, setOpenId] = React.useState<string | null>(null)

  const year = TODAY.slice(0, 4)
  const open = rows.filter((r) => r.status === "open")
  const thisYear = rows.filter((r) => r.date.startsWith(year) && r.status !== "void")
  const kpis: Kpi[] = [
    { id: "open", label: "Credit to use", value: <Money amount={r2(open.reduce((t, r) => t + r.remaining, 0))} size="kpi" />, hint: `${open.length} open` },
    { id: "year", label: "Received this year", value: <Money amount={r2(thisYear.reduce((t, r) => t + r.total, 0))} size="kpi" />, hint: `${thisYear.length} credits` },
  ]

  const scoped = rows.filter(
    (r) =>
      (!branch || r.branch === branch) &&
      (!supplier || r.contactId === supplier) &&
      (kpi === "open" ? r.status === "open" : kpi === "year" ? r.date.startsWith(year) && r.status !== "void" : true)
  )
  const tabs = [
    { id: "all", label: "All", count: scoped.length },
    { id: "open", label: "Open", count: scoped.filter((r) => r.status === "open").length },
    { id: "applied", label: "Applied", count: scoped.filter((r) => r.status === "applied").length },
  ]
  const data = tab === "all" ? scoped : scoped.filter((r) => r.status === tab)
  const clear = () => {
    setTab("all")
    setKpi(undefined)
    setBranch(undefined)
    setSupplier(undefined)
  }

  return (
    <ListPage
      kpis={kpis}
      activeKpi={kpi}
      onKpiSelect={(id) => setKpi(id === kpi ? undefined : id)}
      tabs={tabs}
      tab={tab}
      onTabChange={setTab}
      columns={COLUMNS}
      data={data}
      getRowId={(r) => r.id}
      onRowClick={(r) => setOpenId(r.id)}
      hiddenColumns={["branch", "remaining"]}
      searchPlaceholder="Search supplier credits"
      filters={
        <>
          <FilterChip label="Branch" value={branch} onChange={setBranch} options={branchOptions} />
          <FilterChip label="Supplier" value={supplier} onChange={setSupplier} options={contacts.filter((c) => c.kind === "supplier").map((c) => ({ value: c.id, label: c.name }))} />
        </>
      }
      empty={<EmptyState icon={Receipt} title="No supplier credits match" description="Try another tab or clear the filters." action={<Button variant="outline" onClick={clear}>Clear filters</Button>} />}
    >
      <CreditDrawer row={rows.find((r) => r.id === openId)} onClose={() => setOpenId(null)} />
    </ListPage>
  )
}

function CreditDrawer({ row, onClose }: { row?: Row; onClose: () => void }) {
  const accounts = useLedger((s) => s.accounts)
  const journal = useLedger((s) => s.journals.find((j) => j.id === row?.journalId))
  const [journalId, setJournalId] = React.useState<string | null>(null)
  const [billId, setBillId] = React.useState<string | null>(null)
  const name = (code: string) => accounts.find((a) => a.code === code)?.name ?? code
  return (
    <>
      <EntityDrawer
        open={!!row && !journalId && !billId}
        onOpenChange={(o) => !o && onClose()}
        code={row?.id}
        title={row?.supplier ?? ""}
        subtitle={row ? `${fmtDate(row.date)} · ${branchName(row.branch)}` : undefined}
        status={row && <StatusBadge status={badge(row.status)} />}
        amount={row ? (row.status === "open" ? row.remaining : row.total) : undefined}
        amountLabel={row?.status === "open" ? "Left to use" : "Credit total"}
        actions={
          row && (
            <Button variant="outline" onClick={() => toast(`${row.id} downloaded`, { description: "PDF downloads are mocked in the prototype." })}>
              <Download />
              Download
            </Button>
          )
        }
      >
        {row && (
          <>
            <DrawerSection title="Summary">
              <FactList
                items={[
                  { label: "Reason", value: row.reason },
                  {
                    label: "Against bill",
                    value: row.docId ? (
                      <button type="button" className="font-mono text-[13px] underline underline-offset-4" onClick={() => setBillId(row.docId!)}>
                        {row.docId}
                      </button>
                    ) : (
                      "Not linked to a bill"
                    ),
                  },
                  { label: "Before VAT", value: <Money amount={row.amount} size="sm" /> },
                  { label: "VAT", value: <Money amount={row.tax} size="sm" /> },
                  { label: "Total", value: <Money amount={row.total} size="sm" /> },
                  { label: "Used so far", value: <Money amount={row.applied} size="sm" /> },
                ]}
              />
            </DrawerSection>
            <DrawerSection
              title="What it posted"
              action={
                journal && (
                  <Button variant="ghost" size="sm" onClick={() => setJournalId(journal.id)}>
                    Open {journal.id}
                  </Button>
                )
              }
            >
              {journal ? (
                <JournalLines lines={journal.lines.map((l) => ({ ...l, accountName: name(l.accountCode) }))} />
              ) : (
                <p className="text-sm text-muted-foreground">No journal is linked to this credit.</p>
              )}
            </DrawerSection>
          </>
        )}
      </EntityDrawer>
      <JournalDrawer journalId={journalId} onClose={() => setJournalId(null)} />
      <BillDrawer billId={billId} onClose={() => setBillId(null)} />
    </>
  )
}
