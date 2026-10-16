"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { FileText, Inbox, Plus, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { BRANCHES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageBody } from "@/components/patterns/list-page"
import { PageHeader } from "@/components/patterns/page-header"
import { Money, MoneyCell } from "@/components/patterns/money"
import { Code, Term } from "@/components/patterns/text"
import { ALL_STATUSES, StatusBadge, type Status } from "@/components/patterns/status-badge"
import { KpiStrip, type Kpi } from "@/components/patterns/kpi-strip"
import { StatusTabs } from "@/components/patterns/status-tabs"
import { DataTable } from "@/components/patterns/data-table"
import { FilterChip } from "@/components/patterns/filter-chip"
import { EmptyState } from "@/components/patterns/empty-state"
import { Banner } from "@/components/patterns/banner"
import { DrawerSection, EntityDrawer, FactList } from "@/components/patterns/entity-drawer"
import { JournalLines } from "@/components/patterns/journal-lines"
import {
  DEFAULT_REPORT_CONTROLS,
  ReportGroup,
  ReportLine,
  ReportShell,
} from "@/components/patterns/report-shell"

/* ---------- small layout helpers for this page ---------- */

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/** Renders the same content in a light and a dark panel, side by side. */
function BothThemes({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {(["light", "dark"] as const).map((t) => (
        <div key={t} className={cn(t, "rounded-xl border bg-background p-5 text-foreground", className)}>
          <p className="mb-4 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t}</p>
          {children}
        </div>
      ))}
    </div>
  )
}

/* ---------- tokens ---------- */

const SWATCHES: { name: string; token: string; note: string }[] = [
  { name: "Background", token: "--background", note: "Page canvas" },
  { name: "Card", token: "--card", note: "Surfaces, 1px border, no shadow" },
  { name: "Border", token: "--border", note: "Hairlines" },
  { name: "Foreground", token: "--foreground", note: "Text" },
  { name: "Muted text", token: "--muted-foreground", note: "Labels, helper text" },
  { name: "Primary", token: "--primary", note: "Main buttons" },
  { name: "Brand", token: "--brand", note: "Logo, active nav, focus only" },
  { name: "Info", token: "--info", note: "Open, unpaid, info banners" },
  { name: "Success", token: "--success", note: "Paid, posted, balanced" },
  { name: "Warning", token: "--warning", note: "Overdue, awaiting, out of balance" },
  { name: "Destructive", token: "--destructive", note: "Errors and void only" },
  { name: "Negative", token: "--negative", note: "Negative money" },
]

const CHARTS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"]

function Swatches() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SWATCHES.map((s) => (
          <div key={s.token} className="flex items-center gap-3 rounded-lg border bg-card p-2">
            <span className="size-8 shrink-0 rounded-md border" style={{ background: `var(${s.token})` }} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{s.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{s.note}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="w-24 text-xs text-muted-foreground">Charts</span>
        {CHARTS.map((c) => (
          <span key={c} className="h-6 flex-1 rounded-md" style={{ background: `var(${c})` }} title={c} />
        ))}
      </div>
    </div>
  )
}

function TypeScale() {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4 border-b pb-3">
        <span className="font-heading text-[26px] leading-8 font-semibold">Page title</span>
        <span className="text-xs text-muted-foreground">Open Runde 26 / 600</span>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-b pb-3">
        <Money amount={184230.5} size="kpi" />
        <span className="text-xs text-muted-foreground">Open Runde 30 / 600, tabular</span>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-b pb-3">
        <span className="font-heading text-lg font-semibold">Section heading</span>
        <span className="text-xs text-muted-foreground">Open Runde 18 / 600</span>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-b pb-3">
        <span className="text-sm">Body text for tables, forms and descriptions.</span>
        <span className="text-xs text-muted-foreground">Inter 14 / 400</span>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-b pb-3">
        <span className="text-[13px] text-muted-foreground">Label and helper text</span>
        <span className="text-xs text-muted-foreground">Inter 13 / muted</span>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <Code>INV-0042 · JE-0354 · 1010</Code>
        <span className="text-xs text-muted-foreground">Geist Mono 13 / muted</span>
      </div>
    </div>
  )
}

/* ---------- component gallery shown in both themes ---------- */

function Gallery() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Buttons · one height (36px), labels never wrap</p>
        <div className="flex flex-wrap gap-2">
          <Button><Plus />New invoice</Button>
          <Button variant="outline">Export</Button>
          <Button variant="secondary">Save draft</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Void</Button>
          <Button disabled>Approve & post</Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Status badges · fixed mapping, brand never used</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_STATUSES.map((s) => (
            <StatusBadge key={s} status={s} days={s === "overdue" ? 12 : undefined} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Money · tabular, right-aligned, negatives explained</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg border bg-card p-3 text-sm">
          <span className="text-muted-foreground">Invoice total</span>
          <MoneyCell amount={12450} />
          <span className="text-muted-foreground">In USD</span>
          <MoneyCell amount={965.12} currency="USD" />
          <span className="text-muted-foreground">MoMo wallet</span>
          <MoneyCell amount={-10080.1} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Banners · info is blue, never brand</p>
        <div className="space-y-2">
          <Banner tone="info" title="Field paths moved under Technical detail" />
          <Banner tone="warning" title="QuickBooks hasn't synced for 286 days" action={<Button size="sm" variant="outline" className="bg-card">Reconnect</Button>} />
          <Banner tone="error" title="2 lines failed to import" />
          <Banner tone="locked" title="Starting balances are locked after conversion" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Inputs</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ds-ref">Reference</Label>
            <Input id="ds-ref" placeholder="e.g. PO-118" className="bg-card" />
          </div>
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select defaultValue="adum">
              <SelectTrigger className="w-full bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BRANCHES.slice(1).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="ds-sw" defaultChecked />
            <Label htmlFor="ds-sw" className="font-normal">Send reminders</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="ds-cb" defaultChecked />
            <Label htmlFor="ds-cb" className="font-normal">Include VAT</Label>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- sample list ---------- */

type SampleInvoice = { id: string; customer: string; issued: string; due: string; branch: string; status: Status; days?: number; amount: number }

const SAMPLE: SampleInvoice[] = [
  { id: "INV-0043", customer: "Melcom Ltd", issued: "2 Oct 2026", due: "16 Oct 2026", branch: "Adum – Kumasi (HQ)", status: "unpaid", amount: 18450 },
  { id: "INV-0042", customer: "Kasapreko Company", issued: "28 Sep 2026", due: "28 Sep 2026", branch: "Osu – Accra", status: "overdue", days: 7, amount: 9320.75 },
  { id: "INV-0041", customer: "Ashfoam Ghana", issued: "25 Sep 2026", due: "9 Oct 2026", branch: "Takoradi", status: "part_paid", amount: 4120 },
  { id: "INV-0040", customer: "Unilever Ghana", issued: "20 Sep 2026", due: "4 Oct 2026", branch: "Adum – Kumasi (HQ)", status: "paid", amount: 26800 },
  { id: "INV-0039", customer: "Ghana Cocoa Board", issued: "18 Sep 2026", due: "18 Oct 2026", branch: "Osu – Accra", status: "draft", amount: 52000 },
  { id: "INV-0038", customer: "Fan Milk PLC", issued: "12 Sep 2026", due: "12 Sep 2026", branch: "Takoradi", status: "void", amount: 1980 },
]

const COLUMNS: ColumnDef<SampleInvoice, unknown>[] = [
  { accessorKey: "id", header: "Number", cell: ({ getValue }) => <Code>{getValue<string>()}</Code>, meta: { width: "120px" } },
  { accessorKey: "customer", header: "Customer", cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span> },
  { accessorKey: "issued", header: "Issued", cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span> },
  { accessorKey: "due", header: "Due", cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span> },
  { accessorKey: "branch", header: "Branch", enableSorting: false },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} days={row.original.days} /> },
  { accessorKey: "amount", header: "Amount", cell: ({ getValue }) => <MoneyCell amount={getValue<number>()} />, meta: { align: "right" } },
]

function SampleList() {
  const [tab, setTab] = React.useState("all")
  const [kpi, setKpi] = React.useState<string>()
  const [branch, setBranch] = React.useState<string>()
  const [open, setOpen] = React.useState<SampleInvoice | null>(null)
  const kpis: Kpi[] = [
    { id: "outstanding", label: "Outstanding", value: <Money amount={31890.75} size="kpi" />, hint: "3 invoices" },
    { id: "overdue", label: "Overdue", value: <Money amount={9320.75} size="kpi" />, hint: "1 invoice", tone: "warning" },
    { id: "due7", label: "Due in 7 days", value: <Money amount={4120} size="kpi" />, hint: "Excludes overdue" },
    { id: "collected", label: "Collected this month", value: <Money amount={26800} size="kpi" />, delta: 0.124 },
  ]
  const count = (s?: Status[]) => (s ? SAMPLE.filter((r) => s.includes(r.status)).length : SAMPLE.length)
  const tabs = [
    { id: "all", label: "All", count: count() },
    { id: "draft", label: "Draft", count: count(["draft"]) },
    { id: "unpaid", label: "Unpaid", count: count(["unpaid"]) },
    { id: "part_paid", label: "Part paid", count: count(["part_paid"]) },
    { id: "overdue", label: "Overdue", count: count(["overdue"]) },
    { id: "paid", label: "Paid", count: count(["paid"]) },
    { id: "void", label: "Void", count: count(["void"]) },
  ]
  const branchName = BRANCHES.find((b) => b.id === branch)?.name
  const rows = SAMPLE.filter((r) => (tab === "all" || r.status === tab) && (!branchName || r.branch === branchName))

  return (
    <div className="space-y-4">
      <KpiStrip items={kpis} activeId={kpi} onSelect={(id) => setKpi(id === kpi ? undefined : id)} />
      <StatusTabs tabs={tabs} value={tab} onValueChange={setTab} />
      <DataTable
        columns={COLUMNS}
        data={rows}
        getRowId={(r) => r.id}
        onRowClick={setOpen}
        hiddenColumns={["issued"]}
        searchPlaceholder="Search invoices"
        filters={
          <>
            <FilterChip label="Branch" value={branch} onChange={setBranch} options={BRANCHES.slice(1).map((b) => ({ value: b.id, label: b.name }))} />
            <FilterChip label="Currency" onChange={() => {}} options={[{ value: "GHS", label: "GHS" }, { value: "USD", label: "USD" }]} />
          </>
        }
        empty={
          <EmptyState icon={Inbox} title="No invoices match" description="Try another tab or clear the filters." action={<Button variant="outline" onClick={() => { setTab("all"); setBranch(undefined) }}>Clear filters</Button>} />
        }
      />
      <EntityDrawer
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        code={open?.id}
        title={open?.customer ?? ""}
        subtitle={open ? `Due ${open.due} · ${open.branch}` : undefined}
        status={open && <StatusBadge status={open.status} days={open.days} />}
        amount={open?.amount}
        amountLabel="Amount due"
        fullPageHref="/invoices"
        actions={
          <>
            <Button><Send />Send reminder</Button>
            <Button variant="outline">Record payment</Button>
          </>
        }
      >
        {open && (
          <>
            <DrawerSection title="Summary">
              <FactList
                items={[
                  { label: "Issued", value: open.issued },
                  { label: "Due", value: open.due },
                  { label: "Branch", value: open.branch },
                  { label: <Term term="Accounts receivable">Who owes you</Term>, value: <Money amount={open.amount} /> },
                ]}
              />
            </DrawerSection>
            <DrawerSection title="What this posted">
              <JournalLines
                lines={[
                  { accountCode: "1200", accountName: "Who owes you", debit: open.amount, credit: 0 },
                  { accountCode: "4000", accountName: "Sales", credit: +(open.amount / 1.2).toFixed(2), debit: 0 },
                  { accountCode: "2200", accountName: "VAT payable", credit: +(open.amount - open.amount / 1.2).toFixed(2), debit: 0 },
                ]}
              />
            </DrawerSection>
          </>
        )}
      </EntityDrawer>
    </div>
  )
}

/* ---------- page ---------- */

const TOC = [
  ["tokens", "Tokens"],
  ["type", "Type"],
  ["components", "Components"],
  ["list", "List page"],
  ["states", "Empty & loading"],
  ["report", "Report"],
] as const

export function DesignSystem() {
  const [controls, setControls] = React.useState(DEFAULT_REPORT_CONTROLS)
  return (
    <PageBody className="gap-10">
      <PageHeader
        title="Design system"
        description="Every shared pattern in Tapanta Books, in light and dark. Tokens live in app/globals.css; their sources are in design-reference/tokens.md."
        exportable={false}
      />
      <nav className="-mt-4 flex flex-wrap gap-1.5">
        {TOC.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border bg-card px-3 py-1 text-[13px] text-muted-foreground hover:text-foreground">
            {label}
          </a>
        ))}
      </nav>

      <Section id="tokens" title="Tokens" description="Acctual's calm, monochrome base with one accent. No shadows: hairline borders and the canvas-to-card step do all the separating.">
        <BothThemes><Swatches /></BothThemes>
      </Section>

      <Section id="type" title="Type" description="Open Runde for titles and big numbers, Inter for everything else, mono for codes so names read first.">
        <BothThemes><TypeScale /></BothThemes>
      </Section>

      <Section id="components" title="Components">
        <BothThemes><Gallery /></BothThemes>
      </Section>

      <Section id="list" title="List page" description="PageHeader → KpiStrip → status tabs (always starting with All) → toolbar → DataTable. KPI cards filter; rows open the drawer. Number and amount columns are pinned.">
        <div className="rounded-xl border p-5">
          <PageHeader title="Invoices" description="Bill customers and track what they owe you." primary={<Button><Plus />New invoice</Button>} more={[{ label: "Import invoices" }, { label: "Reminder settings" }]} />
          <div className="mt-6"><SampleList /></div>
        </div>
      </Section>

      <Section id="states" title="Empty & loading" description="Every table and card has a designed empty state with one next action, and a 400ms skeleton on first load.">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border bg-card">
            <EmptyState icon={FileText} title="No invoices yet" description="Your first invoice takes about a minute." action={<Button><Plus />New invoice</Button>} />
          </div>
          <div className="space-y-3 rounded-xl border bg-card p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ds-memo">Form field with helper text</Label>
          <Textarea id="ds-memo" placeholder="Add a memo for your accountant" className="bg-card" />
          <p className="text-xs text-muted-foreground">Primary actions stay disabled until a form is valid, with the reason beside them.</p>
        </div>
      </Section>

      <Section id="report" title="Report" description="One ReportShell for every report: controls on top, then a clean document. Every amount drills into its journal lines.">
        <ReportShell title="Profit & loss" formalName="Statement of profit or loss" periodLabel="1 Jan – 5 Oct 2026" controls={controls} onControlsChange={setControls}>
          <ReportGroup title="Income" total={842300} compare={765010}>
            <ReportLine label="Sales" amount={812300} compare={741200} onDrill={() => {}} />
            <ReportLine label="Interest received – bank" amount={30000} compare={23810} onDrill={() => {}} />
          </ReportGroup>
          <ReportGroup title="Cost of sales" total={402150} compare={371900}>
            <ReportLine label="Goods bought for resale" amount={402150} compare={371900} onDrill={() => {}} />
          </ReportGroup>
          <ReportGroup title="Expenses" total={251870.4} compare={240115}>
            <ReportLine label="Staff costs" amount={148000} compare={139500} onDrill={() => {}} />
            <ReportLine label="Rent" amount={60000} compare={60000} onDrill={() => {}} />
            <ReportLine label="Utilities" amount={43870.4} compare={40615} onDrill={() => {}} />
          </ReportGroup>
          <div className="mt-2 flex items-center gap-2 border-t-2 border-foreground/80 pt-3 text-[15px] font-semibold">
            <span className="flex-1">Net profit</span>
            <span className="w-32 text-right"><Money amount={153005.6} hideSymbol className="text-muted-foreground" /></span>
            <span className="w-32 text-right"><Money amount={188279.6} hideSymbol /></span>
          </div>
        </ReportShell>
      </Section>
    </PageBody>
  )
}
