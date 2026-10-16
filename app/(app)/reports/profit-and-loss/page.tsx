"use client"

import { linesFor, profitAndLoss } from "@/lib/selectors"
import type { Account } from "@/lib/types"
import { ReportGroup, ReportLine } from "@/components/patterns/report-shell"
import { ReportPage, ReportTotal, type ReportContext } from "@/components/reports/report-page"

export default function Page() {
  return <ReportPage formalName="Statement of profit or loss">{(ctx) => <ProfitAndLoss ctx={ctx} />}</ReportPage>
}

type Row = { account: Account; amount: number }

function ProfitAndLoss({ ctx }: { ctx: ReportContext }) {
  const { s, filter, compareFilter, fx, keep, drill } = ctx
  const pl = profitAndLoss(s, filter)
  const cmp = compareFilter ? profitAndLoss(s, compareFilter) : null
  const allCmp = cmp ? [...cmp.sales, ...cmp.otherIncome, ...cmp.cos, ...cmp.expenses] : []
  const cmpOf = (code: string) => (cmp ? fx(allCmp.find((x) => x.account.code === code)?.amount ?? 0) : undefined)
  const cmpTotal = (k: keyof typeof pl.totals) => (cmp ? fx(cmp.totals[k]) : undefined)
  const drillCodes = (title: string, rows: Row[]) =>
    drill(
      title,
      linesFor(
        s,
        rows.map((r) => r.account.code),
        filter
      )
    )

  const section = (title: string, rows: Row[], total: keyof typeof pl.totals) => {
    const visible = rows.filter((r) => keep(r.amount, cmpOf(r.account.code)))
    if (!visible.length && !keep(pl.totals[total], cmpTotal(total))) return null
    return (
      <ReportGroup title={title} total={fx(pl.totals[total])} compare={cmpTotal(total)}>
        {visible.map((r) => (
          <ReportLine
            key={r.account.code}
            label={r.account.name}
            amount={fx(r.amount)}
            compare={cmpOf(r.account.code)}
            onDrill={() => drill(r.account.name, linesFor(s, [r.account.code], filter))}
          />
        ))}
      </ReportGroup>
    )
  }

  return (
    <>
      {section("Sales", pl.sales, "sales")}
      {section("Cost of sales", pl.cos, "cos")}
      <ReportTotal
        label="Gross profit"
        amount={fx(pl.totals.grossProfit)}
        compare={cmpTotal("grossProfit")}
        onDrill={() => drillCodes("Gross profit", [...pl.sales, ...pl.cos])}
      />
      {section("Other income", pl.otherIncome, "otherIncome")}
      {section("Expenses", pl.expenses, "expenses")}
      <ReportTotal
        label="Net profit"
        amount={fx(pl.totals.netProfit)}
        compare={cmpTotal("netProfit")}
        emphasis
        onDrill={() => drillCodes("Net profit", [...pl.sales, ...pl.otherIncome, ...pl.cos, ...pl.expenses])}
      />
    </>
  )
}
