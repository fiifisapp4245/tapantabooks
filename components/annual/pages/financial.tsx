"use client"

/**
 * The financial pages of the annual report: salient features, the four
 * primary statements, the notes and the five-year summary. Every number comes
 * from AnnualFigures (lib/annual/figures.ts); nothing here is typed in.
 */
import * as React from "react"
import type { SectionData, SectionType } from "@/lib/annual/types"
import type { PageSpec, RenderCtx, SectionRenderer } from "../registry"
import { ArTitle, fsNum } from "../page"
import { NOTE, notesPages } from "./financial-notes"
import { FootLine, GREY, HEADING_FONT, StatementHeader, StatementTable, pct1, pctChange, type Col, type Row } from "./financial-ui"

/* ---------------- shared ---------------- */

const yearCols = (ctx: RenderCtx): Col[] => [
  { label: String(ctx.figures.year), highlight: true },
  { label: String(ctx.figures.prior) },
]

/** "The notes on pages 34 to 38 form an integral part of these financial statements." */
function notesLine(ctx: RenderCtx) {
  const notes = ctx.report.sections.find((s) => s.enabled && s.type === "notes")
  const entry = notes && ctx.toc.find((t) => t.sectionId === notes.id)
  if (!notes || !entry) return "The accompanying notes form an integral part of these financial statements."
  const count = notesPages({ ...ctx, section: notes }).length
  const range = count > 1 ? `pages ${entry.page} to ${entry.page + count - 1}` : `page ${entry.page}`
  return `The notes on ${range} form an integral part of these financial statements.`
}

const yearEnded = (y: number) => `for the year ended 31 December ${y}`

/* ---------------- salient features ---------------- */

const SALIENT_PER_PAGE = 6

function SalientBand({ item, index }: { item: RenderCtx["figures"]["salient"][number]; index: number }) {
  const max = Math.max(...item.values.map((v) => Math.max(0, v)), 1)
  const series = ["#9A9A9A", "var(--ar-ink)", "var(--ar-primary)"]
  const onInk = index % 2 === 0
  const badgeBg = onInk ? "var(--ar-ink)" : "var(--ar-primary)"
  const badgeFg = onInk ? "#FFFFFF" : "var(--ar-on-primary)"
  return (
    <div className="flex items-center gap-5 py-3 pr-3 pl-4" style={{ background: "#F2F2F2" }}>
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-[12px] font-semibold" style={{ fontFamily: HEADING_FONT, color: "var(--ar-ink)" }}>
          {item.label} <span className="font-normal" style={{ color: GREY }}>(GH₵)</span>
        </p>
        <div className="flex flex-col gap-1.5">
          {item.values.map((v, i) => {
            const current = i === item.values.length - 1
            return (
              <div key={item.years[i]} className="grid grid-cols-[30px_1fr_104px] items-center gap-2">
                <span className="text-[9px] font-semibold tabular-nums" style={{ color: current ? "var(--ar-ink)" : GREY }}>
                  {item.years[i]}
                </span>
                <span className="relative block h-[11px]" style={{ background: "#DEDEDE" }}>
                  <span className="absolute inset-y-0 left-0 block" style={{ width: `${(Math.max(0, v) / max) * 100}%`, background: series[i] ?? series[0] }} />
                </span>
                <span className="flex items-center justify-end gap-1.5 text-[10px] tabular-nums" style={{ fontWeight: current ? 700 : 500 }}>
                  <span className="size-2 shrink-0 rounded-full" style={{ background: series[i] ?? series[0] }} />
                  {fsNum(v)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex size-[92px] shrink-0 items-center justify-center rounded-full bg-white" style={{ border: `2px solid ${badgeBg}` }}>
        <div className="flex size-[80px] flex-col items-center justify-center rounded-full text-center" style={{ background: badgeBg, color: badgeFg }}>
          <span className="text-[16px] leading-none font-bold tabular-nums" style={{ fontFamily: HEADING_FONT }}>
            {pctChange(item.growth)}
          </span>
          <span className="mt-1 px-2 text-[7.5px] leading-[1.15] font-semibold">{item.label} growth</span>
        </div>
      </div>
    </div>
  )
}

const salient: SectionRenderer = (ctx) => {
  const data = ctx.section.data as SectionData["salient"]
  const items = ctx.figures.salient
  const pages: PageSpec[] = []
  for (let i = 0; i < Math.max(items.length, 1); i += SALIENT_PER_PAGE) {
    const chunk = items.slice(i, i + SALIENT_PER_PAGE)
    pages.push({
      node: (
        <>
          <ArTitle className="mb-3">{i === 0 ? "Salient features" : "Salient features (continued)"}</ArTitle>
          {i === 0 && data.intro && <p className="mb-5 max-w-[520px] text-[11px] leading-[1.6] text-[#2B2B2B]">{data.intro}</p>}
          <div className="flex items-center gap-4 pb-3 text-[9px]" style={{ color: GREY }}>
            {items[0]?.years.map((y, k) => (
              <span key={y} className="flex items-center gap-1.5">
                <span className="block h-2 w-4" style={{ background: ["#9A9A9A", "var(--ar-ink)", "var(--ar-primary)"][k] }} />
                {y}
              </span>
            ))}
            <span className="ml-auto">Growth on {ctx.figures.prior}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {chunk.map((item, k) => (
              <SalientBand key={item.key} item={item} index={i + k} />
            ))}
          </div>
        </>
      ),
    })
  }
  return pages
}

/* ---------------- statement of comprehensive income ---------------- */

const sci: SectionRenderer = (ctx) => {
  const { cur: c, prev: p } = ctx.figures.pl
  const rows: Row[] = [
    { label: "Revenue", note: NOTE.revenue, values: [c.revenue, p.revenue] },
    { label: "Cost of sales", note: NOTE.costOfSales, values: [-c.costOfSales, -p.costOfSales] },
    { label: "Gross profit", values: [c.grossProfit, p.grossProfit], kind: "sub" },
    { kind: "gap", label: "" },
    { label: "Other income", note: NOTE.revenue, values: [c.otherIncome, p.otherIncome] },
    { label: "Staff costs", note: NOTE.opex, values: [-c.staff, -p.staff] },
    { label: "Premises costs", note: NOTE.opex, values: [-c.premises, -p.premises] },
    { label: "Depreciation", note: NOTE.ppe, values: [-c.depreciation, -p.depreciation] },
    { label: "Other operating expenses", note: NOTE.opex, values: [-c.otherOpex, -p.otherOpex] },
    { label: "Operating profit", values: [c.operatingProfit, p.operatingProfit], kind: "sub" },
    { kind: "gap", label: "" },
    { label: "Finance costs", note: NOTE.finance, values: [-c.financeCosts, -p.financeCosts] },
    { label: "Profit before tax", values: [c.profitBeforeTax, p.profitBeforeTax], kind: "sub" },
    { kind: "gap", label: "" },
    { label: "Income tax expense", note: NOTE.tax, values: [-c.tax, -p.tax] },
    { label: "Profit for the year", values: [c.profitForYear, p.profitForYear], kind: "grand" },
    { kind: "gap", label: "" },
    { label: "Other comprehensive income", values: [0, 0] },
    { label: "Total comprehensive income for the year", values: [c.profitForYear, p.profitForYear], kind: "total" },
    { kind: "gap", label: "" },
    { kind: "gap", label: "" },
    { label: "Earnings per share", kind: "heading" },
    { label: "Basic and diluted earnings per share (GH₵)", values: [c.eps.toFixed(2), p.eps.toFixed(2)] },
  ]
  return [
    {
      node: (
        <>
          <StatementHeader company={ctx.company.name} title="Statement of comprehensive income" period={yearEnded(ctx.figures.year)} />
          <StatementTable cols={yearCols(ctx)} rows={rows} />
          <FootLine className="mt-4">
            Earnings per share is profit for the year divided by the {ctx.figures.sharesInIssue.toLocaleString("en-GB")} ordinary shares in issue throughout the year.
          </FootLine>
          <FootLine className="mt-1">{notesLine(ctx)}</FootLine>
        </>
      ),
    },
  ]
}

/* ---------------- statement of financial position ---------------- */

function Signature({ name, role }: { name: string; role: string }) {
  return (
    <div className="w-[220px]">
      <div className="h-12" style={{ borderBottom: "1px solid #1E1E1E" }} />
      <p className="mt-2 text-[11px] font-semibold" style={{ color: "var(--ar-ink)" }}>
        {name}
      </p>
      <p className="text-[10px]" style={{ color: GREY }}>
        {role}
      </p>
    </div>
  )
}

const sofp: SectionRenderer = (ctx) => {
  const { cur: c, prev: p } = ctx.figures.bs
  const rows: Row[] = [
    { label: "Assets", kind: "heading" },
    { label: "Non-current assets", kind: "heading" },
    { label: "Property, plant and equipment", note: NOTE.ppe, values: [c.ppe, p.ppe], indent: true },
    { label: "Total non-current assets", values: [c.ppe, p.ppe], kind: "sub" },
    { label: "Current assets", kind: "heading" },
    { label: "Inventories", note: NOTE.inventories, values: [c.inventory, p.inventory], indent: true },
    { label: "Cash and cash equivalents", note: NOTE.cash, values: [c.cash, p.cash], indent: true },
    { label: "Total current assets", values: [c.currentAssets, p.currentAssets], kind: "sub" },
    { kind: "gap", label: "" },
    { label: "Total assets", values: [c.totalAssets, p.totalAssets], kind: "grand" },
    { kind: "gap", label: "" },
    { label: "Equity and liabilities", kind: "heading" },
    { label: "Equity", kind: "heading" },
    { label: "Share capital", note: NOTE.shareCapital, values: [c.shareCapital, p.shareCapital], indent: true },
    { label: "Retained earnings", values: [c.retained, p.retained], indent: true },
    { label: "Total equity", values: [c.totalEquity, p.totalEquity], kind: "sub" },
    { label: "Non-current liabilities", kind: "heading" },
    { label: "Borrowings", note: NOTE.borrowings, values: [c.borrowingsNonCurrent, p.borrowingsNonCurrent], indent: true },
    { label: "Total non-current liabilities", values: [c.borrowingsNonCurrent, p.borrowingsNonCurrent], kind: "sub" },
    { label: "Current liabilities", kind: "heading" },
    { label: "Borrowings – current portion", note: NOTE.borrowings, values: [c.borrowingsCurrent, p.borrowingsCurrent], indent: true },
    { label: "Total current liabilities", values: [c.borrowingsCurrent, p.borrowingsCurrent], kind: "sub" },
    { kind: "gap", label: "" },
    { label: "Total liabilities", values: [c.totalLiabilities, p.totalLiabilities], kind: "total" },
    { kind: "gap", label: "" },
    { label: "Total equity and liabilities", values: [c.totalEquityAndLiabilities, p.totalEquityAndLiabilities], kind: "grand" },
  ]
  return [
    {
      node: (
        <>
          <StatementHeader company={ctx.company.name} title="Statement of financial position" period={`as at 31 December ${ctx.figures.year}`} />
          <StatementTable cols={yearCols(ctx)} rows={rows} />
          <FootLine className="mt-4">{notesLine(ctx)}</FootLine>
          <p className="mt-4 text-[10.5px] leading-[1.6] text-[#2B2B2B]">
            The financial statements were approved by the Board of Directors on <span className="font-semibold">26 February {ctx.figures.year + 1}</span> and signed on its behalf by:
          </p>
          <div className="mt-2 flex justify-between">
            <Signature name="Ama Mensah" role="Managing director" />
            <Signature name="Kofi Boateng" role="Finance director" />
          </div>
        </>
      ),
    },
  ]
}

/* ---------------- statement of changes in equity ---------------- */

const soce: SectionRenderer = (ctx) => {
  const cols: Col[] = [
    { label: "Share capital", width: 104 },
    { label: "Retained earnings", width: 112 },
    { label: "Total", highlight: true, width: 104 },
  ]
  const rows: Row[] = []
  ctx.figures.equity.rows.forEach((r, i) => {
    if (r.kind === "balance" && i > 0) rows.push({ kind: "gap", label: "" })
    rows.push({
      label: r.label,
      note: r.label === "Dividends paid" ? NOTE.dividends : undefined,
      values: [r.shareCapital, r.retained, r.shareCapital + r.retained],
      kind: r.kind === "balance" ? (i === ctx.figures.equity.rows.length - 1 ? "grand" : "total") : "line",
      indent: r.kind === "move",
    })
  })
  return [
    {
      node: (
        <>
          <StatementHeader company={ctx.company.name} title="Statement of changes in equity" period={yearEnded(ctx.figures.year)} />
          <StatementTable cols={cols} rows={rows} />
          <FootLine className="mt-4">
            Profit for the year is also the total comprehensive income for the year; there was no other comprehensive income in either year.
          </FootLine>
          <FootLine className="mt-1">{notesLine(ctx)}</FootLine>
        </>
      ),
    },
  ]
}

/* ---------------- statement of cash flows ---------------- */

const socf: SectionRenderer = (ctx) => {
  const cf = ctx.figures.cashflow
  const Y = ctx.figures.year
  const rows: Row[] = [
    { label: "Cash flows from operating activities", kind: "heading" },
    { label: "Profit before tax", values: [cf.profitBeforeTax] },
    { label: "Adjustments for:", values: [null] },
    { label: "Depreciation", note: NOTE.ppe, values: [cf.depreciation], indent: true },
    { label: "Finance costs", note: NOTE.finance, values: [cf.financeCosts], indent: true },
    { label: `${cf.changeInventory <= 0 ? "Increase" : "Decrease"} in inventories`, note: NOTE.inventories, values: [cf.changeInventory] },
    { label: "Cash generated from operations", values: [cf.cashFromOperations], kind: "sub" },
    { label: "Interest paid", values: [cf.interestPaid] },
    { label: "Income tax paid", note: NOTE.tax, values: [cf.taxPaid] },
    { label: "Net cash from operating activities", values: [cf.netOperating], kind: "total" },
    { label: "Cash flows from investing activities", kind: "heading" },
    { label: "Purchase of property, plant and equipment", note: NOTE.ppe, values: [cf.capex] },
    { label: "Net cash used in investing activities", values: [cf.netInvesting], kind: "total" },
    { label: "Cash flows from financing activities", kind: "heading" },
    { label: "Repayment of borrowings", note: NOTE.borrowings, values: [cf.loanRepaid] },
    { label: "Dividends paid", note: NOTE.dividends, values: [cf.dividendsPaid] },
    { label: "Net cash used in financing activities", values: [cf.netFinancing], kind: "total" },
    { kind: "gap", label: "" },
    { label: `Net ${cf.netChange >= 0 ? "increase" : "decrease"} in cash and cash equivalents`, values: [cf.netChange], kind: "sub" },
    { label: `Cash and cash equivalents at 1 January ${Y}`, values: [cf.openingCash] },
    { label: `Cash and cash equivalents at 31 December ${Y}`, note: NOTE.cash, values: [cf.closingCash], kind: "grand" },
  ]
  return [
    {
      node: (
        <>
          <StatementHeader company={ctx.company.name} title="Statement of cash flows" period={yearEnded(Y)} />
          <StatementTable cols={[{ label: String(Y), highlight: true, width: 110 }]} rows={rows} />
          <FootLine className="mt-4">
            Prepared using the indirect method. Comparative cash flows for {ctx.figures.prior} are not presented, as the {ctx.figures.prior} opening position is not held in the books.
          </FootLine>
          <FootLine className="mt-1">{notesLine(ctx)}</FootLine>
        </>
      ),
    },
  ]
}

/* ---------------- notes ---------------- */

const notes: SectionRenderer = (ctx) => notesPages(ctx)

/* ---------------- five-year summary ---------------- */

function MiniColumns({ title, values, years }: { title: string; values: number[]; years: number[] }) {
  const max = Math.max(...values.map((v) => Math.max(0, v)), 1)
  const last = values.length - 1
  return (
    <div className="flex-1">
      <p className="mb-2 text-[11px] font-semibold" style={{ fontFamily: HEADING_FONT, color: "var(--ar-ink)" }}>
        {title} <span className="font-normal" style={{ color: GREY }}>(GH₵)</span>
      </p>
      <div className="flex h-[120px] items-end gap-1.5" style={{ borderBottom: "1px solid #1E1E1E" }}>
        {values.map((v, i) => (
          <div key={years[i]} className="flex flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
            <span className="mb-1 text-[7.5px] tabular-nums" style={{ color: i === last ? "var(--ar-ink)" : GREY, fontWeight: i === last ? 700 : 500 }}>
              {Math.round(v / 1000).toLocaleString("en-GB")}k
            </span>
            <span className="block w-full" style={{ height: `${(Math.max(0, v) / max) * 92}px`, background: i === last ? "var(--ar-primary)" : i === last - 1 ? "var(--ar-ink)" : "#B5B5B5" }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {years.map((y, i) => (
          <span key={y} className="flex-1 text-center text-[8.5px] tabular-nums" style={{ color: i === last ? "var(--ar-ink)" : GREY, fontWeight: i === last ? 700 : 500 }}>
            {y}
          </span>
        ))}
      </div>
    </div>
  )
}

const fiveYear: SectionRenderer = (ctx) => {
  // Newest first, as in the printed summary.
  const h = [...ctx.figures.history].sort((a, b) => b.year - a.year)
  const cols: Col[] = h.map((x, i) => ({ label: String(x.year), highlight: i === 0, width: 84 }))
  const line = (label: string, pick: (x: (typeof h)[number]) => number | string, kind: Row["kind"] = "line"): Row => ({ label, values: h.map(pick), kind })
  const income: Row[] = [
    line("Revenue", (x) => x.revenue),
    line("Gross profit", (x) => x.grossProfit),
    line("Profit for the year", (x) => x.profitForYear, "total"),
  ]
  const position: Row[] = [
    line("Total assets", (x) => x.totalAssets, "total"),
    line("Total equity", (x) => x.totalEquity),
    line("Cash and cash equivalents", (x) => x.cash),
  ]
  const ratios: Row[] = [
    line("Gross margin", (x) => pct1(x.grossProfit / x.revenue)),
    line("Net margin", (x) => pct1(x.profitForYear / x.revenue)),
    line("Return on equity", (x) => pct1(x.profitForYear / x.totalEquity)),
  ]
  const asc = [...ctx.figures.history].sort((a, b) => a.year - b.year)
  const block = (title: string, rows: Row[]) => (
    <div className="mb-6">
      <p className="mb-2 text-[12px] font-semibold" style={{ fontFamily: HEADING_FONT, color: "var(--ar-ink)" }}>
        {title}
      </p>
      <StatementTable cols={cols} rows={rows} showNote={false} />
    </div>
  )
  return [
    {
      node: (
        <>
          <StatementHeader company={ctx.company.name} title="Five-year financial summary" period={`for the years ended 31 December ${h[h.length - 1]?.year}–${h[0]?.year}`} />
          {block("Statement of comprehensive income", income)}
          {block("Statement of financial position", position)}
          {block("Key ratios", ratios)}
          <div className="mt-2 flex gap-8">
            <MiniColumns title="Revenue" values={asc.map((x) => x.revenue)} years={asc.map((x) => x.year)} />
            <MiniColumns title="Profit for the year" values={asc.map((x) => x.profitForYear)} years={asc.map((x) => x.year)} />
            <MiniColumns title="Total equity" values={asc.map((x) => x.totalEquity)} years={asc.map((x) => x.year)} />
          </div>
          <FootLine className="mt-6">
            Return on equity is profit for the year divided by total equity at the year end. Figures for {asc[0]?.year}–{asc[2]?.year} are from the Company&apos;s prior-year records.
          </FootLine>
        </>
      ),
    },
  ]
}

export const FINANCIAL: Partial<Record<SectionType, SectionRenderer>> = {
  salient,
  sci,
  sofp,
  soce,
  socf,
  notes,
  "five-year": fiveYear,
}
