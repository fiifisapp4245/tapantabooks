"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { CalendarX2 } from "lucide-react"
import { findNavItem } from "@/lib/nav"
import { useLedger, type LedgerState } from "@/lib/ledger"
import { BRANCHES } from "@/lib/constants"
import { fmtDate, TODAY } from "@/lib/dates"
import { EXCHANGE_RATES } from "@/lib/mock/seed"
import type { LineFilter, ledgerLines } from "@/lib/selectors"
import { Button } from "@/components/ui/button"
import { PageBody } from "@/components/patterns/list-page"
import { PageHeader } from "@/components/patterns/page-header"
import { EmptyState } from "@/components/patterns/empty-state"
import { DrillDrawer } from "@/components/drawers/journal-drawer"
import { COMPARE_OPTIONS, DEFAULT_REPORT_CONTROLS, ReportAmounts, ReportDocument, ReportFilters, ReportHeaderActions, type ReportControls } from "@/components/patterns/report-shell"
import { compareRange, hasData, presetRange, rangeLabel, type DateRange } from "./periods"

export type DrillLine = ReturnType<typeof ledgerLines>[number]

export type ReportContext = {
  s: LedgerState
  controls: ReportControls
  range: DateRange
  /** Null when there's no earlier period with data, or compare is off. */
  compare: DateRange | null
  /** Undefined for all branches. */
  branch?: string
  filter: LineFilter
  compareFilter: LineFilter | null
  /** Converts a GH₵ amount into the report currency. */
  fx: (n: number) => number
  /** Hide zero rows unless "Show zero rows" is on. */
  keep: (amount: number, compare?: number) => boolean
  /** Open the journal lines behind a figure. */
  drill: (title: string, lines: DrillLine[], subtitle?: string) => void
}

const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * Page header (title = nav label) + ReportShell + the drill-down drawer.
 * Maps the period presets to dates and works out the comparison period.
 */
export function ReportPage({
  formalName,
  asAt,
  fixedToday,
  before,
  children,
}: {
  formalName: string
  /** Point-in-time report (balance sheet): label "As at …" the period end. */
  asAt?: boolean
  /** Always as at today (ageing). The period control doesn't apply. */
  fixedToday?: boolean
  /** Content between the page header and the report, e.g. a reminder banner. */
  before?: React.ReactNode
  children: (ctx: ReportContext) => React.ReactNode
}) {
  const nav = findNavItem(usePathname())
  const s = useLedger()
  const [controls, setControls] = React.useState<ReportControls>(DEFAULT_REPORT_CONTROLS)
  const [drillState, setDrillState] = React.useState<{ title: string; subtitle?: string; lines: DrillLine[] } | null>(null)

  const branch = controls.branch === "all" ? undefined : controls.branch
  const { range } = React.useMemo(() => presetRange(s, controls.period, branch), [s, controls.period, branch])
  const compare = React.useMemo(
    () => (fixedToday ? null : compareRange(s, controls.period, controls.compare, branch)),
    [s, controls.period, controls.compare, branch, fixedToday]
  )
  const empty = !fixedToday && !hasData(s, range, branch)

  const rate = EXCHANGE_RATES.find((r) => r.currency === controls.currency)?.rate ?? 1
  const branchName = BRANCHES.find((b) => b.id === controls.branch)?.name ?? "All branches"
  const label = fixedToday ? `As at ${fmtDate(TODAY)}` : asAt ? `As at ${fmtDate(range.to)}` : rangeLabel(range)
  const compareLabel = compare ? (asAt ? `As at ${fmtDate(compare.to)}` : rangeLabel(compare)) : null

  const ctx: ReportContext = {
    s,
    controls,
    range,
    compare,
    branch,
    filter: { from: range.from, to: range.to, branch },
    compareFilter: compare ? { from: compare.from, to: compare.to, branch } : null,
    fx: (n) => (rate === 1 ? n : r2(n / rate)),
    keep: (amount, cmp) => controls.showZero || Math.abs(amount) >= 0.005 || (cmp != null && Math.abs(cmp) >= 0.005),
    drill: (title, lines, subtitle) => setDrillState({ title, lines, subtitle: subtitle ?? `${label} · ${branchName}` }),
  }

  const emptyState = (
    <EmptyState
      icon={CalendarX2}
      title={`Nothing posted in ${rangeLabel(range)}`}
      description="Your books in Tapanta start on 1 Jan 2026, with starting balances brought over from your old system."
      action={
        <Button variant="outline" onClick={() => setControls({ ...controls, period: "ytd" })}>
          Show year to date
        </Button>
      }
    />
  )

  // Each sheet gets its own context with a single amount column; the
  // comparison sheet simply points at the comparison period.
  const currentCtx: ReportContext = { ...ctx, compare: null, compareFilter: null }
  const compareCtx: ReportContext | null = compare
    ? { ...ctx, range: compare, filter: ctx.compareFilter!, compare: null, compareFilter: null, drill: (title, lines) => ctx.drill(title, lines, `${compareLabel} · ${branchName}`) }
    : null
  const compareTag = COMPARE_OPTIONS.find((o) => o.value === controls.compare)?.label
  const suffix = [controls.branch !== "all" && branchName, controls.currency !== "GHS" && `in ${controls.currency} at ${rate}`].filter(Boolean).join(" · ")
  const sheetLabel = (l: string) => [l, suffix].filter(Boolean).join(" · ")
  const title = nav?.label ?? ""

  return (
    <PageBody>
      <PageHeader title={title} description={nav?.description} exportable={false}>
        <ReportHeaderActions period={controls.period} onPeriodChange={(v) => setControls({ ...controls, period: v })} periodDisabled={fixedToday} />
      </PageHeader>
      {before}
      <ReportFilters controls={controls} onChange={setControls} hideCompare={fixedToday} />
      {!fixedToday && controls.compare !== "none" && !compare && (
        <p className="-mt-2 text-xs text-muted-foreground">There&apos;s no earlier period with activity to compare {label} with.</p>
      )}
      <div className={compareCtx ? "grid gap-4 xl:grid-cols-2" : undefined}>
        <ReportDocument title={title} formalName={formalName} periodLabel={sheetLabel(label)} columnLabel={label.replace(/^As at /, "")} basis={controls.basis}>
          {empty ? emptyState : children(currentCtx)}
        </ReportDocument>
        {compareCtx && compareLabel && (
          <ReportDocument title={title} formalName={formalName} periodLabel={sheetLabel(compareLabel)} columnLabel={compareLabel.replace(/^As at /, "")} basis={controls.basis} tag={compareTag}>
            {children(compareCtx)}
          </ReportDocument>
        )}
      </div>
      <DrillDrawer
        open={!!drillState}
        title={drillState?.title ?? ""}
        subtitle={drillState?.subtitle}
        lines={drillState?.lines ?? []}
        onClose={() => setDrillState(null)}
      />
    </PageBody>
  )
}

/** Plain heading inside a report (no box), e.g. "Assets". */
export function ReportHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="pt-4 pb-1 text-[13px] font-medium tracking-wide text-muted-foreground uppercase first:pt-0">{children}</h3>
}


/** A bold total line that still drills down: Gross profit, Net profit, Cash at end. */
export function ReportTotal({
  label,
  amount,
  compare,
  onDrill,
  emphasis,
}: {
  label: React.ReactNode
  amount: number
  compare?: number
  onDrill?: () => void
  /** The bottom line of the report: double rule above. */
  emphasis?: boolean
}) {
  return (
    <div className={"flex items-center gap-2 py-2.5 text-sm font-semibold " + (emphasis ? "mt-2 border-t-2 border-foreground/80" : "border-t")}>
      <span className="flex-1">{label}</span>
      <ReportAmounts amount={amount} compare={compare} onDrill={onDrill} strong />
    </div>
  )
}
