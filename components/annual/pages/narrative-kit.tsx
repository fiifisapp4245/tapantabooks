"use client"

/**
 * Shared pieces for the narrative pages: display type, continuation titles,
 * signature lines, and the estimates used to split content across pages.
 * Every estimate errs on the side of an extra page, never an overflow.
 */
import * as React from "react"
import { cn } from "@/lib/utils"
import type { Section, SectionType } from "@/lib/annual/types"
import { splitBlocks } from "../page"
import type { RenderCtx } from "../registry"

export const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-open-runde)" }
export const BRAND: React.CSSProperties = { color: "var(--ar-primary)" }
export const ON_BRAND: React.CSSProperties = { background: "var(--ar-primary)", color: "var(--ar-on-primary)" }

/** The first enabled section of a type elsewhere in the report. */
export function findSection<T extends SectionType>(ctx: RenderCtx, type: T) {
  return ctx.report.sections.find((s) => s.type === type && s.enabled) as Section<T> | undefined
}

/** The page a section starts on, once the contents are known. */
export function pageOf(ctx: RenderCtx, type: SectionType) {
  const s = findSection(ctx, type)
  return s ? ctx.toc.find((t) => t.sectionId === s.id)?.page : undefined
}

/** The small title on a section's continuation pages. */
export function ContTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="h-1 w-8 shrink-0" style={{ background: "var(--ar-primary)" }} />
      <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#1E1E1E]" style={DISPLAY}>
        {children}
      </p>
    </div>
  )
}

/** A signature line with a typed name and role. */
export function Signature({ name, role, className }: { name?: string; role: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="h-12 border-b border-[#1E1E1E]" />
      <p className="mt-2 text-[11px] font-semibold text-[#1E1E1E]">{name || " "}</p>
      <p className="text-[10px] text-[#6B6B6B]">{role}</p>
    </div>
  )
}

/** A blank line to write on, with a small label under it. */
export function FillLine({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="h-7 border-b border-[#9A9A9A]" />
      {label && <p className="mt-1 text-[9px] tracking-wide text-[#6B6B6B] uppercase">{label}</p>}
    </div>
  )
}

/** The same cost paginateText uses, so callers can check what's left on a page. */
export function textCost(text: string) {
  return splitBlocks(text).reduce((t, b) => t + (b.startsWith("## ") ? 220 : b.length + 60), 0)
}

/** Split items into pages by an estimated cost (px or characters), never leaving a page empty. */
export function chunkBy<T>(items: T[], cost: (item: T) => number, firstBudget: number, budget: number) {
  const pages: T[][] = [[]]
  let used = 0
  let cap = firstBudget
  for (const item of items) {
    const c = cost(item)
    if (used + c > cap && pages[pages.length - 1].length) {
      pages.push([])
      used = 0
      cap = budget
    }
    pages[pages.length - 1].push(item)
    used += c
  }
  return pages
}

/**
 * chunkBy, plus a closing block (signatures, notes) that must fit on the last
 * page. If it doesn't, it gets a page of its own.
 */
export function packWithTail<T>(items: T[], cost: (item: T) => number, firstBudget: number, budget: number, tail: number) {
  const pages = chunkBy(items, cost, firstBudget, budget)
  const last = pages[pages.length - 1]
  const used = last.reduce((t, x) => t + cost(x), 0)
  const cap = pages.length === 1 ? firstBudget : budget
  return { pages, tailOwnPage: used + tail > cap }
}

/** Rough rendered height of a run of text: chars per line at a width, times line height. */
export function estLines(text: string, charsPerLine: number) {
  return Math.max(1, Math.ceil(text.length / charsPerLine))
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
}
