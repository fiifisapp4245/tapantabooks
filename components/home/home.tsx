"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Bar, BarChart, CartesianGrid, Area, AreaChart, XAxis, YAxis } from "recharts"
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  FileText,
  FolderInput,
  GitCompareArrows,
  NotebookPen,
  Plug,
  Settings2,
  Send,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { USERS } from "@/lib/constants"
import { usePrefs } from "@/lib/store"
import { useLedger } from "@/lib/ledger"
import { fmtDate, fmtDateTime, monthLabel, daysBetween, TODAY } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import {
  accountBalance,
  ageing,
  attention,
  cashByMonth,
  cashTotal,
  invoiceRows,
  netProfit,
  profitByMonth,
  useSelect,
} from "@/lib/selectors"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { PageBody } from "@/components/patterns/list-page"
import { KpiCard } from "@/components/patterns/kpi-strip"
import { StickyNotes, STICKY_ICONS } from "./sticky-notes"
import { Money } from "@/components/patterns/money"
import { Term } from "@/components/patterns/text"

/* ---------------- figures ---------------- */

function useHomeFigures() {
  return useSelect((s) => {
    const lastMonthEnd = "2026-09-30"
    const cash = cashTotal(s)
    const cashPrev = cashTotal(s, lastMonthEnd)
    const ar = accountBalance(s, "1100")
    const arPrev = accountBalance(s, "1100", lastMonthEnd)
    const ap = accountBalance(s, "2000")
    const apPrev = accountBalance(s, "2000", lastMonthEnd)
    const profit = netProfit(s, "2026-01-01", TODAY)
    const profitPrev = netProfit(s, "2026-01-01", lastMonthEnd)
    const att = attention(s)
    const inv = invoiceRows(s)
    const rel = (a: number, b: number) => (b ? (a - b) / Math.abs(b) : 0)
    return {
      kpis: { cash, ar, ap, profit, d: { cash: rel(cash, cashPrev), ar: rel(ar, arPrev), ap: rel(ap, apPrev), profit: rel(profit, profitPrev) } },
      att,
      ageing: ageing(inv),
      overdueInvoices: inv.filter((r) => r.status === "overdue"),
      pnl: profitByMonth(s).filter((r) => r.month >= "2026-04" && r.month <= "2026-09"),
      cashSeries: cashByMonth(s).filter((r) => r.month >= "2026-04"),
      activity: s.audit.slice(0, 7),
    }
  })
}

/* ---------------- cards ---------------- */

type CardId = "todo" | "pnl" | "cash" | "ageing" | "activity"
const CARD_LABELS: Record<CardId, string> = {
  todo: "To do",
  pnl: "Revenue vs expenses",
  cash: "Cash position",
  ageing: "Who owes you",
  activity: "Recent activity",
}

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex w-full min-w-0 flex-col rounded-xl border bg-card", className)}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h2 className="font-heading text-[15px] font-semibold">{title}</h2>
        {action}
      </div>
      <div className="min-w-0 flex-1 px-5 pb-5">{children}</div>
    </section>
  )
}

type Task = { id: string; icon: LucideIcon; text: React.ReactNode; action: string; href?: string; onClick?: () => void; tone?: "warning" }

function TodoCard({ f }: { f: ReturnType<typeof useHomeFigures> }) {
  const sendReminder = useLedger((s) => s.sendReminder)
  const userId = usePrefs((s) => s.userId)
  const qb = f.att.staleConnections.find((c) => c.id === "con-qb")
  const qbDays = qb?.lastSync ? daysBetween(qb.lastSync.slice(0, 10), TODAY) : 0
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  const tasks: Task[] = [
    f.att.reconcileOpen > 0 && { id: "rec", icon: GitCompareArrows, text: <>{plural(f.att.reconcileOpen, "bank line", "bank lines")} to reconcile</>, action: "Reconcile", href: "/reconcile" },
    f.att.journalsAwaitingApproval > 0 && { id: "appr", icon: NotebookPen, text: <>{plural(f.att.journalsAwaitingApproval, "journal", "journals")} awaiting your approval</>, action: "Review", href: "/journals?tab=awaiting_approval" },
    f.overdueInvoices.length > 0 && {
      id: "od",
      icon: FileText,
      text: <>{plural(f.overdueInvoices.length, "invoice", "invoices")} overdue · <Money amount={f.overdueInvoices.reduce((t, r) => t + r.baseBalance, 0)} size="sm" /></>,
      action: "Send reminders",
      onClick: () => {
        f.overdueInvoices.forEach((r) => sendReminder(r.id, userId))
        toast.success(`Reminders sent to ${f.overdueInvoices.length} customers`)
      },
    },
    f.att.importsNeedAttention > 0 && { id: "imp", icon: FolderInput, text: <>{plural(f.att.importsNeedAttention, "import needs", "imports need")} attention</>, action: "Fix", href: "/settings/imports" },
    qb && { id: "qb", icon: Plug, text: <>QuickBooks hasn&apos;t synced for {qbDays} days</>, action: "Reconnect", href: "/settings/connections", tone: "warning" as const },
  ].filter(Boolean) as Task[]

  return (
    <Panel title="To do" action={<span className="text-xs text-muted-foreground">{tasks.length} things need you</span>}>
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CircleCheck className="size-6 text-success" />
          <p className="text-sm font-medium">You&apos;re all caught up</p>
        </div>
      ) : (
        <ul className="-mx-2 divide-y">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-2 py-2.5">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted", t.tone === "warning" && "bg-warning-soft text-warning")}>
                <t.icon className="size-4" />
              </span>
              <span className={cn("min-w-0 flex-1 text-sm", t.tone === "warning" && "text-warning")}>{t.text}</span>
              {t.href ? (
                <Button variant="outline" size="sm" asChild className="shrink-0 bg-card">
                  <Link href={t.href}>
                    {t.action}
                    <ArrowRight />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="shrink-0 bg-card" onClick={t.onClick}>
                  <Send />
                  {t.action}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

const pnlConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  expenses: { label: "Expenses", color: "var(--chart-2)" },
} satisfies ChartConfig

function PnlChart({ data }: { data: ReturnType<typeof useHomeFigures>["pnl"] }) {
  const rows = data.map((r) => ({ ...r, label: monthLabel(r.month) }))
  return (
    <Panel title="Revenue vs expenses" action={<span className="text-xs text-muted-foreground">Apr – Sep 2026</span>}>
      {/* Legend order matches the bar order: revenue first. */}
      <div className="mb-3 flex gap-4 text-xs text-muted-foreground">
        {(["revenue", "expenses"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="size-2 rounded-[2px]" style={{ background: pnlConfig[k].color }} />
            {pnlConfig[k].label}
          </span>
        ))}
      </div>
      <ChartContainer config={pnlConfig} className="aspect-auto h-[240px] w-full">
        <BarChart data={rows} barGap={2} barCategoryGap="28%" margin={{ left: 0, right: 4, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="0" stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v) => formatMoney(v, "GHS", { compact: true, hideSymbol: true })} />
          <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent formatter={(v, name) => <TooltipRow name={pnlConfig[name as keyof typeof pnlConfig].label} color={pnlConfig[name as keyof typeof pnlConfig].color} value={Number(v)} />} />} />
          <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </Panel>
  )
}

function TooltipRow({ name, color, value }: { name: string; color: string; value: number }) {
  return (
    <span className="flex w-full items-center gap-2">
      <span className="size-2 rounded-[2px]" style={{ background: color }} />
      <span className="text-muted-foreground">{name}</span>
      <span className="ml-auto pl-3 font-medium tabular text-foreground">{formatMoney(value)}</span>
    </span>
  )
}

const cashConfig = { cash: { label: "Cash & bank", color: "var(--chart-1)" } } satisfies ChartConfig

function CashChart({ data, current }: { data: ReturnType<typeof useHomeFigures>["cashSeries"]; current: number }) {
  const rows = data.map((r) => ({ ...r, label: r.month === "2026-10" ? "5 Oct" : monthLabel(r.month) }))
  return (
    <Panel title="Cash position" action={<Money amount={current} size="sm" className="font-medium" />}>
      <ChartContainer config={cashConfig} className="aspect-auto h-[240px] w-full">
        <AreaChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-cash)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--color-cash)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v) => formatMoney(v, "GHS", { compact: true, hideSymbol: true })} />
          <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltipContent hideIndicator formatter={(v) => <TooltipRow name="Cash & bank" color="var(--chart-1)" value={Number(v)} />} />} />
          <Area dataKey="cash" type="monotone" stroke="var(--color-cash)" strokeWidth={2} fill="url(#cashFill)" activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
        </AreaChart>
      </ChartContainer>
    </Panel>
  )
}

// Crimson for current money, darkening through greys to black as it ages.
const AGE_COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-5)", "var(--chart-4)", "var(--chart-2)"]

function AgeingCard({ buckets }: { buckets: ReturnType<typeof useHomeFigures>["ageing"] }) {
  const total = buckets.reduce((t, b) => t + b.amount, 0)
  return (
    <Panel
      title="Who owes you"
      action={
        <Link href="/reports/who-owes-you" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Full report
        </Link>
      }
    >
      <Money amount={total} size="kpi" />
      <p className="mt-0.5 text-xs text-muted-foreground">
        <Term term="Accounts receivable ageing">By how long it&apos;s been due</Term>
      </p>
      <div className="mt-4 flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Ageing of what customers owe">
        {buckets.filter((b) => b.amount > 0).map((b) => (
          <div key={b.id} title={`${b.label}: ${formatMoney(b.amount)}`} style={{ width: `${(b.amount / total) * 100}%`, background: AGE_COLORS[buckets.indexOf(b)] }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {buckets.map((b, i) => (
          <li key={b.id} className="flex items-center gap-2 text-sm">
            <span className="size-2 rounded-[2px]" style={{ background: AGE_COLORS[i] }} />
            <span className="flex-1 text-muted-foreground">{b.label}</span>
            <span className="text-xs text-muted-foreground tabular">{b.count}</span>
            <Money amount={b.amount} size="sm" className="w-28 text-right" />
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function ActivityCard({ items }: { items: ReturnType<typeof useHomeFigures>["activity"] }) {
  return (
    <Panel
      title="Recent activity"
      action={
        <Link href="/settings/audit-trail" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Audit trail
        </Link>
      }
    >
      <ul className="space-y-3">
        {items.map((a) => {
          const user = USERS.find((u) => u.id === a.userId)
          return (
            <li key={a.id} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">{user?.initials ?? "⚙"}</span>
              <div className="min-w-0">
                <p className="truncate text-sm">{a.action}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.name ?? "System"} · {fmtDateTime(a.at)}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

/** A KPI label in accounting terms, with a plain-language explanation on hover. */
function KpiLabel({ hint, children }: { hint: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="cursor-help underline decoration-muted-foreground/40 decoration-dotted underline-offset-4">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-56">{hint}</TooltipContent>
    </Tooltip>
  )
}

/* ---------------- page ---------------- */

const DEFAULT_ORDER: CardId[] = ["todo", "pnl", "cash", "ageing", "activity"]

export function Home() {
  const f = useHomeFigures()
  const userId = usePrefs((s) => s.userId)
  const user = USERS.find((u) => u.id === userId)!
  const openForm = usePrefs((s) => s.openForm)
  const [order, setOrder] = React.useState<CardId[]>(DEFAULT_ORDER)
  const [hidden, setHidden] = React.useState<Set<CardId>>(new Set())
  const visible = order.filter((id) => !hidden.has(id))

  const cards: Record<CardId, React.ReactNode> = {
    todo: <TodoCard f={f} />,
    pnl: <PnlChart data={f.pnl} />,
    cash: <CashChart data={f.cashSeries} current={f.kpis.cash} />,
    ageing: <AgeingCard buckets={f.ageing} />,
    activity: <ActivityCard items={f.activity} />,
  }

  const move = (id: CardId, dir: -1 | 1) =>
    setOrder((o) => {
      const i = o.indexOf(id)
      const j = i + dir
      if (j < 0 || j >= o.length) return o
      const n = [...o]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })

  return (
    <PageBody>
      {/* Hero card: the painting fills it edge to edge, no outline; a wash keeps the text readable */}
      <section className="relative isolate flex min-h-[240px] flex-col gap-6 overflow-hidden rounded-xl p-5 md:min-h-[280px] md:p-7">
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image src="/art/georg-gisze.jpg" alt="" fill priority sizes="(min-width: 1024px) 75vw, 100vw" className="object-cover object-[50%_26%]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--card)_95%,transparent)_0%,color-mix(in_oklab,var(--card)_85%,transparent)_32%,color-mix(in_oklab,var(--card)_40%,transparent)_55%,color-mix(in_oklab,var(--card)_6%,transparent)_80%)]" />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[30px] leading-10 font-semibold">Good morning, {user.name.split(" ")[0]}</h1>
            <p className="text-sm font-medium text-foreground/75">Here&apos;s how Kumasi Traders is doing, as at {fmtDate(TODAY)}.</p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-transparent bg-card/90">
                <Settings2 />
                Customise
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-2">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Show and order cards</p>
              <ul>
                {order.map((id, i) => (
                  <li key={id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                    <Switch
                      checked={!hidden.has(id)}
                      onCheckedChange={(on) => setHidden((h) => { const n = new Set(h); if (on) n.delete(id); else n.add(id); return n })}
                      aria-label={`Show ${CARD_LABELS[id]}`}
                    />
                    <span className="flex-1 text-sm">{CARD_LABELS[id]}</span>
                    <Button variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(id, -1)} aria-label={`Move ${CARD_LABELS[id]} up`}><ChevronUp /></Button>
                    <Button variant="ghost" size="icon-sm" disabled={i === order.length - 1} onClick={() => move(id, 1)} aria-label={`Move ${CARD_LABELS[id]} down`}><ChevronDown /></Button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </div>
        <StickyNotes
          className="max-w-[560px]"
          notes={[
            { id: "inv", label: "New invoice", icon: STICKY_ICONS.invoice, tone: "brand", onClick: () => openForm("invoice") },
            { id: "in", label: "Record money in", icon: STICKY_ICONS.moneyIn, tone: "success", onClick: () => openForm("money-in") },
            { id: "out", label: "Record money out", icon: STICKY_ICONS.moneyOut, tone: "warning", onClick: () => openForm("money-out") },
            { id: "je", label: "Journal entry", icon: STICKY_ICONS.journal, tone: "info", onClick: () => openForm("journal") },
          ]}
        />
        <p className="mt-auto ml-auto hidden rounded-md bg-black/55 px-2 py-0.5 text-[10px] text-white/90 md:block">
          Hans Holbein the Younger, <span className="italic">The Merchant Georg Gisze</span>, 1532
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { id: "cash", label: <KpiLabel hint="Everything in your bank accounts, mobile money wallets and cash boxes.">Cash & bank</KpiLabel>, value: f.kpis.cash, delta: f.kpis.d.cash, good: "up" as const, href: "/bank" },
          { id: "ar", label: <KpiLabel hint="Money customers still owe you on invoices you've sent.">Receivables</KpiLabel>, value: f.kpis.ar, delta: f.kpis.d.ar, good: "down" as const, href: "/invoices" },
          { id: "ap", label: <KpiLabel hint="Money you still owe suppliers on bills.">Payables</KpiLabel>, value: f.kpis.ap, delta: f.kpis.d.ap, good: "down" as const, href: "/bills" },
          { id: "profit", label: <KpiLabel hint={`Income minus costs from 1 Jan 2026 to ${fmtDate(TODAY)}.`}>Net profit (YTD)</KpiLabel>, value: f.kpis.profit, delta: f.kpis.d.profit, good: "up" as const, href: "/reports/profit-and-loss" },
        ].map((k) => (
          <Link key={k.id} href={k.href} className="flex rounded-xl">
            <KpiCard
              className="w-full hover:border-foreground/20"
              kpi={{ id: k.id, label: k.label, value: <Money amount={k.value} size="kpi" />, delta: k.delta, deltaGood: k.good, hint: "vs 30 Sep" }}
            />
          </Link>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((id) => (
          <div key={id} className={cn("flex min-w-0", id === "todo" && "lg:col-span-2")}>
            {cards[id]}
          </div>
        ))}
      </div>
    </PageBody>
  )
}
