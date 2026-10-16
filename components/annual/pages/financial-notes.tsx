"use client"

/**
 * Notes to the financial statements. Each note is a block with an estimated
 * height; blocks are packed onto pages in order. The accounting policies
 * (note 1) are the only text the company writes and are split across pages
 * at paragraph boundaries when they run long.
 */
import * as React from "react"
import type { SectionData } from "@/lib/annual/types"
import type { PlByAccount } from "@/lib/annual/figures"
import type { PageSpec, RenderCtx } from "../registry"
import { ArBody, fsNum, splitBlocks } from "../page"
import {
  FootLine,
  HEADER_CONTINUED_H,
  HEADER_H,
  NOTE_HEADING_H,
  NoteHeading,
  PAGE_CONTENT_H,
  StatementHeader,
  StatementTable,
  tableHeight,
  type Col,
  type Row,
} from "./financial-ui"

/** Note numbers, used by the statements' Note column. */
export const NOTE = {
  policies: 1,
  revenue: 2,
  costOfSales: 3,
  opex: 4,
  finance: 5,
  tax: 6,
  ppe: 7,
  inventories: 8,
  cash: 9,
  borrowings: 10,
  shareCapital: 11,
  dividends: 12,
  events: 13,
} as const

type Block = { key: string; h: number; node: React.ReactNode }

const BLOCK_GAP = 24
const TEXT_LINE_H = 16.5
/** Characters per line of 10.5px text across the full content width. */
const FULL_CHARS = 112
const textHeight = (s: string) => Math.ceil(s.length / FULL_CHARS) * TEXT_LINE_H + 8

/** GH₵ per share: two decimals, or three when needed (0.30, 0.225). */
const perShare = (x: number) => (Math.round(x * 1000) % 10 === 0 ? x.toFixed(2) : x.toFixed(3))

function NoteText({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[10.5px] leading-[16.5px] text-[#2B2B2B]">{children}</p>
}

/** Policies: estimated height of one paragraph/subheading in a 2-column ArBody. */
const POLICY_CHARS = 52
const policyBlockH = (b: string) => (b.startsWith("## ") ? 40 : Math.ceil(b.length / POLICY_CHARS) * 18.2 + 10)
const policiesH = (blocks: string[]) => (blocks.reduce((h, b) => h + policyBlockH(b), 0) / 2) * 1.15 + 12

export function notesPages(ctx: RenderCtx): PageSpec[] {
  const f = ctx.figures
  const data = ctx.section.data as SectionData["notes"]
  const Y = f.year
  const P = f.prior
  const cols: Col[] = [
    { label: String(Y), highlight: true },
    { label: String(P) },
  ]

  /** Lines by account (current year), with the total for both years. */
  const accountRows = (lines: PlByAccount, totalCur: number, totalPrev: number, totalLabel = "Total"): Row[] => [
    ...lines.map((l) => ({ label: l.account.name, values: [l.amount, null] })),
    { label: totalLabel, values: [totalCur, totalPrev], kind: "total" as const },
  ]

  const tableBlock = (key: string, n: number, title: string, rows: Row[], opts: { text?: string; after?: string; cols?: Col[] } = {}): Block => ({
    key,
    h: NOTE_HEADING_H + tableHeight(rows) + (opts.text ? textHeight(opts.text) : 0) + (opts.after ? textHeight(opts.after) + 6 : 0),
    node: (
      <div>
        <NoteHeading n={n}>{title}</NoteHeading>
        {opts.text && <NoteText>{opts.text}</NoteText>}
        <StatementTable cols={opts.cols ?? cols} rows={rows} showNote={false} size="sm" />
        {opts.after && <FootLine className="mt-1.5">{opts.after}</FootLine>}
      </div>
    ),
  })

  const textBlock = (key: string, n: number, title: string, paras: string[]): Block => ({
    key,
    h: NOTE_HEADING_H + paras.reduce((h, p) => h + textHeight(p), 0),
    node: (
      <div>
        <NoteHeading n={n}>{title}</NoteHeading>
        {paras.map((p, i) => (
          <NoteText key={i}>{p}</NoteText>
        ))}
      </div>
    ),
  })

  const { cur, prev } = f.pl
  const n = f.notes
  const hasOtherIncome = n.otherIncome.length > 0 || Math.abs(cur.otherIncome) >= 0.5 || Math.abs(prev.otherIncome) >= 0.5

  /* ---- 7: property, plant and equipment (accumulated depreciation allocated by cost) ---- */
  const alloc = (total: number, weights: number[]) => {
    const w = weights.reduce((t, x) => t + x, 0)
    const parts = weights.map((x) => (w ? Math.round((total * x) / w) : 0))
    parts[parts.length - 1] = total - parts.slice(0, -1).reduce((t, x) => t + x, 0)
    return parts
  }
  const cats = n.ppe
  const depCur = alloc(f.bs.cur.accDep, cats.map((c) => c.cost2025))
  const depPrev = alloc(f.bs.prev.accDep, cats.map((c) => c.cost2024))
  const withTotal = (xs: number[]) => [...xs, xs.reduce((t, x) => t + x, 0)]
  const costPrev = withTotal(cats.map((c) => c.cost2024))
  const costCur = withTotal(cats.map((c) => c.cost2025))
  const additions = withTotal(cats.map((c) => c.cost2025 - c.cost2024))
  const accPrev = withTotal(depPrev)
  const charge = withTotal(depCur.map((d, i) => d - depPrev[i]))
  const accCur = withTotal(depCur)
  const nbvCur = costCur.map((c, i) => c - accCur[i])
  const nbvPrev = costPrev.map((c, i) => c - accPrev[i])
  const ppeCols: Col[] = [...cats.map((c) => ({ label: c.label, width: 112 })), { label: "Total", highlight: true, width: 104 }]
  const ppeRows: Row[] = [
    { label: "Cost", kind: "heading" },
    { label: `At 1 January ${Y}`, values: costPrev },
    { label: "Additions", values: additions },
    { label: `At 31 December ${Y}`, values: costCur, kind: "sub" },
    { label: "Accumulated depreciation", kind: "heading" },
    { label: `At 1 January ${Y}`, values: accPrev },
    { label: "Charge for the year", values: charge },
    { label: `At 31 December ${Y}`, values: accCur, kind: "sub" },
    { label: "Net book value", kind: "heading" },
    { label: `At 31 December ${Y}`, values: nbvCur, kind: "total" },
    { label: `At 31 December ${P}`, values: nbvPrev },
  ]

  /* ---- 1: policies, split into chunks that fit ---- */
  const policyBlocks = splitBlocks(data.policies ?? "")

  const blocks: Block[] = [
    hasOtherIncome
      ? tableBlock("revenue", NOTE.revenue, "Revenue and other income", [
          { label: "Revenue", kind: "heading" },
          ...accountRows(n.revenue, cur.revenue, prev.revenue, "Total revenue"),
          { label: "Other income", kind: "heading" },
          ...accountRows(n.otherIncome, cur.otherIncome, prev.otherIncome, "Total other income"),
        ])
      : tableBlock("revenue", NOTE.revenue, "Revenue and other income", accountRows(n.revenue, cur.revenue, prev.revenue, "Total revenue"), {
          after: `The Company had no other income in ${Y} or ${P}.`,
        }),
    tableBlock("cos", NOTE.costOfSales, "Cost of sales", accountRows(n.costOfSales, cur.costOfSales, prev.costOfSales, "Total cost of sales")),
    tableBlock("opex", NOTE.opex, "Operating expenses", [
      { label: "Staff costs", kind: "heading" },
      ...accountRows(n.staff, cur.staff, prev.staff, "Total staff costs"),
      { label: "Premises costs", kind: "heading" },
      ...accountRows(n.premises, cur.premises, prev.premises, "Total premises costs"),
      { label: "Other operating expenses", kind: "heading" },
      ...accountRows(n.otherOpex, cur.otherOpex, prev.otherOpex, "Total other operating expenses"),
    ], { after: `Depreciation of ${fsNum(cur.depreciation)} (${P}: ${fsNum(prev.depreciation)}) is shown separately; see note ${NOTE.ppe}.` }),
    tableBlock("finance", NOTE.finance, "Finance costs", accountRows(n.financeCosts, cur.financeCosts, prev.financeCosts, "Total finance costs")),
    tableBlock(
      "tax",
      NOTE.tax,
      "Income tax",
      [
        { label: "Profit before tax", values: [cur.profitBeforeTax, prev.profitBeforeTax] },
        { label: "Tax at the corporate income tax rate of 25%", values: [Math.round(cur.profitBeforeTax * 0.25), Math.round(prev.profitBeforeTax * 0.25)] },
        { label: "Income tax expense", values: [cur.tax, prev.tax], kind: "grand" },
      ],
      { text: "The charge is current tax at Ghana's corporate income tax rate of 25% on the year's profit before tax. There are no deferred tax balances." }
    ),
    tableBlock("ppe", NOTE.ppe, "Property, plant and equipment", ppeRows, {
      cols: ppeCols,
      after: "Accumulated depreciation is held in one account in the books, so it is allocated to each category in proportion to cost.",
    }),
    tableBlock("inv", NOTE.inventories, "Inventories", [
      { label: "Goods for resale", values: [f.bs.cur.inventory, f.bs.prev.inventory] },
      { label: "Total inventories", values: [f.bs.cur.inventory, f.bs.prev.inventory], kind: "total" },
    ], { after: `Inventories recognised as an expense in cost of sales during the year were ${fsNum(cur.costOfSales)} (${P}: ${fsNum(prev.costOfSales)}).` }),
    tableBlock("cash", NOTE.cash, "Cash and cash equivalents", [
      ...n.cash.map((c) => ({ label: c.account.name, values: [c.amount, null] as (number | null)[] })),
      { label: "Total cash and cash equivalents", values: [f.bs.cur.cash, f.bs.prev.cash], kind: "total" },
    ]),
    tableBlock(
      "borrowings",
      NOTE.borrowings,
      "Borrowings",
      [
        { label: "Non-current portion", values: [f.bs.cur.borrowingsNonCurrent, f.bs.prev.borrowingsNonCurrent] },
        { label: "Current portion", values: [f.bs.cur.borrowingsCurrent, f.bs.prev.borrowingsCurrent] },
        { label: "Total borrowings", values: [f.bs.cur.totalLiabilities, f.bs.prev.totalLiabilities], kind: "total" },
      ],
      {
        text: `A ${n.borrowings.termYears}-year term loan from ${n.borrowings.lender} at an interest rate of ${(n.borrowings.rate * 100).toFixed(0)}% a year, repayable in instalments. The amount due within twelve months of the reporting date is shown as current.`,
      }
    ),
    tableBlock(
      "shares",
      NOTE.shareCapital,
      "Share capital",
      [
        { label: "Issued and fully paid", kind: "heading" },
        { label: `${f.sharesInIssue.toLocaleString("en-GB")} ordinary shares of no par value`, values: [f.bs.cur.shareCapital, f.bs.prev.shareCapital], kind: "total" },
      ],
      { text: "There were no changes in issued share capital during the year. All shares rank equally for dividends and voting." }
    ),
    tableBlock(
      "dividends",
      NOTE.dividends,
      "Dividends",
      [
        { label: "Dividends paid during the year", values: [f.dividends.paid2025, f.dividends.paid2024], kind: "total" },
        {
          label: "Dividend per share (GH₵)",
          values: [perShare(f.dividends.paid2025 / f.sharesInIssue), perShare(f.dividends.paid2024 / f.sharesInIssue)],
        },
      ],
      {
        after: `After the reporting date the Directors proposed a final dividend of GH₵ ${f.dividends.proposedPerShare.toFixed(2)} per share, ${fsNum(f.dividends.proposedTotal)} in total. It is subject to approval by shareholders at the Annual General Meeting and has not been recognised as a liability at 31 December ${Y}.`,
      }
    ),
    textBlock("events", NOTE.events, "Events after the reporting date", [
      `After 31 December ${Y} the Directors proposed a final dividend of GH₵ ${f.dividends.proposedPerShare.toFixed(2)} per share (${fsNum(f.dividends.proposedTotal)} in total), as set out in note ${NOTE.dividends}.`,
      "There were no other events after the reporting date that require adjustment to, or disclosure in, these financial statements.",
    ]),
  ]

  /* ---- pack onto pages ---- */
  const pages: React.ReactNode[][] = [[]]
  let left = PAGE_CONTENT_H - HEADER_H
  const newPage = () => {
    pages.push([])
    left = PAGE_CONTENT_H - HEADER_CONTINUED_H
  }
  const put = (key: string, h: number, node: React.ReactNode) => {
    if (h > left && pages[pages.length - 1].length) newPage()
    pages[pages.length - 1].push(<React.Fragment key={key}>{node}</React.Fragment>)
    left -= h + BLOCK_GAP
  }

  // Note 1, chunked by what's left on each page.
  if (policyBlocks.length) {
    let chunk: string[] = []
    let first = true
    const flush = () => {
      if (!chunk.length) return
      const head = first
      const text = chunk.join("\n\n")
      const h = (head ? NOTE_HEADING_H : 20) + policiesH(chunk)
      put(
        `policies-${pages.length}-${chunk.length}`,
        h,
        <div>
          {head ? <NoteHeading n={NOTE.policies}>Accounting policies</NoteHeading> : <p className="mb-2 text-[10px] font-semibold" style={{ color: "var(--ar-ink)" }}>{NOTE.policies}. Accounting policies (continued)</p>}
          <ArBody text={text} columns={2} />
        </div>
      )
      first = false
      chunk = []
    }
    for (const b of policyBlocks) {
      const next = [...chunk, b]
      const h = (first ? NOTE_HEADING_H : 20) + policiesH(next)
      // Don't leave a subheading stranded at the end of a chunk.
      if (h > left && chunk.length && !chunk[chunk.length - 1].startsWith("## ")) {
        flush()
        newPage()
      }
      chunk.push(b)
    }
    flush()
  }

  for (const b of blocks) put(b.key, b.h, b.node)

  return pages.map((nodes, i) => ({
    node: (
      <>
        <StatementHeader
          company={ctx.company.name}
          title="Notes to the financial statements"
          period={`for the year ended 31 December ${Y}`}
          continued={i > 0}
        />
        <div className="flex flex-col gap-6">{nodes}</div>
      </>
    ),
  }))
}
