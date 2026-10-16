"use client"

import { CircleCheck, TriangleAlert } from "lucide-react"
import { balanceSheet, linesFor } from "@/lib/selectors"
import type { Account } from "@/lib/types"
import { Money } from "@/components/patterns/money"
import { ReportGroup, ReportLine } from "@/components/patterns/report-shell"
import { ReportHeading, ReportPage, ReportTotal, type ReportContext } from "@/components/reports/report-page"

export default function Page() {
  return (
    <ReportPage formalName="Statement of financial position" asAt>
      {(ctx) => <BalanceSheet ctx={ctx} />}
    </ReportPage>
  )
}

type Row = { account: Account; amount: number }

const r2 = (n: number) => Math.round(n * 100) / 100
const sum = (rows: Row[]) => r2(rows.reduce((t, r) => t + r.amount, 0))

function byCategory(rows: Row[]) {
  const map = new Map<string, Row[]>()
  for (const r of rows) map.set(r.account.category, [...(map.get(r.account.category) ?? []), r])
  return [...map.entries()]
}

function BalanceSheet({ ctx }: { ctx: ReportContext }) {
  const { s, range, compare, branch, fx, keep, drill } = ctx
  const asOf = range.to
  const bs = balanceSheet(s, asOf, branch)
  const cmp = compare ? balanceSheet(s, compare.to, branch) : null
  const cmpRows = cmp ? [...cmp.assets, ...cmp.liabilities, ...cmp.equity] : []
  const cmpOf = (code: string) => (cmp ? fx(cmpRows.find((x) => x.account.code === code)?.amount ?? 0) : undefined)
  const cmpSum = (rows: Row[]) => (cmp ? fx(sum(rows.map((r) => ({ ...r, amount: cmpOf(r.account.code) ?? 0 })))) : undefined)

  const asAtFilter = { to: asOf, branch }
  const drillCodes = (title: string, rows: Row[]) => drill(title, linesFor(s, rows.map((r) => r.account.code), asAtFilter))
  const yearStart = asOf.slice(0, 4) + "-01-01"
  const plCodes = s.accounts.filter((a) => a.type === "income" || a.type === "expense" || a.type === "cost_of_sales").map((a) => a.code)
  const drillProfit = () => drill("Profit this year", linesFor(s, plCodes, { from: yearStart, to: asOf, branch }))

  const line = (r: Row) => (
    <ReportLine
      key={r.account.code}
      label={r.account.name}
      amount={fx(r.amount)}
      compare={cmpOf(r.account.code)}
      onDrill={() => drill(r.account.name, linesFor(s, [r.account.code], asAtFilter))}
    />
  )

  const groups = (rows: Row[]) =>
    byCategory(rows).map(([category, items]) => {
      const visible = items.filter((r) => keep(r.amount, cmpOf(r.account.code)))
      if (!visible.length) return null
      return (
        <ReportGroup key={category} title={category} total={fx(sum(items))} compare={cmpSum(items)}>
          {visible.map(line)}
        </ReportGroup>
      )
    })

  const liabEquity = r2(bs.totals.liabilities + bs.totals.equity)
  const out = r2(bs.totals.assets - liabEquity)
  const visibleEquity = bs.equity.filter((r) => keep(r.amount, cmpOf(r.account.code)))

  return (
    <>
      <ReportHeading>Assets</ReportHeading>
      {groups(bs.assets)}
      <ReportTotal label="Total assets" amount={fx(bs.totals.assets)} compare={cmp ? fx(cmp.totals.assets) : undefined} onDrill={() => drillCodes("Total assets", bs.assets)} />

      <ReportHeading>Liabilities</ReportHeading>
      {groups(bs.liabilities)}
      <ReportTotal
        label="Total liabilities"
        amount={fx(bs.totals.liabilities)}
        compare={cmp ? fx(cmp.totals.liabilities) : undefined}
        onDrill={() => drillCodes("Total liabilities", bs.liabilities)}
      />

      <ReportHeading>Equity</ReportHeading>
      <ReportGroup title="Owners' equity" total={fx(bs.totals.equity)} compare={cmp ? fx(cmp.totals.equity) : undefined}>
        {visibleEquity.map(line)}
        <ReportLine
          label="Profit this year"
          amount={fx(bs.currentYearProfit)}
          compare={cmp ? fx(cmp.currentYearProfit) : undefined}
          onDrill={drillProfit}
        />
      </ReportGroup>

      <ReportTotal
        label="Total liabilities and equity"
        amount={fx(liabEquity)}
        compare={cmp ? fx(r2(cmp.totals.liabilities + cmp.totals.equity)) : undefined}
        emphasis
        onDrill={() => drill("Total liabilities and equity", [...linesFor(s, [...bs.liabilities, ...bs.equity].map((r) => r.account.code), asAtFilter), ...linesFor(s, plCodes, { from: yearStart, to: asOf, branch })])}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
        <span className="flex-1">Assets = Liabilities + Equity</span>
        {Math.abs(out) < 0.01 ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-success">
            <CircleCheck className="size-4" />
            Balanced
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-warning">
            <TriangleAlert className="size-4" />
            Out by <Money amount={fx(out)} hideSymbol />
          </span>
        )}
      </div>
    </>
  )
}
