"use client"

/**
 * The notices part: notice of the AGM, the proxy form shareholders print and
 * return, and the declaration of the final dividend.
 */
import * as React from "react"
import { formatMoney } from "@/lib/money"
import type { Resolution, SectionData } from "@/lib/annual/types"
import { ArTitle } from "../page"
import type { PageSpec, RenderCtx, SectionRenderer } from "../registry"
import { ContTitle, DISPLAY, FillLine, Signature, estLines, findSection, packWithTail, pageOf } from "./narrative-kit"

type Numbered = Resolution & { n: number }

/** Ordinary business first, then special, numbered in that order. */
function numbered(resolutions: Resolution[]): Numbered[] {
  const sorted = [...resolutions.filter((r) => r.kind === "ordinary"), ...resolutions.filter((r) => r.kind === "special")]
  return sorted.map((r, i) => ({ ...r, n: i + 1 }))
}

function agmFacts(ctx: RenderCtx) {
  return findSection(ctx, "agm-notice")?.data
}

function secretaryName(ctx: RenderCtx) {
  return findSection(ctx, "administration")?.data.secretary
}

function registeredOffice(ctx: RenderCtx) {
  return findSection(ctx, "administration")?.data.registeredOffice
}

/* ---------------- notice of AGM ---------------- */

function MeetingBox({ date, time, venue }: { date: string; time: string; venue: string }) {
  const cell = (label: string, value: string) => (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold tracking-[0.14em] text-[#6B6B6B] uppercase">{label}</p>
      <p className="mt-1 line-clamp-2 text-[14px] leading-snug font-semibold text-[#1E1E1E]" style={DISPLAY}>
        {value || "—"}
      </p>
    </div>
  )
  return (
    <div className="mb-7 grid shrink-0 grid-cols-[1.1fr_0.6fr_1.4fr] gap-6 border-l-4 px-6 py-5" style={{ background: "var(--ar-tint)", borderColor: "var(--ar-primary)" }}>
      {cell("Date", date)}
      {cell("Time", time)}
      {cell("Venue", venue)}
    </div>
  )
}

function ResolutionList({ items }: { items: Numbered[] }) {
  const groups = [
    { kind: "ordinary" as const, label: "Ordinary business", sub: "Ordinary resolutions" },
    { kind: "special" as const, label: "Special business", sub: "Special resolutions" },
  ]
  return (
    <>
      {groups.map((g) => {
        const rows = items.filter((r) => r.kind === g.kind)
        if (!rows.length) return null
        return (
          <div key={g.kind} className="mb-5">
            <div className="mb-2 flex items-baseline justify-between border-b border-[#1E1E1E] pb-1.5">
              <h3 className="text-[13px] font-semibold text-[#1E1E1E]" style={DISPLAY}>
                {g.label}
              </h3>
              <span className="text-[9px] tracking-[0.12em] text-[#6B6B6B] uppercase">{g.sub}</span>
            </div>
            <ol>
              {rows.map((r) => (
                <li key={r.id} className="flex gap-4 border-b border-[#E3E3E3] py-2 text-[11px] leading-[1.6] text-[#2B2B2B]">
                  <span className="w-6 shrink-0 text-[13px] font-semibold" style={{ ...DISPLAY, color: "var(--ar-primary)" }}>
                    {r.n}
                  </span>
                  <span className="min-w-0">{r.text}</span>
                </li>
              ))}
            </ol>
          </div>
        )
      })}
    </>
  )
}

function AgmClosing({ ctx, returnBy }: { ctx: RenderCtx; returnBy?: string }) {
  const proxyPage = pageOf(ctx, "proxy-form")
  const office = registeredOffice(ctx)
  return (
    <div className="mt-auto shrink-0 pt-4">
      <h3 className="mb-1.5 text-[12px] font-semibold" style={{ color: "var(--ar-ink)" }}>
        Proxies
      </h3>
      <p className="mb-2 text-[10.5px] leading-[1.6] text-[#2B2B2B]">
        A member entitled to attend and vote at the meeting may appoint a proxy to attend and vote instead of them. A proxy need not be a member of the Company.
        {proxyPage ? ` A proxy form is on page ${proxyPage}.` : ""} To be valid, the completed form must reach the Company Secretary
        {office ? ` at ${office}` : ""}
        {returnBy ? ` by ${returnBy}` : " not less than 48 hours before the meeting"}.
      </p>
      <div className="mt-5 flex items-end justify-between gap-8">
        <p className="text-[10.5px] text-[#6B6B6B]">By order of the Board</p>
        <Signature name={secretaryName(ctx)} role="Company secretary" className="w-[220px]" />
      </div>
    </div>
  )
}

const agmNotice: SectionRenderer = (ctx) => {
  const d = ctx.section.data as SectionData["agm-notice"]
  const items = numbered(d.resolutions ?? [])
  const returnBy = findSection(ctx, "proxy-form")?.data.returnBy
  // px estimates: a resolution is ~100 characters a line at 18px, plus its rule and padding.
  const cost = (r: Numbered) => estLines(r.text, 100) * 18 + 18
  const intro = d.body ? estLines(d.body, 95) * 20 + 24 : 0
  const first = 950 - 90 - intro - 110 - 70
  const { pages, tailOwnPage } = packWithTail(items, cost, first, 950 - 120, 200)
  const specs: PageSpec[] = pages.map((rows, i) => {
    const last = i === pages.length - 1
    return {
      node: (
        <div className="flex h-full flex-col">
          {i === 0 ? (
            <>
              <ArTitle kicker={`${d.agmNumber} Annual General Meeting`}>{ctx.section.title}</ArTitle>
              {d.body && <p className="mb-5 shrink-0 text-[12px] leading-[1.65] text-[#2B2B2B]">{d.body}</p>}
              <MeetingBox date={d.date} time={d.time} venue={d.venue} />
            </>
          ) : (
            <ContTitle>{ctx.section.title} (continued)</ContTitle>
          )}
          <div className="min-h-0 overflow-hidden">
            <ResolutionList items={rows} />
          </div>
          {last && !tailOwnPage && <AgmClosing ctx={ctx} returnBy={returnBy} />}
        </div>
      ),
    }
  })
  if (tailOwnPage)
    specs.push({
      node: (
        <div className="flex h-full flex-col">
          <ContTitle>{ctx.section.title} (continued)</ContTitle>
          <AgmClosing ctx={ctx} returnBy={returnBy} />
        </div>
      ),
    })
  return specs
}

/* ---------------- proxy form ---------------- */

function Box() {
  return <span className="mx-auto block size-4 border border-[#1E1E1E]" />
}

function ProxyTable({ rows }: { rows: Numbered[] }) {
  return (
    <table className="w-full border-collapse text-[10px] leading-[1.5] text-[#2B2B2B]">
      <thead>
        <tr style={{ background: "var(--ar-primary)", color: "var(--ar-on-primary)" }}>
          <th className="w-9 px-2 py-1.5 text-left font-semibold">No.</th>
          <th className="px-2 py-1.5 text-left font-semibold">Resolution</th>
          <th className="w-14 px-1 py-1.5 text-center font-semibold">For</th>
          <th className="w-14 px-1 py-1.5 text-center font-semibold">Against</th>
          <th className="w-14 px-1 py-1.5 text-center font-semibold">Abstain</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-[#D9D9D9] align-middle">
            <td className="px-2 py-2 font-semibold text-[#1E1E1E]">{r.n}</td>
            <td className="px-2 py-2">
              <span className="mr-1.5 text-[8.5px] font-semibold tracking-wide text-[#6B6B6B] uppercase">{r.kind}</span>
              {r.text}
            </td>
            <td className="py-2">
              <Box />
            </td>
            <td className="py-2">
              <Box />
            </td>
            <td className="py-2">
              <Box />
            </td>
          </tr>
        ))}
        {!rows.length && (
          <tr>
            <td colSpan={5} className="px-2 py-3 text-[#6B6B6B]">
              Add resolutions to the notice of the annual general meeting to list them here.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

function ProxyClosing({ ctx, returnBy }: { ctx: RenderCtx; returnBy: string }) {
  const office = registeredOffice(ctx)
  return (
    <div className="mt-auto shrink-0 pt-5">
      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-6">
        <FillLine label="Signature of shareholder" />
        <FillLine label="Date" />
        <FillLine label="Number of shares held" />
      </div>
      <div className="mt-6 border-l-4 px-5 py-3.5" style={{ background: "var(--ar-tint)", borderColor: "var(--ar-primary)" }}>
        <p className="text-[12px] font-semibold text-[#1E1E1E]" style={DISPLAY}>
          Return by {returnBy || "—"}
        </p>
        <p className="mt-0.5 text-[10px] leading-[1.55] text-[#2B2B2B]">
          Deliver or post the completed form to the Company Secretary, {ctx.company.name}
          {office ? `, ${office}` : ""}.
        </p>
      </div>
      <p className="mt-3 text-[9px] leading-[1.55] text-[#6B6B6B]">
        Mark each resolution with an X. If you don&apos;t indicate how to vote, your proxy may vote or abstain as they see fit. A company shareholder should sign under its seal or by an
        authorised officer. Completing this form does not stop you attending and voting in person.
      </p>
    </div>
  )
}

const proxyForm: SectionRenderer = (ctx) => {
  const d = ctx.section.data as SectionData["proxy-form"]
  const agm = agmFacts(ctx)
  const items = numbered(agm?.resolutions ?? [])
  const cost = (r: Numbered) => estLines(r.text, 72) * 15 + 18
  const { pages, tailOwnPage } = packWithTail(items, cost, 560, 950 - 90, 210)
  const meeting = agm ? `${agm.agmNumber} Annual General Meeting · ${agm.date}${agm.time ? `, ${agm.time}` : ""}` : "Annual General Meeting"
  const specs: PageSpec[] = pages.map((rows, i) => {
    const last = i === pages.length - 1
    return {
      node: (
        <div className="flex h-full flex-col">
          {i === 0 ? (
            <>
              <ArTitle kicker={meeting} className="mb-5">
                {ctx.section.title}
              </ArTitle>
              <div className="shrink-0 text-[11px] leading-[1.6] text-[#2B2B2B]">
                <div className="flex items-end gap-3">
                  <span className="pb-1.5 font-semibold text-[#1E1E1E]">I/We</span>
                  <FillLine label="Full name(s) of shareholder(s), in block capitals" className="flex-1" />
                </div>
                <div className="mt-2 flex items-end gap-3">
                  <span className="pb-1.5 font-semibold text-[#1E1E1E]">of</span>
                  <FillLine label="Address" className="flex-1" />
                </div>
                <p className="mt-3">being a member/members of {ctx.company.name}, hereby appoint</p>
                <FillLine label="Name of proxy" />
                <p className="mt-3 mb-5">
                  or failing them, the Chairman of the meeting, as my/our proxy to vote for me/us on my/our behalf at the {agm?.agmNumber ?? ""} Annual General Meeting of the
                  Company{agm ? ` to be held at ${agm.venue} on ${agm.date}${agm.time ? ` at ${agm.time}` : ""}` : ""}, and at any adjournment of it, as follows:
                </p>
              </div>
            </>
          ) : (
            <ContTitle>{ctx.section.title} (continued)</ContTitle>
          )}
          <div className="min-h-0 shrink overflow-hidden">
            <ProxyTable rows={rows} />
          </div>
          {last && !tailOwnPage && <ProxyClosing ctx={ctx} returnBy={d.returnBy} />}
        </div>
      ),
    }
  })
  if (tailOwnPage)
    specs.push({
      node: (
        <div className="flex h-full flex-col">
          <ContTitle>{ctx.section.title} (continued)</ContTitle>
          <ProxyClosing ctx={ctx} returnBy={d.returnBy} />
        </div>
      ),
    })
  return specs
}

/* ---------------- dividend ---------------- */

const dividend: SectionRenderer = (ctx) => {
  const d = ctx.section.data as SectionData["dividend"]
  const shares = ctx.figures.sharesInIssue
  const total = (d.perShare || 0) * shares
  const md = findSection(ctx, "ceo")?.data
  const fd = findSection(ctx, "cfo")?.data
  const dates = [
    { label: "Ex-dividend date", value: d.exDate },
    { label: "Qualifying date", value: d.qualifyingDate },
    { label: "Payment date", value: d.paymentDate },
  ]
  return [
    {
      node: (
        <div className="flex h-full flex-col">
          <ArTitle kicker={`Year ended 31 December ${ctx.report.year}`}>{ctx.section.title}</ArTitle>
          <div className="flex shrink-0 items-start gap-10">
            <div className="w-[250px] shrink-0">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[#6B6B6B] uppercase">Final dividend</p>
              <p className="mt-2 flex items-start gap-2 leading-none" style={{ ...DISPLAY, color: "var(--ar-primary)" }}>
                <span className="mt-3 text-[28px] font-semibold">GH₵</span>
                <span className="text-[104px] font-semibold tracking-[-0.04em]">{(d.perShare || 0).toFixed(2)}</span>
              </p>
              <p className="mt-2 text-[13px] font-semibold text-[#1E1E1E]">per ordinary share</p>
              <p className="mt-1 text-[10.5px] text-[#6B6B6B]">
                {formatMoney(total, "GHS", { whole: true })} in total, on {shares.toLocaleString("en-GB")} shares
              </p>
            </div>
            <p className="max-h-[300px] min-w-0 flex-1 overflow-hidden border-l border-[#D9D9D9] pl-8 text-[12px] leading-[1.7] text-[#2B2B2B]">{d.body}</p>
          </div>

          <div className="mt-10 shrink-0">
            <h3 className="mb-2 text-[13px] font-semibold text-[#1E1E1E]" style={DISPLAY}>
              Key dates
            </h3>
            <div className="border-t-2" style={{ borderColor: "var(--ar-primary)" }}>
              {dates.map((x) => (
                <div key={x.label} className="flex items-baseline justify-between border-b border-[#E3E3E3] py-2.5 text-[11.5px]">
                  <span className="font-semibold text-[#1E1E1E]">{x.label}</span>
                  <span className="font-semibold text-[#1E1E1E] tabular-nums">{x.value || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 shrink-0 space-y-2.5 text-[11px] leading-[1.65] text-[#2B2B2B]">
            <p>
              Shareholders on the register at the close of business on {d.qualifyingDate || "the qualifying date"} qualify for the dividend. Shares bought on or after the ex-dividend date,{" "}
              {d.exDate || "—"}, do not carry the right to it.
            </p>
            <p>
              On {d.paymentDate || "the payment date"}, the dividend, net of withholding tax, will be paid by bank transfer or mobile money to the accounts shareholders have registered
              with the Company.
            </p>
            <p>The proposed final dividend was approved by the Board of Directors and signed on its behalf by:</p>
          </div>

          <div className="mt-auto grid shrink-0 grid-cols-2 gap-16 pt-6">
            <Signature name={md?.name} role={md?.role || "Managing director"} />
            <Signature name={fd?.name} role={fd?.role || "Finance director"} />
          </div>
        </div>
      ),
    },
  ]
}

export const NOTICES: Record<"agm-notice" | "proxy-form" | "dividend", SectionRenderer> = {
  "agm-notice": agmNotice,
  "proxy-form": proxyForm,
  dividend,
}
