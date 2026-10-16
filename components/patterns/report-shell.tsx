"use client"

import * as React from "react"
import { CalendarDays, ChevronRight, Printer } from "lucide-react"
import { cn } from "@/lib/utils"
import { BRANCHES, CURRENCIES } from "@/lib/constants"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ExportMenu } from "./page-header"
import { Money } from "./money"
import "./report-print.css"

export const PERIOD_PRESETS = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-quarter", label: "This quarter" },
  { value: "ytd", label: "Year to date" },
  { value: "last-year", label: "Last year" },
]

export const COMPARE_OPTIONS = [
  { value: "none", label: "No comparison" },
  { value: "previous", label: "Previous period" },
  { value: "last-year", label: "Same period last year" },
]

export type ReportControls = {
  period: string
  compare: string
  basis: "accrual" | "cash"
  branch: string
  currency: string
  showZero: boolean
}

export const DEFAULT_REPORT_CONTROLS: ReportControls = {
  period: "last-month",
  compare: "none",
  basis: "accrual",
  branch: "all",
  currency: "GHS",
  showZero: false,
}

/* ---------------- header controls: period, export, print ---------------- */

/** The period picker that sits on the report's title row. */
export function ReportPeriodSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label="Period" className="w-40 bg-card">
        <CalendarDays className="text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {PERIOD_PRESETS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Period, Export and Print, in that order, for the right of the title row. */
export function ReportHeaderActions({ period, onPeriodChange, periodDisabled }: { period: string; onPeriodChange: (v: string) => void; periodDisabled?: boolean }) {
  return (
    <>
      <ReportPeriodSelect value={period} onChange={onPeriodChange} disabled={periodDisabled} />
      <ExportMenu />
      <Button variant="outline" size="icon" aria-label="Print" onClick={() => window.print()}>
        <Printer />
      </Button>
    </>
  )
}

/* ---------------- filter row ---------------- */

export const ZERO_ROW_OPTIONS = [
  { value: "hide", label: "Hide empty rows" },
  { value: "show", label: "Show all rows" },
]

/**
 * The row under the title: Compare with → Accrual | Cash → Branch →
 * Currency → empty rows. Selects show their value only; the comparison is
 * the one control with a visible label, because its value alone ("None")
 * wouldn't say what it is.
 */
export function ReportFilters({
  controls,
  onChange,
  hideCompare,
}: {
  controls: ReportControls
  onChange: (c: ReportControls) => void
  /** Reports that are always "as at today" (ageing) have nothing to compare. */
  hideCompare?: boolean
}) {
  const set = <K extends keyof ReportControls>(k: K, v: ReportControls[K]) => onChange({ ...controls, [k]: v })
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!hideCompare && (
        <Select value={controls.compare} onValueChange={(v) => set("compare", v)}>
          <SelectTrigger aria-label="Compare with" className="bg-card">
            <span className="text-muted-foreground">Compare with</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPARE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Tabs value={controls.basis} onValueChange={(v) => set("basis", v as ReportControls["basis"])}>
        <TabsList className="h-9" aria-label="Accounting basis">
          <TabsTrigger value="accrual" className="px-3 data-[state=active]:bg-card">
            Accrual
          </TabsTrigger>
          <TabsTrigger value="cash" className="px-3 data-[state=active]:bg-card">
            Cash
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Select value={controls.branch} onValueChange={(v) => set("branch", v)}>
        <SelectTrigger aria-label="Branch" className="bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BRANCHES.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={controls.currency} onValueChange={(v) => set("currency", v)}>
        <SelectTrigger aria-label="Currency" className="bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={controls.showZero ? "show" : "hide"} onValueChange={(v) => set("showZero", v === "show")}>
        <SelectTrigger aria-label="Empty rows" className="bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ZERO_ROW_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/* ---------------- the sheet ---------------- */

/**
 * One report sheet, laid out like a clean document: company, title, the
 * formal name and period, then the lines with a single amount column.
 * A comparison shows as a second sheet beside it.
 */
export function ReportDocument({
  title,
  formalName,
  periodLabel,
  columnLabel,
  basis,
  tag,
  children,
}: {
  title: string
  formalName?: string
  periodLabel: string
  /** Heading over the amount column, e.g. "September 2026". */
  columnLabel: string
  basis: ReportControls["basis"]
  /** Small label on a comparison sheet, e.g. "Previous period". */
  tag?: string
  children: React.ReactNode
}) {
  const entityId = usePrefs((s) => s.entityId)
  const companies = useLedger((s) => s.companies)
  const entity = companies.find((e) => e.id === entityId) ?? companies[0]
  return (
    // Square corners: a report is a sheet of paper. "print-sheet" is what printing keeps.
    <article className="print-sheet min-w-0 rounded-none border bg-card px-6 py-8 md:px-10 md:py-10">
      <header className="mb-8 space-y-1 border-b pb-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-muted-foreground">{entity.name}</p>
          {tag && <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">{tag}</span>}
        </div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-[13px] text-muted-foreground">
          {formalName && <>{formalName} · </>}
          {periodLabel} · {basis === "accrual" ? "Accrual basis" : "Cash basis"}
        </p>
      </header>
      <div className="mb-1 flex items-center gap-4 pb-2 text-xs font-medium text-muted-foreground">
        <span className="flex-1" />
        <span className="w-32 text-right">{columnLabel}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </article>
  )
}

/** Filters and one sheet together. Kept for the design-system page. */
export function ReportShell({
  title,
  formalName,
  periodLabel,
  controls,
  onControlsChange,
  children,
}: {
  title: string
  formalName?: string
  periodLabel: string
  controls: ReportControls
  onControlsChange: (c: ReportControls) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <ReportFilters controls={controls} onChange={onControlsChange} />
      <ReportDocument title={title} formalName={formalName} periodLabel={periodLabel} columnLabel={PERIOD_PRESETS.find((p) => p.value === controls.period)?.label ?? ""} basis={controls.basis}>
        {children}
      </ReportDocument>
    </div>
  )
}

/** A collapsible group of report lines with a total. */
export function ReportGroup({
  title,
  total,
  compare,
  children,
  defaultOpen = true,
}: {
  title: string
  total: number
  compare?: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/rg">
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md py-2 text-left text-sm font-medium hover:bg-muted/60">
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-[state=open]/rg:rotate-90" />
        <span className="flex-1">{title}</span>
        <ReportAmounts amount={total} compare={compare} strong className="group-data-[state=open]/rg:invisible" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6">
        {children}
        <div className="flex items-center gap-2 border-t py-2 text-sm font-medium">
          <span className="flex-1">Total {title.toLowerCase()}</span>
          <ReportAmounts amount={total} compare={compare} strong />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** One report line. Every amount is a button that drills into its journal lines. */
export function ReportLine({
  label,
  amount,
  compare,
  onDrill,
}: {
  label: string
  amount: number
  compare?: number
  onDrill?: () => void
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className="flex-1 text-foreground/85">{label}</span>
      <ReportAmounts amount={amount} compare={compare} onDrill={onDrill} />
    </div>
  )
}

export function ReportAmounts({
  amount,
  compare,
  strong,
  onDrill,
  className,
}: {
  amount: number
  compare?: number
  strong?: boolean
  onDrill?: () => void
  className?: string
}) {
  const cell = "w-32 text-right"
  return (
    <span className={cn("flex items-center gap-4", className)}>
      {compare != null && (
        <span className={cn(cell, "text-muted-foreground")}>
          <Money amount={compare} hideSymbol className="text-muted-foreground" />
        </span>
      )}
      <span className={cell}>
        {onDrill ? (
          <button
            type="button"
            onClick={onDrill}
            className="rounded px-1 hover:bg-brand-soft hover:text-foreground"
            aria-label="See the journal lines behind this amount"
          >
            <Money amount={amount} hideSymbol className={strong ? "font-medium" : undefined} />
          </button>
        ) : (
          <Money amount={amount} hideSymbol className={strong ? "font-medium" : undefined} />
        )}
      </span>
    </span>
  )
}
