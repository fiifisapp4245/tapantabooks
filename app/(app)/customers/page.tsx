"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, Users } from "lucide-react"
import { usePrefs } from "@/lib/store"
import { TODAY } from "@/lib/dates"
import type { Contact } from "@/lib/types"
import { ageingByContact, docSummary, invoiceRows, useSelect } from "@/lib/selectors"
import { r2 } from "@/lib/mock/seed"
import { Button } from "@/components/ui/button"
import { ListPage } from "@/components/patterns/list-page"
import { FilterChip } from "@/components/patterns/filter-chip"
import { EmptyState } from "@/components/patterns/empty-state"
import { Money, MoneyCell } from "@/components/patterns/money"
import type { Kpi } from "@/components/patterns/kpi-strip"
import { CustomerDrawer } from "@/components/customers/customer-drawer"

type Row = Contact & { owed: number; overdue: number; invoiceCount: number; paidThisMonth: boolean }

const TABS = [
  { id: "all", label: "All" },
  { id: "owe", label: "Owe you" },
  { id: "overdue", label: "Overdue" },
  { id: "none", label: "No balance" },
]

const inTab = (id: string) => (r: Row) => (id === "owe" ? r.owed > 0 : id === "overdue" ? r.overdue > 0 : id === "none" ? r.owed <= 0 : true)

const columns: ColumnDef<Row, unknown>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  { accessorKey: "city", header: "City", cell: ({ row }) => <span className="text-muted-foreground">{row.original.city}</span> },
  { accessorKey: "email", header: "Email", cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span> },
  { accessorKey: "phone", header: "Phone" },
  { id: "terms", accessorFn: (r) => r.termsDays, header: "Terms", cell: ({ row }) => `Net ${row.original.termsDays}` },
  { accessorKey: "currency", header: "Currency" },
  { accessorKey: "invoiceCount", header: "Invoices", meta: { align: "right" }, cell: ({ row }) => <span className="tabular">{row.original.invoiceCount}</span> },
  {
    accessorKey: "overdue",
    header: "Overdue",
    meta: { align: "right" },
    cell: ({ row }) => <MoneyCell amount={row.original.overdue} className={row.original.overdue ? "" : "text-muted-foreground"} />,
  },
  {
    accessorKey: "owed",
    header: "Owes you",
    meta: { align: "right" },
    cell: ({ row }) => <MoneyCell amount={row.original.owed} className={row.original.owed ? "" : "text-muted-foreground"} />,
  },
]

export default function CustomersPage() {
  const { rows, paidThisMonth } = useSelect((s) => {
    const inv = invoiceRows(s)
    // Same figures as the Who owes you report.
    const owed = new Map(ageingByContact(inv).map((e) => [e.contact.id, e]))
    const monthStart = TODAY.slice(0, 8) + "01"
    const invoiceContact = new Map(inv.map((r) => [r.id, r.contactId]))
    const paidIds = new Set(
      s.payments.filter((p) => p.docId && invoiceContact.has(p.docId) && p.date >= monthStart && p.date <= TODAY).map((p) => invoiceContact.get(p.docId!)!)
    )
    const rows = s.contacts
      .filter((c) => c.kind === "customer")
      .map<Row>((c) => {
        const e = owed.get(c.id)
        return {
          ...c,
          owed: e?.total ?? 0,
          overdue: e ? r2(e.total - e.buckets[0]) : 0,
          invoiceCount: inv.filter((r) => r.contactId === c.id).length,
          paidThisMonth: paidIds.has(c.id),
        }
      })
      .sort((a, b) => b.owed - a.owed || a.name.localeCompare(b.name))
    return { rows, paidThisMonth: docSummary(s, inv).settledThisMonth }
  })
  const [tab, setTab] = React.useState("all")
  const [kpi, setKpi] = React.useState<string>()
  const [city, setCity] = React.useState<string>()
  const [openId, setOpenId] = React.useState<string | null>(null)

  const owing = rows.filter((r) => r.owed > 0)
  const overdue = rows.filter((r) => r.overdue > 0)
  const sum = (xs: Row[], k: "owed" | "overdue") => r2(xs.reduce((t, r) => t + r[k], 0))
  const n = (x: number, word: string) => `${x} ${word}${x === 1 ? "" : "s"}`
  const kpis: Kpi[] = [
    { id: "customers", label: "Customers", value: <span className="font-heading text-[clamp(20px,11.5cqw,30px)] leading-tight font-semibold tabular">{rows.length}</span>, hint: `${owing.length} with a balance` },
    { id: "owe", label: "Owe you", value: <Money amount={sum(owing, "owed")} size="kpi" />, hint: n(owing.length, "customer") },
    { id: "overdue", label: "Overdue", value: <Money amount={sum(overdue, "overdue")} size="kpi" />, hint: n(overdue.length, "customer"), tone: "warning" },
    { id: "paid", label: "Paid this month", value: <Money amount={paidThisMonth.amount} size="kpi" />, hint: n(rows.filter((r) => r.paidThisMonth).length, "customer") },
  ]

  // Customers / Owe you / Overdue cards jump to the matching tab; Paid this month filters.
  const selectKpi = (id: string) => {
    if (id === "paid") {
      setKpi(kpi === "paid" ? undefined : "paid")
      setTab("all")
      return
    }
    setKpi(undefined)
    setTab(id === "customers" ? "all" : id)
  }
  const activeKpi = kpi ?? (tab === "owe" || tab === "overdue" ? tab : undefined)

  const filtered = rows.filter((r) => (kpi !== "paid" || r.paidThisMonth) && (!city || r.city === city))
  const data = filtered.filter(inTab(tab))
  const tabs = TABS.map((t) => ({ ...t, count: filtered.filter(inTab(t.id)).length }))
  const cities = [...new Set(rows.map((r) => r.city).filter(Boolean))].sort()

  return (
    <ListPage
      primary={
        <Button onClick={() => usePrefs.getState().openForm("customer")}>
          <Plus />
          New customer
        </Button>
      }
      kpis={kpis}
      activeKpi={activeKpi}
      onKpiSelect={selectKpi}
      tabs={tabs}
      tab={tab}
      onTabChange={setTab}
      columns={columns}
      data={data}
      getRowId={(r) => r.id}
      onRowClick={(r) => setOpenId(r.id)}
      hiddenColumns={["email", "phone", "terms", "currency"]}
      searchPlaceholder="Search customers"
      filters={<FilterChip label="City" value={city} onChange={setCity} options={cities.map((c) => ({ value: c, label: c }))} />}
      empty={
        rows.length === 0 ? (
          <EmptyState icon={Users} title="No customers yet" description="Add the people and businesses you sell to." action={<Button onClick={() => usePrefs.getState().openForm("customer")}><Plus />New customer</Button>} />
        ) : (
          <EmptyState
            icon={Users}
            title="No customers match"
            description="Try another tab or clear the filters."
            action={<Button variant="outline" onClick={() => { setTab("all"); setKpi(undefined); setCity(undefined) }}>Clear filters</Button>}
          />
        )
      }
    >
      <CustomerDrawer contact={rows.find((r) => r.id === openId)} onClose={() => setOpenId(null)} />
    </ListPage>
  )
}
