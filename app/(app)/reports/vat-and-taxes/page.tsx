"use client"

import type { LedgerState } from "@/lib/ledger"
import { linesFor, vatSummary } from "@/lib/selectors"
import { Banner } from "@/components/patterns/banner"
import { ReportLine } from "@/components/patterns/report-shell"
import { ReportHeading, ReportPage, ReportTotal, type ReportContext } from "@/components/reports/report-page"
import type { DateRange } from "@/components/reports/periods"

export default function Page() {
  return (
    <ReportPage
      formalName="Tax summary"
      before={
        <Banner tone="info" title="VAT return for September is due 31 Oct 2026">
          File and pay on the GRA taxpayer portal. Pick “Last month” above to see the September figures.
        </Banner>
      }
    >
      {(ctx) => <Taxes ctx={ctx} />}
    </ReportPage>
  )
}

/** vatSummary has no branch filter, so hand it the branch's journals only. */
function summary(s: LedgerState, r: DateRange, branch?: string) {
  const scoped = branch ? { ...s, journals: s.journals.filter((j) => j.branch === branch) } : s
  return vatSummary(scoped, r.from, r.to)
}

function Taxes({ ctx }: { ctx: ReportContext }) {
  const { s, range, compare, branch, filter, fx, keep, drill } = ctx
  const t = summary(s, range, branch)
  const c = compare ? summary(s, compare, branch) : null
  const cmp = (k: keyof typeof t) => (c ? fx(c[k]) : undefined)
  const lines = (code: string, side?: "credit") => linesFor(s, [code], filter).filter((l) => !side || l.credit > 0)

  type Row = { key: keyof typeof t; label: string; drill: () => ReturnType<typeof lines> }
  const vat: Row[] = [
    { key: "output", label: "VAT on sales (output)", drill: () => lines("2100") },
    { key: "input", label: "Less VAT on purchases (input)", drill: () => lines("1300") },
  ]
  const wht: Row[] = [{ key: "wht", label: "WHT withheld from suppliers", drill: () => lines("2110") }]
  const payroll: Row[] = [
    { key: "ssnit", label: "SSNIT (employee 5.5% + employer 13%)", drill: () => lines("2120", "credit") },
    { key: "paye", label: "PAYE deducted from salaries", drill: () => lines("2130", "credit") },
  ]

  const line = (r: Row) =>
    keep(t[r.key], cmp(r.key)) ? (
      <ReportLine key={r.key} label={r.label} amount={fx(t[r.key])} compare={cmp(r.key)} onDrill={() => drill(r.label, r.drill())} />
    ) : null

  return (
    <>
      <ReportHeading>VAT</ReportHeading>
      {vat.map(line)}
      <ReportTotal
        label={t.vatDue >= 0 ? "VAT to pay" : "VAT to claim back"}
        amount={fx(Math.abs(t.vatDue))}
        compare={c ? fx(Math.abs(c.vatDue)) : undefined}
        onDrill={() => drill("VAT to pay", [...lines("2100"), ...lines("1300")])}
      />
      <ReportHeading>Withholding tax</ReportHeading>
      {wht.map(line)}
      <ReportHeading>Payroll taxes</ReportHeading>
      {payroll.map(line)}
    </>
  )
}
