"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Truck } from "lucide-react"
import { usePrefs } from "@/lib/store"
import { fmtDate, TODAY } from "@/lib/dates"
import { billRows, docSummary, useSelect } from "@/lib/selectors"
import type { Contact } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ListPage } from "@/components/patterns/list-page"
import { EmptyState } from "@/components/patterns/empty-state"
import { Money, MoneyCell } from "@/components/patterns/money"
import type { Kpi } from "@/components/patterns/kpi-strip"
import { SupplierDrawer } from "@/components/suppliers/supplier-drawer"
import { r2 } from "@/components/bills/shared"

type Row = Contact & {
  openBills: number
  owed: number
  overdue: number
  dueSoon: boolean
  paidThisMonth: boolean
  lastBill?: string
}

const COLUMNS: ColumnDef<Row, unknown>[] = [
  { accessorKey: "name", header: "Supplier", cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span> },
  { accessorKey: "city", header: "City", cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>() || "—"}</span> },
  { accessorKey: "email", header: "Email", cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>() || "—"}</span> },
  { accessorKey: "phone", header: "Phone", cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>() || "—"}</span> },
  { accessorKey: "termsDays", header: "Terms", cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<number>()} days</span> },
  { accessorKey: "lastBill", header: "Last bill", cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>() ? fmtDate(getValue<string>()) : "—"}</span> },
  { accessorKey: "openBills", header: "Open bills", cell: ({ getValue }) => <div className="text-right tabular">{getValue<number>()}</div>, meta: { align: "right" } },
  {
    accessorKey: "overdue",
    header: "Overdue",
    cell: ({ getValue }) => (getValue<number>() ? <MoneyCell amount={getValue<number>()} className="text-warning" /> : <div className="text-right text-muted-foreground">—</div>),
    meta: { align: "right" },
  },
  { accessorKey: "owed", header: "You owe", cell: ({ getValue }) => <MoneyCell amount={getValue<number>()} />, meta: { align: "right" } },
]

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`

export default function SuppliersPage() {
  const { rows, summary } = useSelect((s) => {
    const bills = billRows(s)
    const summary = docSummary(s, bills)
    const monthStart = TODAY.slice(0, 8) + "01"
    const rows = s.contacts
      .filter((c) => c.kind === "supplier")
      .map((c): Row => {
        const mine = bills.filter((b) => b.contactId === c.id)
        const open = mine.filter(summary.filters.open)
        return {
          ...c,
          openBills: open.length,
          owed: r2(open.reduce((t, b) => t + b.baseBalance, 0)),
          overdue: r2(mine.filter((b) => b.status === "overdue").reduce((t, b) => t + b.baseBalance, 0)),
          dueSoon: mine.some(summary.filters.dueSoon),
          paidThisMonth: s.payments.some((p) => p.direction === "out" && p.contactId === c.id && p.date >= monthStart && p.date <= TODAY),
          lastBill: mine.filter((b) => b.docStatus === "posted").map((b) => b.issueDate).sort().at(-1),
        }
      })
      .sort((a, b) => b.owed - a.owed || a.name.localeCompare(b.name))
    return { rows, summary }
  })
  const [tab, setTab] = React.useState("all")
  const [kpi, setKpi] = React.useState<string>()
  const [openId, setOpenId] = React.useState<string | null>(null)

  const owing = rows.filter((r) => r.owed > 0)
  const overdue = rows.filter((r) => r.overdue > 0)
  const dueSoon = rows.filter((r) => r.dueSoon)
  const paid = rows.filter((r) => r.paidThisMonth)
  const kpis: Kpi[] = [
    { id: "owe", label: "You owe", value: <Money amount={summary.outstanding.amount} size="kpi" />, hint: plural(owing.length, "supplier") },
    { id: "overdue", label: "Overdue", value: <Money amount={summary.overdue.amount} size="kpi" />, hint: plural(overdue.length, "supplier"), tone: overdue.length ? "warning" : "default" },
    { id: "dueSoon", label: "Due in 7 days", value: <Money amount={summary.dueSoon.amount} size="kpi" />, hint: `${plural(dueSoon.length, "supplier")} · excludes overdue` },
    { id: "paid", label: "Paid this month", value: <Money amount={summary.settledThisMonth.amount} size="kpi" />, hint: plural(paid.length, "supplier") },
  ]

  const scoped = kpi === "owe" ? owing : kpi === "overdue" ? overdue : kpi === "dueSoon" ? dueSoon : kpi === "paid" ? paid : rows
  const tabs = [
    { id: "all", label: "All", count: scoped.length },
    { id: "owe", label: "You owe", count: scoped.filter((r) => r.owed > 0).length },
    { id: "overdue", label: "Overdue", count: scoped.filter((r) => r.overdue > 0).length },
    { id: "settled", label: "All paid up", count: scoped.filter((r) => r.owed <= 0).length },
  ]
  const data = scoped.filter((r) => (tab === "owe" ? r.owed > 0 : tab === "overdue" ? r.overdue > 0 : tab === "settled" ? r.owed <= 0 : true))

  return (
    <ListPage
      primary={
        <Button onClick={() => usePrefs.getState().openForm("supplier")}>
          <Plus />
          New supplier
        </Button>
      }
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
      hiddenColumns={["email", "phone", "termsDays", "lastBill"]}
      searchPlaceholder="Search suppliers"
      empty={
        <EmptyState
          icon={Truck}
          title="No suppliers match"
          description="Try another tab, or add a supplier."
          action={<Button variant="outline" onClick={() => { setTab("all"); setKpi(undefined) }}>Clear filters</Button>}
        />
      }
    >
      <SupplierDrawer contactId={openId} onClose={() => setOpenId(null)} />
    </ListPage>
  )
}
