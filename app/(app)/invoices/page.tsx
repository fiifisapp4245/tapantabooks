"use client"

import { useRouter } from "next/navigation"
import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { FileText, Plus } from "lucide-react"
import { usePrefs } from "@/lib/store"
import { BRANCHES, CURRENCIES } from "@/lib/constants"
import { fmtDate, TODAY } from "@/lib/dates"
import type { Invoice } from "@/lib/types"
import { docSummary, invoiceRows, useSelect, type DocRow } from "@/lib/selectors"
import { Button } from "@/components/ui/button"
import { ListPage } from "@/components/patterns/list-page"
import { FilterChip } from "@/components/patterns/filter-chip"
import { EmptyState } from "@/components/patterns/empty-state"
import { StatusBadge, type Status } from "@/components/patterns/status-badge"
import { Money, MoneyCell } from "@/components/patterns/money"
import { Code } from "@/components/patterns/text"
import type { Kpi } from "@/components/patterns/kpi-strip"
import { InvoiceDrawer } from "@/components/invoices/invoice-drawer"
import { branchName, dueHint, isOpenStatus } from "@/components/invoices/helpers"

type Row = DocRow<Invoice>

const TABS: { id: string; label: string; status?: Status }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft", status: "draft" },
  { id: "awaiting_approval", label: "Awaiting approval", status: "awaiting_approval" },
  { id: "unpaid", label: "Unpaid", status: "unpaid" },
  { id: "part_paid", label: "Part paid", status: "part_paid" },
  { id: "overdue", label: "Overdue", status: "overdue" },
  { id: "paid", label: "Paid", status: "paid" },
  { id: "void", label: "Void", status: "void" },
]

const ROUTES: Invoice["deliveryRoute"][] = ["Local", "Export (overseas)"]

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "id", header: "Number", cell: ({ row }) => <Code>{row.original.id}</Code>, meta: { width: "110px" } },
  {
    id: "customer",
    accessorFn: (r) => r.contact.name,
    header: "Customer",
    cell: ({ row }) => <span className="font-medium">{row.original.contact.name}</span>,
  },
  {
    accessorKey: "issueDate",
    header: "Issued",
    cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.issueDate)}</span>,
  },
  {
    accessorKey: "dueDate",
    header: "Due",
    cell: ({ row }) => {
      const hint = dueHint(row.original)
      return (
        <div className="leading-tight">
          <p className="text-muted-foreground">{fmtDate(row.original.dueDate)}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      )
    },
  },
  { id: "branch", accessorFn: (r) => branchName(r.branch), header: "Branch" },
  { accessorKey: "currency", header: "Currency", cell: ({ row }) => <Code>{row.original.currency}</Code> },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} days={row.original.daysOverdue || undefined} />,
  },
  {
    id: "amount",
    // Sort on the GH₵ value so dollar invoices sit in the right place.
    accessorFn: (r) => (isOpenStatus(r.status) ? r.baseBalance : r.baseTotal),
    header: "Amount due / Total",
    meta: { align: "right", label: "Amount" },
    cell: ({ row }) => {
      const r = row.original
      const open = isOpenStatus(r.status)
      return (
        <div className="leading-tight">
          <MoneyCell amount={open ? r.balance : r.total} currency={r.currency} />
          {r.status === "part_paid" || (r.status === "overdue" && r.paid > 0) ? (
            <p className="text-right text-xs text-muted-foreground">
              of <Money amount={r.total} currency={r.currency} size="sm" className="text-xs" />
            </p>
          ) : null}
        </div>
      )
    },
  },
]

export default function InvoicesPage() {
  const { rows, summary, collectedIds } = useSelect((s) => {
    const rows = invoiceRows(s)
    const monthStart = TODAY.slice(0, 8) + "01"
    const collectedIds = new Set(
      s.payments.filter((p) => p.docId?.startsWith("INV-") && p.date >= monthStart && p.date <= TODAY).map((p) => p.docId!)
    )
    return { rows, summary: docSummary(s, rows), collectedIds }
  })
  const [tab, setTab] = React.useState("all")
  const [kpi, setKpi] = React.useState<string>()
  const [branch, setBranch] = React.useState<string>()
  const [currency, setCurrency] = React.useState<string>()
  const [route, setRoute] = React.useState<string>()
  const router = useRouter()
  const [openId, setOpenId] = React.useState<string | null>(null)

  const chipFiltered = rows.filter(
    (r) => (!branch || r.branch === branch) && (!currency || r.currency === currency) && (!route || r.deliveryRoute === route)
  )
  const kpiFilter = (r: Row) =>
    kpi === "outstanding"
      ? summary.filters.open(r)
      : kpi === "overdue"
        ? r.status === "overdue"
        : kpi === "dueSoon"
          ? summary.filters.dueSoon(r)
          : kpi === "collected"
            ? collectedIds.has(r.id)
            : true
  const base = chipFiltered.filter(kpiFilter)
  const tabStatus = TABS.find((t) => t.id === tab)?.status
  const data = base.filter((r) => !tabStatus || r.status === tabStatus)
  const tabs = TABS.map((t) => ({ id: t.id, label: t.label, count: t.status ? base.filter((r) => r.status === t.status).length : base.length }))

  const plural = (n: number) => `${n} ${n === 1 ? "invoice" : "invoices"}`
  const kpis: Kpi[] = [
    { id: "outstanding", label: "Outstanding", value: <Money amount={summary.outstanding.amount} size="kpi" />, hint: plural(summary.outstanding.count) },
    { id: "overdue", label: "Overdue", value: <Money amount={summary.overdue.amount} size="kpi" />, hint: plural(summary.overdue.count), tone: "warning" },
    { id: "dueSoon", label: "Due in 7 days", value: <Money amount={summary.dueSoon.amount} size="kpi" />, hint: `${plural(summary.dueSoon.count)} · excludes overdue` },
    {
      id: "collected",
      label: "Collected this month",
      value: <Money amount={summary.settledThisMonth.amount} size="kpi" />,
      hint: `${summary.settledThisMonth.count} ${summary.settledThisMonth.count === 1 ? "payment" : "payments"}`,
    },
  ]

  const clear = () => {
    setTab("all")
    setKpi(undefined)
    setBranch(undefined)
    setCurrency(undefined)
    setRoute(undefined)
  }

  return (
    <ListPage
      primary={
        <Button onClick={() => usePrefs.getState().openForm("invoice")}>
          <Plus />
          Create invoice
        </Button>
      }
      more={[{ label: "Import invoices" }, { label: "Reminder settings" }]}
      kpis={kpis}
      activeKpi={kpi}
      onKpiSelect={(id) => {
        setKpi(id === kpi ? undefined : id)
        setTab("all")
      }}
      tabs={tabs}
      tab={tab}
      onTabChange={setTab}
      columns={columns}
      data={data}
      getRowId={(r) => r.id}
      onRowClick={(r) => (r.status === "draft" ? router.push(`/invoices/edit?id=${r.id}&step=items`) : setOpenId(r.id))}
      hiddenColumns={["branch", "currency"]}
      searchPlaceholder="Search invoices"
      filters={
        <>
          <FilterChip label="Branch" value={branch} onChange={setBranch} options={BRANCHES.slice(1).map((b) => ({ value: b.id, label: b.name }))} />
          <FilterChip label="Currency" value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          <FilterChip label="Delivery route" value={route} onChange={setRoute} options={ROUTES.map((r) => ({ value: r, label: r }))} />
        </>
      }
      empty={
        rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Your first invoice takes about a minute."
            action={<Button onClick={() => usePrefs.getState().openForm("invoice")}><Plus />Create invoice</Button>}
          />
        ) : (
          <EmptyState icon={FileText} title="No invoices match" description="Try another tab or clear the filters." action={<Button variant="outline" onClick={clear}>Clear filters</Button>} />
        )
      }
    >
      <InvoiceDrawer invoiceId={openId} onClose={() => setOpenId(null)} />
    </ListPage>
  )
}
