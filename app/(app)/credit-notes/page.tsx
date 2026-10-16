"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { FileMinus, Plus } from "lucide-react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { BRANCHES } from "@/lib/constants"
import { fmtDate } from "@/lib/dates"
import type { CreditNote } from "@/lib/types"
import { accountName, contactName, useSelect } from "@/lib/selectors"
import { r2 } from "@/lib/mock/seed"
import { Button } from "@/components/ui/button"
import { ListPage } from "@/components/patterns/list-page"
import { FilterChip } from "@/components/patterns/filter-chip"
import { EmptyState } from "@/components/patterns/empty-state"
import { DrawerSection, EntityDrawer, FactList } from "@/components/patterns/entity-drawer"
import { JournalLines } from "@/components/patterns/journal-lines"
import { StatusBadge, type Status } from "@/components/patterns/status-badge"
import { Money, MoneyCell } from "@/components/patterns/money"
import { Code } from "@/components/patterns/text"
import { branchName } from "@/components/invoices/helpers"

type Row = CreditNote & { customer: string; remaining: number }

const TABS: { id: string; label: string; status?: CreditNote["status"] }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Open", status: "open" },
  { id: "applied", label: "Applied", status: "applied" },
  { id: "void", label: "Void", status: "void" },
]

// StatusBadge has no "Applied"; a fully used credit note reads as closed.
const BADGE: Record<CreditNote["status"], Status> = { open: "open", applied: "applied", void: "void" }

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "id", header: "Number", cell: ({ row }) => <Code>{row.original.id}</Code>, meta: { width: "110px" } },
  { accessorKey: "customer", header: "Customer", cell: ({ row }) => <span className="font-medium">{row.original.customer}</span> },
  { accessorKey: "date", header: "Date", cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.date)}</span> },
  {
    accessorKey: "docId",
    header: "Invoice",
    cell: ({ row }) => (row.original.docId ? <Code>{row.original.docId}</Code> : <span className="text-muted-foreground">—</span>),
  },
  { accessorKey: "reason", header: "Reason", meta: { wrap: true }, cell: ({ row }) => <span className="text-muted-foreground">{row.original.reason}</span> },
  { id: "branch", accessorFn: (r) => branchName(r.branch), header: "Branch" },
  {
    accessorKey: "remaining",
    header: "Left to use",
    meta: { align: "right" },
    cell: ({ row }) => <MoneyCell amount={row.original.remaining} />,
  },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={BADGE[row.original.status]} /> },
  { accessorKey: "total", header: "Total", meta: { align: "right" }, cell: ({ row }) => <MoneyCell amount={row.original.total} /> },
]

const mocked = () => toast("New credit note is mocked in the prototype")

export default function CreditNotesPage() {
  const rows = useSelect((s) =>
    s.creditNotes
      .filter((c) => c.kind === "credit_note")
      .map<Row>((c) => ({ ...c, customer: contactName(s, c.contactId), remaining: c.status === "void" ? 0 : r2(c.total - c.applied) }))
      .sort((a, b) => b.id.localeCompare(a.id))
  )
  const [tab, setTab] = React.useState("all")
  const [branch, setBranch] = React.useState<string>()
  const [openId, setOpenId] = React.useState<string | null>(null)

  const filtered = rows.filter((r) => !branch || r.branch === branch)
  const tabStatus = TABS.find((t) => t.id === tab)?.status
  const data = filtered.filter((r) => !tabStatus || r.status === tabStatus)
  const tabs = TABS.map((t) => ({ id: t.id, label: t.label, count: t.status ? filtered.filter((r) => r.status === t.status).length : filtered.length }))

  return (
    <ListPage
      primary={
        <Button onClick={mocked}>
          <Plus />
          New credit note
        </Button>
      }
      tabs={tabs}
      tab={tab}
      onTabChange={setTab}
      columns={columns}
      data={data}
      getRowId={(r) => r.id}
      onRowClick={(r) => setOpenId(r.id)}
      hiddenColumns={["branch", "remaining"]}
      searchPlaceholder="Search credit notes"
      filters={<FilterChip label="Branch" value={branch} onChange={setBranch} options={BRANCHES.slice(1).map((b) => ({ value: b.id, label: b.name }))} />}
      empty={
        rows.length === 0 ? (
          <EmptyState icon={FileMinus} title="No credit notes yet" description="Give one when a customer returns goods or you agree a lower price." action={<Button onClick={mocked}><Plus />New credit note</Button>} />
        ) : (
          <EmptyState
            icon={FileMinus}
            title="No credit notes match"
            description="Try another tab or clear the filters."
            action={<Button variant="outline" onClick={() => { setTab("all"); setBranch(undefined) }}>Clear filters</Button>}
          />
        )
      }
    >
      <CreditNoteDrawer note={rows.find((r) => r.id === openId)} onClose={() => setOpenId(null)} />
    </ListPage>
  )
}

function CreditNoteDrawer({ note: c, onClose }: { note?: Row; onClose: () => void }) {
  const s = useLedger()
  const journal = c?.journalId ? s.journals.find((j) => j.id === c.journalId) : undefined
  return (
    <EntityDrawer
      open={!!c}
      onOpenChange={(o) => !o && onClose()}
      code={c?.id}
      title={c?.customer ?? ""}
      subtitle={c ? `${fmtDate(c.date)} · ${c.reason}` : undefined}
      status={c && <StatusBadge status={BADGE[c.status]} />}
      amount={c?.total}
      amountLabel="Credit total"
      actions={
        c?.status === "open" && (
          <Button variant="outline" onClick={() => toast("Applying a credit note is mocked in the prototype")}>
            Apply to an invoice
          </Button>
        )
      }
    >
      {c && (
        <>
          <DrawerSection title="Summary">
            <FactList
              items={[
                { label: "Customer", value: c.customer },
                { label: "Against invoice", value: c.docId ? <Code>{c.docId}</Code> : "Not linked to an invoice" },
                { label: "Reason", value: c.reason },
                { label: "Branch", value: branchName(c.branch) },
                { label: "Before VAT", value: <Money amount={c.amount} /> },
                { label: "VAT", value: <Money amount={c.tax} /> },
                { label: "Used so far", value: <Money amount={c.applied} /> },
                { label: "Left to use", value: <Money amount={c.remaining} /> },
              ]}
            />
          </DrawerSection>
          <DrawerSection title="What this posted">
            {journal ? (
              <>
                <JournalLines lines={journal.lines.map((l) => ({ ...l, accountName: accountName(s, l.accountCode) }))} />
                <p className="text-xs text-muted-foreground">
                  <Code className="text-xs">{journal.id}</Code> · {fmtDate(journal.date)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing posted yet. The journal is posted when the credit is applied to an invoice.</p>
            )}
          </DrawerSection>
        </>
      )}
    </EntityDrawer>
  )
}
