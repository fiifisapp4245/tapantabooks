"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, ReceiptText } from "lucide-react"
import { usePrefs } from "@/lib/store"
import { fmtDate, TODAY } from "@/lib/dates"
import { billRows, docSummary, useSelect, type DocRow } from "@/lib/selectors"
import { useLedger } from "@/lib/ledger"
import type { Bill } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ListPage } from "@/components/patterns/list-page"
import { FilterChip } from "@/components/patterns/filter-chip"
import { EmptyState } from "@/components/patterns/empty-state"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Money, MoneyCell } from "@/components/patterns/money"
import { Code } from "@/components/patterns/text"
import type { Kpi } from "@/components/patterns/kpi-strip"
import { BillDrawer } from "@/components/bills/bill-drawer"
import { branchName, branchOptions } from "@/components/bills/shared"

type Row = DocRow<Bill>

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`

const COLUMNS: ColumnDef<Row, unknown>[] = [
  { accessorKey: "id", header: "Number", cell: ({ getValue }) => <Code>{getValue<string>()}</Code>, meta: { width: "120px" } },
  { id: "supplier", accessorFn: (r) => r.contact.name, header: "Supplier", cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span> },
  { id: "reference", accessorFn: (r) => r.reference ?? "", header: "Supplier ref", cell: ({ getValue }) => <Code>{getValue<string>() || "—"}</Code> },
  { accessorKey: "issueDate", header: "Bill date", cell: ({ getValue }) => <span className="text-muted-foreground">{fmtDate(getValue<string>())}</span> },
  { accessorKey: "dueDate", header: "Due", cell: ({ getValue }) => <span className="text-muted-foreground">{fmtDate(getValue<string>())}</span> },
  { id: "branch", accessorFn: (r) => branchName(r.branch), header: "Branch" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} days={row.original.daysOverdue || undefined} /> },
  { accessorKey: "total", header: "Amount", cell: ({ row }) => <MoneyCell amount={row.original.total} currency={row.original.currency} />, meta: { align: "right" } },
]

const TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "unpaid", label: "Unpaid" },
  { id: "part_paid", label: "Part paid" },
  { id: "overdue", label: "Overdue" },
  { id: "paid", label: "Paid" },
] as const

export default function BillsPage() {
  const rows = useSelect(billRows)
  const summary = useSelect((s) => docSummary(s, billRows(s)))
  const payments = useLedger((s) => s.payments)
  const contacts = useLedger((s) => s.contacts)
  const [tab, setTab] = React.useState("all")
  const [kpi, setKpi] = React.useState<string>()
  const [branch, setBranch] = React.useState<string>()
  const [supplier, setSupplier] = React.useState<string>()
  const [openId, setOpenId] = React.useState<string | null>(null)

  const paidThisMonth = React.useMemo(() => {
    const monthStart = TODAY.slice(0, 8) + "01"
    return new Set(payments.filter((p) => p.docId?.startsWith("BILL-") && p.date >= monthStart && p.date <= TODAY).map((p) => p.docId!))
  }, [payments])

  const kpis: Kpi[] = [
    { id: "outstanding", label: "To pay", value: <Money amount={summary.outstanding.amount} size="kpi" />, hint: plural(summary.outstanding.count, "bill") },
    { id: "overdue", label: "Overdue", value: <Money amount={summary.overdue.amount} size="kpi" />, hint: plural(summary.overdue.count, "bill"), tone: summary.overdue.count ? "warning" : "default" },
    { id: "dueSoon", label: "Due in 7 days", value: <Money amount={summary.dueSoon.amount} size="kpi" />, hint: `${plural(summary.dueSoon.count, "bill")} · excludes overdue` },
    { id: "paid", label: "Paid this month", value: <Money amount={summary.settledThisMonth.amount} size="kpi" />, hint: plural(summary.settledThisMonth.count, "payment") },
  ]

  // Branch, supplier and KPI narrow the rows; tabs then count within them.
  const scoped = rows.filter(
    (r) =>
      (!branch || r.branch === branch) &&
      (!supplier || r.contactId === supplier) &&
      (kpi === "outstanding"
        ? summary.filters.open(r)
        : kpi === "overdue"
          ? r.status === "overdue"
          : kpi === "dueSoon"
            ? summary.filters.dueSoon(r)
            : kpi === "paid"
              ? paidThisMonth.has(r.id)
              : true)
  )
  const tabs = TABS.map((t) => ({ ...t, count: t.id === "all" ? scoped.length : scoped.filter((r) => r.status === t.id).length }))
  const data = tab === "all" ? scoped : scoped.filter((r) => r.status === tab)

  const supplierOptions = contacts.filter((c) => c.kind === "supplier").map((c) => ({ value: c.id, label: c.name }))
  const clear = () => {
    setTab("all")
    setKpi(undefined)
    setBranch(undefined)
    setSupplier(undefined)
  }

  return (
    <ListPage
      primary={
        <Button onClick={() => usePrefs.getState().openForm("bill")}>
          <Plus />
          New bill
        </Button>
      }
      kpis={kpis}
      activeKpi={kpi}
      onKpiSelect={(id) => {
        setKpi(id === kpi ? undefined : id)
        setTab("all")
      }}
      tabs={tabs}
      tab={tab}
      onTabChange={setTab}
      columns={COLUMNS}
      data={data}
      getRowId={(r) => r.id}
      onRowClick={(r) => setOpenId(r.id)}
      hiddenColumns={["reference", "branch"]}
      searchPlaceholder="Search bills"
      filters={
        <>
          <FilterChip label="Branch" value={branch} onChange={setBranch} options={branchOptions} />
          <FilterChip label="Supplier" value={supplier} onChange={setSupplier} options={supplierOptions} />
        </>
      }
      empty={
        rows.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No bills yet"
            description="Add the first bill a supplier sent you."
            action={<Button onClick={() => usePrefs.getState().openForm("bill")}>New bill</Button>}
          />
        ) : (
          <EmptyState icon={ReceiptText} title="No bills match" description="Try another tab or clear the filters." action={<Button variant="outline" onClick={clear}>Clear filters</Button>} />
        )
      }
    >
      <BillDrawer billId={openId} onClose={() => setOpenId(null)} />
    </ListPage>
  )
}
