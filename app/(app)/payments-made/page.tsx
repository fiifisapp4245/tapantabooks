"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpRight, Download, Plus } from "lucide-react"
import { toast } from "sonner"
import { usePrefs } from "@/lib/store"
import { fmtDate, monthKey, TODAY } from "@/lib/dates"
import { useSelect } from "@/lib/selectors"
import { useLedger } from "@/lib/ledger"
import type { Payment } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ListPage } from "@/components/patterns/list-page"
import { FilterChip } from "@/components/patterns/filter-chip"
import { EmptyState } from "@/components/patterns/empty-state"
import { Money, MoneyCell } from "@/components/patterns/money"
import { Code, Term } from "@/components/patterns/text"
import { DrawerSection, EntityDrawer, FactList } from "@/components/patterns/entity-drawer"
import { JournalLines } from "@/components/patterns/journal-lines"
import type { Kpi } from "@/components/patterns/kpi-strip"
import { JournalDrawer } from "@/components/drawers/journal-drawer"
import { BillDrawer } from "@/components/bills/bill-drawer"
import { branchName, branchOptions, r2 } from "@/components/bills/shared"

type Row = Payment & {
  paidTo: string
  /** What it paid: a bill number or the expense account. */
  forLabel: string
  fromName: string
  toSupplier: boolean
  wht: number
  base: number
}

const COLUMNS: ColumnDef<Row, unknown>[] = [
  { accessorKey: "id", header: "Number", cell: ({ getValue }) => <Code>{getValue<string>()}</Code>, meta: { width: "120px" } },
  { accessorKey: "date", header: "Date", cell: ({ getValue }) => <span className="text-muted-foreground">{fmtDate(getValue<string>())}</span> },
  { accessorKey: "paidTo", header: "Paid to", cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span> },
  {
    accessorKey: "forLabel",
    header: "For",
    cell: ({ row }) => (row.original.docId ? <Code>{row.original.docId}</Code> : <span className="text-muted-foreground">{row.original.forLabel}</span>),
  },
  { accessorKey: "fromName", header: "Paid from" },
  { accessorKey: "method", header: "Method", cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span> },
  { id: "branch", accessorFn: (r) => branchName(r.branch), header: "Branch" },
  { accessorKey: "amount", header: "Amount", cell: ({ row }) => <MoneyCell amount={row.original.amount} currency={row.original.currency} />, meta: { align: "right" } },
]

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`

export default function PaymentsMadePage() {
  const rows = useSelect((s) =>
    s.payments
      .filter((p) => p.direction === "out")
      .map((p): Row => {
        const contact = s.contacts.find((c) => c.id === p.contactId)
        const j = s.journals.find((x) => x.id === p.journalId)
        const wht = r2(j?.lines.filter((l) => l.accountCode === "2110").reduce((t, l) => t + l.credit - l.debit, 0) ?? 0)
        const account = (code?: string) => s.accounts.find((a) => a.code === code)?.name ?? code ?? ""
        return {
          ...p,
          paidTo: contact?.name ?? (p.memo || "—"),
          forLabel: p.docId ?? account(p.categoryCode),
          fromName: account(p.accountCode),
          toSupplier: !!p.docId?.startsWith("BILL-") || contact?.kind === "supplier",
          wht,
          base: r2(p.amount * p.rate),
        }
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  )
  const [tab, setTab] = React.useState("all")
  const [kpi, setKpi] = React.useState<string>()
  const [branch, setBranch] = React.useState<string>()
  const [method, setMethod] = React.useState<string>()
  const [openId, setOpenId] = React.useState<string | null>(null)

  const year = TODAY.slice(0, 4)
  const month = monthKey(TODAY)
  const isMonth = (r: Row) => monthKey(r.date) === month && r.date <= TODAY
  const isYear = (r: Row) => r.date.startsWith(year) && r.date <= TODAY
  const isMomo = (r: Row) => isYear(r) && r.method === "MTN MoMo"
  const isWht = (r: Row) => isYear(r) && r.wht > 0
  const sum = (xs: Row[], f: (r: Row) => number = (r) => r.base) => r2(xs.reduce((t, r) => t + f(r), 0))
  const m = rows.filter(isMonth)
  const y = rows.filter(isYear)
  const momo = rows.filter(isMomo)
  const wht = rows.filter(isWht)

  const kpis: Kpi[] = [
    { id: "month", label: "Paid this month", value: <Money amount={sum(m)} size="kpi" />, hint: plural(m.length, "payment") },
    { id: "year", label: "Paid this year", value: <Money amount={sum(y)} size="kpi" />, hint: plural(y.length, "payment") },
    { id: "momo", label: "Via MoMo", value: <Money amount={sum(momo)} size="kpi" />, hint: `${plural(momo.length, "payment")} this year` },
    {
      id: "wht",
      label: "WHT withheld this year",
      value: <Money amount={sum(wht, (r) => r.wht)} size="kpi" />,
      hint: <Term term="Withholding tax, owed to GRA (2110)">Owed to GRA</Term>,
    },
  ]

  const scoped = rows.filter(
    (r) =>
      (!branch || r.branch === branch) &&
      (!method || r.method === method) &&
      (kpi === "month" ? isMonth(r) : kpi === "year" ? isYear(r) : kpi === "momo" ? isMomo(r) : kpi === "wht" ? isWht(r) : true)
  )
  const tabs = [
    { id: "all", label: "All", count: scoped.length },
    { id: "suppliers", label: "To suppliers", count: scoped.filter((r) => r.toSupplier).length },
    { id: "other", label: "Other money out", count: scoped.filter((r) => !r.toSupplier).length },
  ]
  const data = tab === "all" ? scoped : scoped.filter((r) => (tab === "suppliers" ? r.toSupplier : !r.toSupplier))
  const clear = () => {
    setTab("all")
    setKpi(undefined)
    setBranch(undefined)
    setMethod(undefined)
  }

  return (
    <ListPage
      primary={
        <Button onClick={() => usePrefs.getState().openForm("money-out")}>
          <Plus />
          Record money out
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
      hiddenColumns={["fromName", "branch"]}
      searchPlaceholder="Search payments"
      filters={
        <>
          <FilterChip label="Branch" value={branch} onChange={setBranch} options={branchOptions} />
          <FilterChip label="Method" value={method} onChange={setMethod} options={["Bank transfer", "MTN MoMo", "Cash", "Cheque"].map((v) => ({ value: v, label: v }))} />
        </>
      }
      empty={<EmptyState icon={ArrowUpRight} title="No payments match" description="Try another tab or clear the filters." action={<Button variant="outline" onClick={clear}>Clear filters</Button>} />}
    >
      <PaymentDrawer row={rows.find((r) => r.id === openId)} onClose={() => setOpenId(null)} />
    </ListPage>
  )
}

function PaymentDrawer({ row, onClose }: { row?: Row; onClose: () => void }) {
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
        title={row?.paidTo ?? ""}
        subtitle={row ? `${fmtDate(row.date)} · ${row.method} · ${branchName(row.branch)}` : undefined}
        amount={row?.amount}
        currency={row?.currency}
        amountLabel="Paid"
        actions={
          row && (
            <Button variant="outline" onClick={() => toast(`${row.id} remittance downloaded`, { description: "PDF downloads are mocked in the prototype." })}>
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
                  { label: "Paid to", value: row.paidTo },
                  {
                    label: "For",
                    value: row.docId?.startsWith("BILL-") ? (
                      <button type="button" className="font-mono text-[13px] underline underline-offset-4" onClick={() => setBillId(row.docId!)}>
                        {row.docId}
                      </button>
                    ) : (
                      row.forLabel || "—"
                    ),
                  },
                  { label: "Paid from", value: row.fromName },
                  { label: "Method", value: row.method },
                  { label: "Memo", value: row.memo || "—" },
                  ...(row.wht ? [{ label: "WHT withheld", value: <Money amount={row.wht} size="sm" /> }] : []),
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
              {journal ? <JournalLines lines={journal.lines.map((l) => ({ ...l, accountName: name(l.accountCode) }))} /> : <p className="text-sm text-muted-foreground">No journal found.</p>}
            </DrawerSection>
          </>
        )}
      </EntityDrawer>
      <JournalDrawer journalId={journalId} onClose={() => setJournalId(null)} />
      <BillDrawer billId={billId} onClose={() => setBillId(null)} />
    </>
  )
}
