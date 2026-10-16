"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowDownLeft, Plus } from "lucide-react"
import { usePrefs } from "@/lib/store"
import { useLedger } from "@/lib/ledger"
import { BRANCHES } from "@/lib/constants"
import { fmtDate, TODAY } from "@/lib/dates"
import type { Payment } from "@/lib/types"
import { accountName, contactName, useSelect } from "@/lib/selectors"
import { r2 } from "@/lib/mock/seed"
import { Button } from "@/components/ui/button"
import { ListPage } from "@/components/patterns/list-page"
import { FilterChip } from "@/components/patterns/filter-chip"
import { EmptyState } from "@/components/patterns/empty-state"
import { DrawerSection, EntityDrawer, FactList } from "@/components/patterns/entity-drawer"
import { JournalLines } from "@/components/patterns/journal-lines"
import { Money, MoneyCell } from "@/components/patterns/money"
import { Code } from "@/components/patterns/text"
import type { Kpi } from "@/components/patterns/kpi-strip"
import { branchName } from "@/components/invoices/helpers"

type Row = Payment & { from: string; paidInto: string }

const METHODS: Payment["method"][] = ["Bank transfer", "MTN MoMo", "Cash", "Cheque"]
const MONTH_START = TODAY.slice(0, 8) + "01"
const YEAR_START = TODAY.slice(0, 5) + "01-01"

const TABS = [
  { id: "all", label: "All" },
  { id: "invoices", label: "From invoices" },
  { id: "other", label: "Other money in" },
]

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "id", header: "Number", cell: ({ row }) => <Code>{row.original.id}</Code>, meta: { width: "120px" } },
  { accessorKey: "date", header: "Date", cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.date)}</span> },
  {
    accessorKey: "from",
    header: "From",
    cell: ({ row }) => <span className="font-medium">{row.original.from}</span>,
  },
  {
    accessorKey: "docId",
    header: "Invoice",
    cell: ({ row }) => (row.original.docId ? <Code>{row.original.docId}</Code> : <span className="text-muted-foreground">—</span>),
  },
  { accessorKey: "method", header: "Method" },
  { accessorKey: "paidInto", header: "Paid into", cell: ({ row }) => <span className="text-muted-foreground">{row.original.paidInto}</span> },
  {
    id: "amount",
    accessorFn: (r) => r.amount * r.rate,
    header: "Amount",
    meta: { align: "right" },
    cell: ({ row }) => <MoneyCell amount={row.original.amount} currency={row.original.currency} />,
  },
]

export default function PaymentsReceivedPage() {
  const rows = useSelect((s) =>
    s.payments
      .filter((p) => p.direction === "in")
      .map<Row>((p) => ({
        ...p,
        // Money in without a contact is named by what it was for.
        from: contactName(s, p.contactId) || (p.categoryCode ? accountName(s, p.categoryCode) : "—"),
        paidInto: accountName(s, p.accountCode),
      }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  )
  const [tab, setTab] = React.useState("all")
  const [kpi, setKpi] = React.useState<string>()
  const [method, setMethod] = React.useState<string>()
  const [branch, setBranch] = React.useState<string>()
  const [openId, setOpenId] = React.useState<string | null>(null)

  const base = (p: Row) => r2(p.amount * p.rate)
  const sum = (xs: Row[]) => r2(xs.reduce((t, p) => t + base(p), 0))
  const thisYear = rows.filter((p) => p.date >= YEAR_START && p.date <= TODAY)
  const thisMonth = thisYear.filter((p) => p.date >= MONTH_START)
  const momo = thisYear.filter((p) => p.method === "MTN MoMo")
  const count = (n: number) => `${n} ${n === 1 ? "payment" : "payments"}`
  const kpis: Kpi[] = [
    { id: "month", label: "Received this month", value: <Money amount={sum(thisMonth)} size="kpi" />, hint: count(thisMonth.length) },
    { id: "year", label: "Received this year", value: <Money amount={sum(thisYear)} size="kpi" />, hint: count(thisYear.length) },
    { id: "momo", label: "Via MoMo", value: <Money amount={sum(momo)} size="kpi" />, hint: `${count(momo.length)} this year` },
    // Every receipt here is applied to an invoice or a category when recorded.
    { id: "unapplied", label: "Unapplied", value: <Money amount={0} size="kpi" />, hint: "Nothing waiting to be matched" },
  ]
  const kpiFilter = (p: Row) =>
    kpi === "month" ? p.date >= MONTH_START && p.date <= TODAY : kpi === "year" ? p.date >= YEAR_START && p.date <= TODAY : kpi === "momo" ? p.method === "MTN MoMo" && p.date >= YEAR_START : kpi === "unapplied" ? false : true

  const filtered = rows.filter((p) => kpiFilter(p) && (!method || p.method === method) && (!branch || p.branch === branch))
  const inTab = (id: string) => (p: Row) => (id === "invoices" ? !!p.docId : id === "other" ? !p.docId : true)
  const data = filtered.filter(inTab(tab))
  const tabs = TABS.map((t) => ({ ...t, count: filtered.filter(inTab(t.id)).length }))

  return (
    <ListPage
      primary={
        <Button onClick={() => usePrefs.getState().openForm("money-in")}>
          <Plus />
          Record money in
        </Button>
      }
      kpis={kpis}
      activeKpi={kpi}
      onKpiSelect={(id) => setKpi(id === kpi ? undefined : id)}
      tabs={tabs}
      tab={tab}
      onTabChange={setTab}
      columns={columns}
      data={data}
      getRowId={(r) => r.id}
      onRowClick={(r) => setOpenId(r.id)}
      searchPlaceholder="Search payments"
      filters={
        <>
          <FilterChip label="Method" value={method} onChange={setMethod} options={METHODS.map((m) => ({ value: m, label: m }))} />
          <FilterChip label="Branch" value={branch} onChange={setBranch} options={BRANCHES.slice(1).map((b) => ({ value: b.id, label: b.name }))} />
        </>
      }
      empty={
        <EmptyState
          icon={ArrowDownLeft}
          title={kpi === "unapplied" ? "Nothing unapplied" : "No payments match"}
          description={kpi === "unapplied" ? "Every payment is matched to an invoice or a category." : "Try another tab or clear the filters."}
          action={
            <Button
              variant="outline"
              onClick={() => {
                setKpi(undefined)
                setTab("all")
                setMethod(undefined)
                setBranch(undefined)
              }}
            >
              Clear filters
            </Button>
          }
        />
      }
    >
      <PaymentDrawer payment={rows.find((r) => r.id === openId)} onClose={() => setOpenId(null)} />
    </ListPage>
  )
}

function PaymentDrawer({ payment: p, onClose }: { payment?: Row; onClose: () => void }) {
  const s = useLedger()
  const journal = p ? s.journals.find((j) => j.id === p.journalId) : undefined
  return (
    <EntityDrawer
      open={!!p}
      onOpenChange={(o) => !o && onClose()}
      code={p?.id}
      title={p?.from ?? ""}
      subtitle={p ? `${fmtDate(p.date)} · ${p.method} · into ${p.paidInto}` : undefined}
      amount={p?.amount}
      currency={p?.currency}
      amountLabel="Received"
    >
      {p && (
        <>
          <DrawerSection title="Summary">
            <FactList
              items={[
                { label: "From", value: p.from },
                { label: "Invoice", value: p.docId ? <Code>{p.docId}</Code> : "None – other money in" },
                ...(p.categoryCode ? [{ label: "What it was for", value: accountName(s, p.categoryCode) }] : []),
                { label: "Method", value: p.method },
                { label: "Paid into", value: p.paidInto },
                { label: "Branch", value: branchName(p.branch) },
                ...(p.currency !== "GHS" ? [{ label: "In GH₵", value: <Money amount={r2(p.amount * p.rate)} /> }] : []),
                ...(p.memo ? [{ label: "Memo", value: p.memo }] : []),
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
              <p className="text-sm text-muted-foreground">No journal found for this payment.</p>
            )}
          </DrawerSection>
        </>
      )}
    </EntityDrawer>
  )
}
