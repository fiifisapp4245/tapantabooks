"use client"

/**
 * The text-led pages: long-form statements in two columns, committee reports,
 * the auditor's letter, shareholder information and administration.
 */
import * as React from "react"
import type { SectionData } from "@/lib/annual/types"
import { ArBody, ArTitle, paginateText, splitBlocks } from "../page"
import type { PageSpec, RenderCtx, SectionRenderer } from "../registry"
import { ContTitle, DISPLAY, FillLine, Signature, chunkBy, estLines, findSection, initialsOf, textCost } from "./narrative-kit"

/* ---------------- long-form text ---------------- */

const FIRST_BUDGET = 4600
const PAGE_BUDGET = 5200

function TextPage({ ctx, text, first, children }: { ctx: RenderCtx; text: string; first: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      {first ? <ArTitle kicker={ctx.section.part}>{ctx.section.title}</ArTitle> : <ContTitle>{ctx.section.title} (continued)</ContTitle>}
      <div className="min-h-0 shrink overflow-hidden">{text && <ArBody text={text} columns={2} />}</div>
      {children}
    </div>
  )
}

/**
 * Two-column text, paginated. An optional closing block (signatures) goes on
 * the last page if there's room, otherwise on a page of its own.
 */
function textPages(ctx: RenderCtx, body: string, closing?: { node: React.ReactNode; cost: number }): PageSpec[] {
  const chunks = paginateText(body || "", FIRST_BUDGET, PAGE_BUDGET)
  if (!chunks.length) chunks.push("")
  const lastCap = chunks.length === 1 ? FIRST_BUDGET : PAGE_BUDGET
  const ownPage = !!closing && textCost(chunks[chunks.length - 1]) + closing.cost > lastCap
  const specs: PageSpec[] = chunks.map((text, i) => ({
    node: (
      <TextPage ctx={ctx} text={text} first={i === 0}>
        {closing && !ownPage && i === chunks.length - 1 && closing.node}
      </TextPage>
    ),
  }))
  if (closing && ownPage)
    specs.push({
      node: (
        <TextPage ctx={ctx} text="" first={false}>
          {closing.node}
        </TextPage>
      ),
    })
  return specs
}

const plainText: SectionRenderer = (ctx) => textPages(ctx, (ctx.section.data as { body: string }).body)

const directorsReport: SectionRenderer = (ctx) => {
  const d = ctx.section.data as SectionData["directors-report"]
  const chair = findSection(ctx, "chairman")?.data.name
  const md = findSection(ctx, "ceo")?.data.name
  const node = (
    <div className="mt-auto shrink-0 pt-6">
      <p className="mb-1 text-[11px] text-[#2B2B2B]">Signed on behalf of the Board of Directors by:</p>
      <div className="grid grid-cols-[1fr_1fr_0.6fr] gap-10">
        <Signature name={chair} role="Director" />
        <Signature name={md} role="Director" />
        <div className="self-end">
          <FillLine label="Date" />
        </div>
      </div>
    </div>
  )
  return textPages(ctx, d.body, { node, cost: 1000 })
}

/* ---------------- committees ---------------- */

type Piece = { id: string; name: string; chair: string; text: string; cont: boolean }

const pieceCost = (p: Piece) => Math.max(110, splitBlocks(p.text).reduce((t, b) => t + (b.startsWith("## ") ? 32 : estLines(b, 78) * 18 + 10), 0)) + 44

function CommitteeBlock({ p, first }: { p: Piece; first: boolean }) {
  return (
    <div className="grid grid-cols-[190px_1fr] gap-8 border-t py-5" style={{ borderColor: first ? "var(--ar-ink)" : "#D9D9D9" }}>
      <div className="min-w-0">
        <span className="mb-2.5 block h-1 w-8" style={{ background: "var(--ar-primary)" }} />
        <h3 className="text-[15px] leading-tight font-semibold tracking-[-0.01em] text-[#1E1E1E]" style={DISPLAY}>
          {p.name}
          {p.cont && <span className="font-normal text-[#6B6B6B]"> (continued)</span>}
        </h3>
        {p.chair && (
          <p className="mt-2 text-[10px] text-[#6B6B6B]">
            Chair <span className="font-semibold text-[#1E1E1E]">{p.chair}</span>
          </p>
        )}
      </div>
      <ArBody text={p.text} />
    </div>
  )
}

const committees: SectionRenderer = (ctx) => {
  const d = ctx.section.data as SectionData["committees"]
  const pieces: Piece[] = (d.items ?? []).flatMap((c) => paginateText(c.body || " ", 3200, 3200).map((text, k) => ({ id: `${c.id}-${k}`, name: c.name, chair: c.chair, text, cont: k > 0 })))
  const pages = chunkBy(pieces, pieceCost, 950 - 110, 950 - 60)
  return pages.map((group, i) => ({
    node: (
      <div className="flex h-full flex-col">
        {i === 0 ? <ArTitle kicker={ctx.section.part}>{ctx.section.title}</ArTitle> : <ContTitle>{ctx.section.title} (continued)</ContTitle>}
        <div className="min-h-0 overflow-hidden">
          {group.map((p, k) => (
            <CommitteeBlock key={p.id} p={p} first={k === 0} />
          ))}
        </div>
      </div>
    ),
  }))
}

/* ---------------- auditor's report ---------------- */

function AuditorHeader({ d }: { d: SectionData["auditor"] }) {
  return (
    <div className="mb-7 flex shrink-0 items-start gap-5 border-b border-[#D9D9D9] pb-5">
      <span className="flex size-12 shrink-0 items-center justify-center text-[16px] font-semibold" style={{ ...DISPLAY, background: "var(--ar-ink)", color: "#FFFFFF" }}>
        {initialsOf(d.firm || "A")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-tight font-semibold text-[#1E1E1E]" style={DISPLAY}>
          {d.firm}
        </p>
        {d.licence && <p className="mt-1 text-[10px] text-[#6B6B6B]">Practising licence {d.licence}</p>}
      </div>
    </div>
  )
}

function AuditorSign({ d }: { d: SectionData["auditor"] }) {
  return (
    <div className="mt-auto shrink-0 pt-6">
      <div className="flex items-end justify-between gap-10">
        <div className="w-[260px]">
          <div className="h-12 border-b border-[#1E1E1E]" />
          <p className="mt-2 text-[11px] font-semibold text-[#1E1E1E]">{d.partner}</p>
          <p className="text-[10px] text-[#6B6B6B]">Engagement partner{d.licence ? ` · ${d.licence}` : ""}</p>
          <p className="mt-1.5 text-[10.5px] font-semibold text-[#2B2B2B]">For and on behalf of {d.firm}</p>
        </div>
        <p className="text-[10.5px] text-[#2B2B2B]">{d.signedOn}</p>
      </div>
      {d.fileName && (
        <p className="mt-4 inline-flex items-center gap-2 border border-[#D9D9D9] px-2.5 py-1 text-[9.5px] text-[#6B6B6B]">
          <span className="size-1.5 rounded-full" style={{ background: "var(--ar-primary)" }} />
          Signed report attached: <span className="font-semibold text-[#1E1E1E]">{d.fileName}</span>
        </p>
      )}
    </div>
  )
}

const auditor: SectionRenderer = (ctx) => {
  const d = ctx.section.data as SectionData["auditor"]
  const FIRST = 3800
  const LATER = 5000
  const chunks = paginateText(d.body || "", FIRST, LATER)
  if (!chunks.length) chunks.push("")
  const cap = chunks.length === 1 ? FIRST : LATER
  const ownPage = textCost(chunks[chunks.length - 1]) + 1100 > cap
  const specs: PageSpec[] = chunks.map((text, i) => {
    const last = i === chunks.length - 1
    return {
      node: (
        <div className="flex h-full flex-col">
          {i === 0 ? (
            <>
              <AuditorHeader d={d} />
              <p className="text-[13px] leading-snug font-semibold tracking-wide text-[#1E1E1E] uppercase" style={DISPLAY}>
                Independent auditor&apos;s report
              </p>
              <p className="mb-1 text-[11px] font-semibold text-[#1E1E1E] uppercase">To the members of {ctx.company.name}</p>
              <p className="mb-5 text-[11px] text-[#6B6B6B]">Report on the audit of the financial statements</p>
            </>
          ) : (
            <ContTitle>{ctx.section.title} (continued)</ContTitle>
          )}
          <div className="min-h-0 shrink overflow-hidden">
            <ArBody text={text} className="max-w-[600px]" />
          </div>
          {last && !ownPage && <AuditorSign d={d} />}
        </div>
      ),
    }
  })
  if (ownPage)
    specs.push({
      node: (
        <div className="flex h-full flex-col">
          <ContTitle>{ctx.section.title} (continued)</ContTitle>
          <AuditorSign d={d} />
        </div>
      ),
    })
  return specs
}

/* ---------------- shareholders ---------------- */

const SWATCHES = [
  "var(--ar-primary)",
  "var(--ar-ink)",
  "color-mix(in srgb, var(--ar-primary) 55%, white)",
  "color-mix(in srgb, var(--ar-ink) 50%, white)",
  "color-mix(in srgb, var(--ar-primary) 28%, white)",
  "color-mix(in srgb, var(--ar-ink) 25%, white)",
]
const FIRST_ROWS = 13
const LATER_ROWS = 22

const pctOf = (n: number, of: number) => (of ? `${((n / of) * 100).toFixed(1)}%` : "–")

const shareholders: SectionRenderer = (ctx) => {
  const d = ctx.section.data as SectionData["shareholders"]
  const inIssue = ctx.figures.sharesInIssue
  const holders = [...(d.holders ?? [])].sort((a, b) => b.shares - a.shares)
  const held = holders.reduce((t, h) => t + h.shares, 0)
  const other = Math.max(0, inIssue - held)
  // Bar: the top five, then everyone else together.
  const top = holders.slice(0, 5)
  const rest = holders.slice(5).reduce((t, h) => t + h.shares, 0) + other
  const segs = [...top.map((h) => ({ label: h.name, shares: h.shares })), ...(rest > 0 ? [{ label: "All other shareholders", shares: rest }] : [])]
  const base = Math.max(inIssue, held) || 1

  const pages: (typeof holders)[] = []
  pages.push(holders.slice(0, FIRST_ROWS))
  for (let i = FIRST_ROWS; i < holders.length; i += LATER_ROWS) pages.push(holders.slice(i, i + LATER_ROWS))

  return pages.map((rows, i) => {
    const last = i === pages.length - 1
    const offset = i === 0 ? 0 : FIRST_ROWS + (i - 1) * LATER_ROWS
    return {
      node: (
        <div className="flex h-full flex-col">
          {i === 0 ? (
            <>
              <ArTitle kicker={ctx.section.part}>{ctx.section.title}</ArTitle>
              {d.intro && <p className="mb-7 line-clamp-4 max-w-[560px] shrink-0 text-[12px] leading-[1.65] text-[#2B2B2B]">{d.intro}</p>}
              <div className="mb-9 shrink-0">
                <h3 className="mb-3 text-[13px] font-semibold text-[#1E1E1E]" style={DISPLAY}>
                  Share distribution
                </h3>
                <div className="flex h-9 w-full overflow-hidden">
                  {segs.map((s, k) => (
                    <div key={s.label} className="h-full border-r-2 border-white last:border-r-0" style={{ width: `${(s.shares / base) * 100}%`, background: SWATCHES[k % SWATCHES.length] }} />
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-x-6 gap-y-1.5">
                  {segs.map((s, k) => (
                    <div key={s.label} className="flex min-w-0 items-center gap-2 text-[10px] text-[#2B2B2B]">
                      <span className="size-2.5 shrink-0" style={{ background: SWATCHES[k % SWATCHES.length] }} />
                      <span className="truncate">{s.label}</span>
                      <span className="ml-auto shrink-0 font-semibold text-[#1E1E1E] tabular-nums">{pctOf(s.shares, inIssue)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <h3 className="mb-2 shrink-0 text-[13px] font-semibold text-[#1E1E1E]" style={DISPLAY}>
                {holders.length > 5 ? "Shareholders" : "Top shareholders"}
              </h3>
            </>
          ) : (
            <ContTitle>{ctx.section.title} (continued)</ContTitle>
          )}
          <table className="w-full table-fixed border-collapse text-[11px] text-[#2B2B2B]">
            <thead>
              <tr className="border-b-2 text-[9.5px] tracking-[0.08em] text-[#6B6B6B] uppercase" style={{ borderColor: "var(--ar-primary)" }}>
                <th className="w-8 py-2 text-left font-semibold">#</th>
                <th className="py-2 text-left font-semibold">Shareholder</th>
                <th className="w-32 py-2 text-right font-semibold">Shares held</th>
                <th className="w-24 py-2 text-right font-semibold">% of issue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h, k) => (
                <tr key={h.id} className="border-b border-[#E3E3E3]">
                  <td className="py-2 text-[#6B6B6B] tabular-nums">{offset + k + 1}</td>
                  <td className="truncate py-2 pr-4 font-semibold text-[#1E1E1E]">{h.name}</td>
                  <td className="py-2 text-right tabular-nums">{h.shares.toLocaleString("en-GB")}</td>
                  <td className="py-2 text-right tabular-nums">{pctOf(h.shares, inIssue)}</td>
                </tr>
              ))}
              {last && other > 0 && (
                <tr className="border-b border-[#E3E3E3]">
                  <td />
                  <td className="py-2 text-[#6B6B6B]">Other shareholders</td>
                  <td className="py-2 text-right tabular-nums">{other.toLocaleString("en-GB")}</td>
                  <td className="py-2 text-right tabular-nums">{pctOf(other, inIssue)}</td>
                </tr>
              )}
              {last && (
                <tr className="border-b-2 font-semibold text-[#1E1E1E]" style={{ borderColor: "var(--ar-ink)" }}>
                  <td />
                  <td className="py-2">Shares in issue</td>
                  <td className="py-2 text-right tabular-nums">{inIssue.toLocaleString("en-GB")}</td>
                  <td className="py-2 text-right tabular-nums">100.0%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ),
    }
  })
}

/* ---------------- administration ---------------- */

const administration: SectionRenderer = (ctx) => {
  const d = ctx.section.data as SectionData["administration"]
  const board = findSection(ctx, "board")?.data.people ?? []
  const rows: { label: string; value: React.ReactNode }[] = [
    ...(board.length
      ? [
          {
            label: "Board of directors",
            value: (
              <ul className="space-y-0.5">
                {board.slice(0, 10).map((p) => (
                  <li key={p.id}>
                    <span className="font-semibold text-[#1E1E1E]">{p.name}</span> <span className="text-[#6B6B6B]">· {p.role}</span>
                  </li>
                ))}
              </ul>
            ),
          },
        ]
      : []),
    { label: "Company secretary", value: d.secretary },
    { label: "Registered office", value: d.registeredOffice },
    { label: "Registration number", value: d.registrationNumber },
    { label: "Taxpayer identification number", value: d.tin },
    { label: "Auditors", value: d.auditors },
    {
      label: "Bankers",
      value: (
        <ul className="space-y-0.5">
          {(d.bankers ?? []).slice(0, 8).map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ),
    },
    { label: "Solicitors", value: d.solicitors },
  ]
  return [
    {
      node: (
        <div className="flex h-full flex-col">
          <ArTitle kicker={ctx.section.part}>{ctx.section.title}</ArTitle>
          <dl className="min-h-0 overflow-hidden border-b border-[#D9D9D9]">
            {rows.map((r) => (
              <div key={r.label} className={"grid grid-cols-[210px_1fr] gap-8 border-t py-4" + (r === rows[0] ? " border-t-2" : "")} style={{ borderTopColor: r === rows[0] ? "var(--ar-primary)" : "#D9D9D9" }}>
                <dt className="text-[10px] font-semibold tracking-[0.12em] text-[#6B6B6B] uppercase">{r.label}</dt>
                <dd className="line-clamp-[12] text-[12px] leading-[1.6] text-[#2B2B2B]">{r.value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
      ),
    },
  ]
}

export const DOCS: Record<"about" | "governance" | "directors-report" | "committees" | "auditor" | "shareholders" | "administration", SectionRenderer> = {
  about: plainText,
  governance: plainText,
  "directors-report": directorsReport,
  committees,
  auditor,
  shareholders,
  administration,
}
