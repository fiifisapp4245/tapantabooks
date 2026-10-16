"use client"

import { bankAccounts, cashFlow, ledgerLines, type LineFilter } from "@/lib/selectors"
import type { LedgerState } from "@/lib/ledger"
import { ReportGroup, ReportLine } from "@/components/patterns/report-shell"
import { dayBefore, type DateRange } from "@/components/reports/periods"
import { ReportPage, ReportTotal, type DrillLine, type ReportContext } from "@/components/reports/report-page"

export default function Page() {
  return <ReportPage formalName="Statement of cash flows">{(ctx) => <CashFlow ctx={ctx} />}</ReportPage>
}

const r2 = (n: number) => Math.round(n * 100) / 100
const net = (lines: DrillLine[]) => r2(lines.reduce((t, l) => t + l.debit - l.credit, 0))

type Section = "operating" | "investing" | "financing"
const SECTIONS: { key: Section; title: string }[] = [
  { key: "operating", title: "Operating" },
  { key: "investing", title: "Investing" },
  { key: "financing", title: "Financing" },
]

/**
 * Cash lines (bank, MoMo, cash box) up to the start of the range, plus the
 * starting-balances journal when it falls inside the range — so
 * Cash at start + Net change = Cash at end.
 */
function cashAtStart(s: LedgerState, cash: Set<string>, r: DateRange, branch?: string) {
  const before = ledgerLines(s, { to: dayBefore(r.from), branch })
  const opening = ledgerLines(s, { from: r.from, to: r.to, branch }).filter((l) => l.journal.source === "opening")
  return [...before, ...opening].filter((l) => cash.has(l.accountCode))
}

function cashLinesOf(s: LedgerState, cash: Set<string>, journals: string[], f: LineFilter) {
  const ids = new Set(journals)
  return ledgerLines(s, f).filter((l) => ids.has(l.journal.id) && cash.has(l.accountCode))
}

function CashFlow({ ctx }: { ctx: ReportContext }) {
  const { s, range, compare, branch, filter, compareFilter, fx, keep, drill } = ctx
  const cash = new Set(bankAccounts(s).map((a) => a.code))
  const cf = cashFlow(s, filter)
  const cmp = compareFilter ? cashFlow(s, compareFilter) : null

  const startLines = cashAtStart(s, cash, range, branch)
  const start = net(startLines)
  const cmpStart = compare ? net(cashAtStart(s, cash, compare, branch)) : undefined
  const allJournals = [...cf.operating, ...cf.investing, ...cf.financing].flatMap((l) => l.journals)
  const change = cf.net
  const cmpChange = cmp?.net

  const sectionTotal = (lines: { amount: number }[]) => r2(lines.reduce((t, l) => t + l.amount, 0))
  const cmpLine = (key: Section, label: string) => (cmp ? fx(cmp[key].find((l) => l.label === label)?.amount ?? 0) : undefined)

  return (
    <>
      <ReportTotal
        label="Cash at start"
        amount={fx(start)}
        compare={cmpStart != null ? fx(cmpStart) : undefined}
        onDrill={() => drill("Cash at start", startLines)}
      />
      {SECTIONS.map(({ key, title }) => {
        const lines = cf[key]
        // Labels that only appear in the comparison period still get a row.
        const labels = [...new Set([...lines.map((l) => l.label), ...(cmp?.[key].map((l) => l.label) ?? [])])]
        const rows = labels
          .map((label) => ({ label, line: lines.find((l) => l.label === label), compare: cmpLine(key, label) }))
          .filter((r) => keep(r.line?.amount ?? 0, r.compare))
        const total = sectionTotal(lines)
        const cmpTotal = cmp ? fx(sectionTotal(cmp[key])) : undefined
        if (!rows.length && !keep(total, cmpTotal)) return null
        return (
          <ReportGroup key={key} title={title} total={fx(total)} compare={cmpTotal}>
            {rows.map((r) => (
              <ReportLine
                key={r.label}
                label={r.label}
                amount={fx(r.line?.amount ?? 0)}
                compare={r.compare}
                onDrill={() => drill(r.label, r.line ? cashLinesOf(s, cash, r.line.journals, filter) : [])}
              />
            ))}
          </ReportGroup>
        )
      })}
      <ReportTotal
        label="Net change in cash"
        amount={fx(change)}
        compare={cmpChange != null ? fx(cmpChange) : undefined}
        onDrill={() => drill("Net change in cash", cashLinesOf(s, cash, allJournals, filter))}
      />
      <ReportTotal
        label="Cash at end"
        amount={fx(r2(start + change))}
        compare={cmpStart != null && cmpChange != null ? fx(r2(cmpStart + cmpChange)) : undefined}
        emphasis
        onDrill={() => drill("Cash at end", [...startLines, ...cashLinesOf(s, cash, allJournals, filter)])}
      />
    </>
  )
}
