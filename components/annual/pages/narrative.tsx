"use client"

/**
 * The narrative pages of the annual report, in the editorial style of a
 * listed company's printed report: a strong brand colour, big type, pattern
 * blocks where a printed report would use photography, and portrait-led
 * statements. Colours come only from the theme's CSS variables.
 *
 * Layouts live in narrative-*.tsx; this file holds the cover, contents, part
 * openers, "who we are" and the big-number pages, and assembles the map.
 */
import * as React from "react"
import type { Part, SectionData, SectionType } from "@/lib/annual/types"
import { PARTS } from "@/lib/annual/types"
import { ArTitle, ThemePattern } from "../page"
import { PARTS_WITH_OPENER, type PageSpec, type RenderCtx, type SectionRenderer, type TocEntry } from "../registry"
import { DISPLAY } from "./narrative-kit"
import { PEOPLE } from "./narrative-people"
import { NOTICES } from "./narrative-notices"
import { DOCS } from "./narrative-docs"

const chamfer = (px: number) => `polygon(0 0, 100% 0, 100% calc(100% - ${px}px), calc(100% - ${px}px) 100%, 0 100%)`

/** A full-bleed background: the uploaded cover photo, or the theme pattern. */
function Backdrop({ ctx, band }: { ctx: RenderCtx; band?: boolean }) {
  const photo = ctx.theme.coverPhoto
  if (!photo) return <ThemePattern pattern={ctx.theme.pattern} className="absolute inset-0 size-full" />
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt="" className="absolute inset-0 size-full object-cover" />
      {band && <ThemePattern pattern={ctx.theme.pattern} className="absolute inset-x-0 bottom-0 h-[150px] w-full" />}
    </>
  )
}

/* ---------------- cover ---------------- */

function Wordmark({ ctx }: { ctx: RenderCtx }) {
  const { company } = ctx
  if (company.logoUrl)
    return (
      <span className="inline-flex h-14 items-center bg-white px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={company.logoUrl} alt={company.name} className="h-10 max-w-[200px] object-contain" />
      </span>
    )
  return (
    <span className="inline-flex h-11 items-center rounded-full border-2 px-5 text-[18px] font-bold tracking-[0.04em]" style={{ ...DISPLAY, borderColor: "var(--ar-tint)", color: "var(--ar-tint)" }}>
      {company.short || company.name.slice(0, 2).toUpperCase()}
    </span>
  )
}

const cover: SectionRenderer = (ctx) => {
  const d = ctx.section.data as SectionData["cover"]
  return [
    {
      bleed: true,
      node: (
        <div className="relative size-full overflow-hidden">
          <Backdrop ctx={ctx} band />
          {/* Thin frame behind the block, as on a printed cover. */}
          <div className="absolute top-[72px] right-12 left-12 h-[470px] border-[1.5px]" style={{ borderColor: ctx.theme.coverPhoto ? "#FFFFFF" : "var(--ar-on-primary)" }} />
          <div className="absolute top-[124px] left-0 w-[640px] px-16 pt-12 pb-16" style={{ background: "var(--ar-ink)", clipPath: chamfer(64) }}>
            <Wordmark ctx={ctx} />
            <p className="mt-9 text-[22px] leading-tight font-semibold" style={{ ...DISPLAY, color: "var(--ar-tint)" }}>
              {ctx.company.name}
            </p>
            <h1 className="mt-2 line-clamp-3 text-[54px] leading-[1.02] font-semibold tracking-[-0.03em] text-white" style={DISPLAY}>
              {d.title || `Annual report ${ctx.report.year}`}
            </h1>
            <span className="mt-7 mb-4 block h-1 w-14" style={{ background: "var(--ar-primary)" }} />
            {d.subtitle && <p className="line-clamp-2 max-w-[460px] text-[16px] leading-snug text-white">{d.subtitle}</p>}
            <p className="mt-3 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--ar-tint)" }}>
              For the year ended 31 December {ctx.report.year}
            </p>
          </div>
        </div>
      ),
    },
  ]
}

/* ---------------- contents ---------------- */

function NumCell({ page, h, invert }: { page?: number; h: number; invert?: boolean }) {
  return (
    <span
      className="flex w-9 shrink-0 items-center justify-end pr-1.5 text-[10px] font-semibold tabular-nums"
      style={{ height: h, background: invert ? "var(--ar-on-primary)" : "var(--ar-primary)", color: invert ? "var(--ar-primary)" : "var(--ar-on-primary)" }}
    >
      {page ?? ""}
    </span>
  )
}

/** Group the contents by part, in the order the parts appear. */
function byPart(toc: TocEntry[]) {
  const groups: { part: Part; entries: TocEntry[] }[] = []
  for (const e of toc) {
    const g = groups.find((x) => x.part === e.part)
    if (g) g.entries.push(e)
    else groups.push({ part: e.part, entries: [e] })
  }
  return groups
}

const contents: SectionRenderer = (ctx) => {
  const hidden = new Set(ctx.report.sections.filter((s) => s.type === "cover" || s.type === "contents").map((s) => s.id))
  const groups = byPart(ctx.toc.filter((e) => !hidden.has(e.sectionId)))
  const rows = groups.reduce((t, g) => t + g.entries.length + 1, 0)
  const rowH = Math.max(14, Math.min(25, Math.floor((800 - groups.length * 10) / Math.max(rows, 1))))
  const cellH = rowH - 5
  return [
    {
      node: (
        <div className="flex h-full flex-col">
          <div className="mb-8 flex shrink-0 items-end justify-between gap-8">
            <h2 className="text-[40px] leading-none font-semibold tracking-[-0.03em]" style={{ ...DISPLAY, color: "var(--ar-primary)" }}>
              Contents
            </h2>
            <div className="relative h-16 w-[240px] overflow-hidden" style={{ clipPath: chamfer(24) }}>
              <ThemePattern pattern={ctx.theme.pattern} className="absolute inset-0 size-full" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden border-t border-[#D9D9D9] pt-4">
            {groups.map((g) => {
              const first = g.entries[0]?.page
              const partPage = first && PARTS_WITH_OPENER.includes(g.part) ? first - 1 : first
              return (
                <div key={g.part} className="mb-2.5">
                  <div className="flex items-center gap-3" style={{ height: rowH }}>
                    <NumCell page={partPage} h={cellH} />
                    <span className="truncate text-[11.5px] font-semibold text-[#1E1E1E]" style={DISPLAY}>
                      {g.part}
                    </span>
                  </div>
                  {g.entries.map((e) => (
                    <div key={e.sectionId} className="flex items-center gap-3" style={{ height: rowH }}>
                      <NumCell page={e.page} h={cellH} />
                      <span className="truncate pl-3 text-[10.5px] text-[#2B2B2B]">{e.title}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      ),
    },
  ]
}

/* ---------------- part opener ---------------- */

export function PartOpener({ part, ctx }: { part: Part; ctx: RenderCtx }) {
  const photo = !!ctx.theme.coverPhoto
  const sections = ctx.report.sections.filter((s) => s.enabled && s.part === part)
  const shown = sections.slice(0, 14)
  const n = PARTS.indexOf(part) + 1
  const fg = photo ? "var(--ar-on-primary)" : "#1E1E1E"
  return (
    <div className="relative size-full overflow-hidden">
      <Backdrop ctx={ctx} />
      <div className="absolute top-[300px] left-[72px] w-[520px]">
        {/* The tab on top of the block. */}
        <div className="h-3.5 w-44" style={{ background: "var(--ar-ink)" }} />
        <div className="px-10 pt-8 pb-10" style={{ background: photo ? "var(--ar-primary)" : "#FFFFFF", color: fg, clipPath: chamfer(40) }}>
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase" style={{ color: photo ? fg : "var(--ar-primary)" }}>
            Part {String(n).padStart(2, "0")}
          </p>
          <h2 className="mt-2 text-[46px] leading-[1.02] font-semibold tracking-[-0.03em]" style={DISPLAY}>
            {part}
          </h2>
          {shown.length > 0 && (
            <div className="mt-7 border-t pt-4" style={{ borderColor: photo ? fg : "#D9D9D9" }}>
              {shown.map((s) => {
                const page = ctx.toc.find((t) => t.sectionId === s.id)?.page
                return (
                  <div key={s.id} className="flex h-6 items-center gap-3">
                    <NumCell page={page} h={18} invert={photo} />
                    <span className="truncate text-[11px]">{s.title}</span>
                  </div>
                )
              })}
              {sections.length > shown.length && <p className="mt-1 pl-12 text-[10px]">and {sections.length - shown.length} more</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------- who we are ---------------- */

const whoWeAre: SectionRenderer = (ctx) => {
  const d = ctx.section.data as SectionData["who-we-are"]
  const values = (d.values ?? []).slice(0, 8)
  const statement = (label: string, text: string) => (
    <div className="min-w-0 border-t-2 pt-4" style={{ borderColor: "var(--ar-primary)" }}>
      <p className="mb-2 text-[10px] font-semibold tracking-[0.16em] uppercase" style={{ color: "var(--ar-primary)" }}>
        {label}
      </p>
      <p className="line-clamp-5 text-[24px] leading-[1.2] font-semibold tracking-[-0.02em] text-[#1E1E1E]" style={DISPLAY}>
        {text}
      </p>
    </div>
  )
  return [
    {
      node: (
        <div className="flex h-full flex-col">
          <ArTitle kicker={ctx.section.part}>{ctx.section.title}</ArTitle>
          {d.intro && <p className="mb-9 line-clamp-6 max-w-[580px] shrink-0 text-[15px] leading-[1.6] text-[#2B2B2B]">{d.intro}</p>}
          <div className="mb-10 grid shrink-0 grid-cols-2 gap-10">
            {statement("Our vision", d.vision)}
            {statement("Our mission", d.mission)}
          </div>
          {values.length > 0 && (
            <div className="min-h-0 shrink-0">
              <h3 className="mb-4 text-[10px] font-semibold tracking-[0.16em] uppercase" style={{ color: "var(--ar-primary)" }}>
                Our values
              </h3>
              <ol className="grid grid-cols-2 gap-x-10 gap-y-5">
                {values.map((v, i) => (
                  <li key={i} className="flex items-start gap-4 border-b border-[#E3E3E3] pb-4">
                    <span className="text-[28px] leading-none font-semibold tracking-[-0.03em]" style={{ ...DISPLAY, color: "var(--ar-primary)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="line-clamp-2 pt-1 text-[13px] leading-snug font-semibold text-[#1E1E1E]">{v}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="relative mt-auto h-[110px] shrink-0 overflow-hidden" style={{ clipPath: chamfer(32) }}>
            <ThemePattern pattern={ctx.theme.pattern} className="absolute inset-0 size-full" />
          </div>
        </div>
      ),
    },
  ]
}

/* ---------------- the year in numbers ---------------- */

type Item = SectionData["highlights"]["items"][number]

/** Font size that keeps a number on one line within a width. */
const numberSize = (value: string, width: number, max: number) => Math.min(max, Math.floor(width / (Math.max(value.length, 1) * 0.62)))

function SectionTab({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase" style={{ background: "var(--ar-primary)", color: "var(--ar-on-primary)" }}>
      {children}
    </span>
  )
}

function BigNumber({ item, width, max }: { item: Item; width: number; max: number }) {
  return (
    <>
      <p className="leading-[0.9] font-bold tracking-[-0.04em] whitespace-nowrap" style={{ ...DISPLAY, color: "var(--ar-primary)", fontSize: numberSize(item.value, width, max) }}>
        {item.value}
      </p>
      <p className="mt-3 line-clamp-1 text-[40px] leading-tight font-semibold tracking-[-0.02em] text-[#1E1E1E]" style={DISPLAY}>
        {item.unit}
      </p>
      {item.caption && <p className="mt-3 line-clamp-3 max-w-[460px] text-[17px] leading-[1.45] text-[#2B2B2B]">{item.caption}</p>}
    </>
  )
}

const highlights: SectionRenderer = (ctx) => {
  const d = ctx.section.data as SectionData["highlights"]
  const items = d.items ?? []
  const pattern = ctx.theme.pattern
  if (!items.length)
    return [
      {
        node: (
          <>
            <ArTitle kicker={ctx.section.part}>{ctx.section.title}</ArTitle>
            <p className="text-[11px] text-[#6B6B6B]">Add a number to show it here.</p>
          </>
        ),
      },
    ]

  // A few numbers get a page each; more than four share a page in pairs.
  if (items.length <= 4)
    return items.map<PageSpec>((item, i) => ({
      bleed: true,
      node: (
        <div className="relative size-full overflow-hidden bg-white">
          <div className="absolute inset-x-16 top-16 h-[480px]">
            {i === 0 && <SectionTab>{ctx.section.title}</SectionTab>}
            <div className="mt-16">
              <BigNumber item={item} width={666} max={230} />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[50%]" style={{ clipPath: "polygon(0 64px, 64px 0, 100% 0, 100% 100%, 0 100%)" }}>
            <ThemePattern pattern={pattern} className="absolute inset-0 size-full" />
          </div>
        </div>
      ),
    }))

  const pairs: Item[][] = []
  for (let i = 0; i < items.length; i += 2) pairs.push(items.slice(i, i + 2))
  return pairs.map<PageSpec>((pair, i) => ({
    bleed: true,
    node: (
      <div className="relative flex size-full flex-col overflow-hidden bg-white">
        {pair.map((item, k) => (
          <div key={item.id} className={"relative flex h-1/2 " + (k === 1 ? "flex-row-reverse" : "")}>
            <div className="relative w-[230px] shrink-0 overflow-hidden">
              <ThemePattern pattern={pattern} className="absolute inset-0 size-full" />
            </div>
            <div className="min-w-0 flex-1 px-14 pt-16">
              {i === 0 && k === 0 && (
                <div className="mb-8">
                  <SectionTab>{ctx.section.title}</SectionTab>
                </div>
              )}
              <BigNumber item={item} width={440} max={170} />
            </div>
          </div>
        ))}
      </div>
    ),
  }))
}

export const NARRATIVE: Partial<Record<SectionType, SectionRenderer>> = {
  cover,
  contents,
  "who-we-are": whoWeAre,
  highlights,
  ...NOTICES,
  ...PEOPLE,
  ...DOCS,
}
