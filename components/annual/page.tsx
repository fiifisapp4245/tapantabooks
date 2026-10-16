"use client"

/**
 * The annual report's page system. Every page is an A4 sheet at 96 dpi
 * (794 × 1123 px), white, square-cornered, flat. Brand colours come from the
 * report theme through CSS variables, so pages never hard-code a colour.
 */
import * as React from "react"
import { cn } from "@/lib/utils"
import type { Theme } from "@/lib/annual/types"

export const PAGE_W = 794
export const PAGE_H = 1123

/** Theme → CSS variables for everything inside the report. */
export function themeStyle(t: Theme): React.CSSProperties {
  return {
    ["--ar-primary" as string]: t.primary,
    ["--ar-ink" as string]: t.ink,
    ["--ar-tint" as string]: t.tint,
    ["--ar-on-primary" as string]: t.onPrimary,
  }
}

/** One A4 page. Standard pages get margins and a footer; bleed pages are edge to edge. */
export function ArPage({
  number,
  footer,
  bleed,
  className,
  children,
}: {
  number: number
  /** Left side of the footer, e.g. "Kumasi Traders Ltd · 2025 Annual report". */
  footer: string
  bleed?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn("ar-page relative shrink-0 overflow-hidden bg-white text-[#1E1E1E]", className)}
      style={{ width: PAGE_W, height: PAGE_H, fontFamily: "var(--font-inter)" }}
    >
      {bleed ? (
        children
      ) : (
        <>
          <div className="absolute inset-x-16 top-14 bottom-24 flex flex-col">{children}</div>
          <div className="absolute inset-x-16 bottom-10 flex items-center gap-3 text-[9px] text-[#6B6B6B]">
            <span className="h-px flex-1" style={{ background: "var(--ar-primary)" }} />
            <span className="tracking-wide">{footer}</span>
            <span
              className="flex size-6 items-center justify-center rounded-full text-[9px] font-semibold"
              style={{ background: "var(--ar-primary)", color: "var(--ar-on-primary)" }}
            >
              {number}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

/** A section's title on a standard page, with a short brand bar above it. */
export function ArTitle({ children, kicker, className }: { children: React.ReactNode; kicker?: string; className?: string }) {
  return (
    <div className={cn("mb-7", className)}>
      <span className="mb-3 block h-1 w-12" style={{ background: "var(--ar-primary)" }} />
      {kicker && <p className="mb-1 text-[10px] font-semibold tracking-[0.14em] uppercase text-[#6B6B6B]">{kicker}</p>}
      <h2 className="text-[30px] leading-[1.1] font-semibold tracking-[-0.02em]" style={{ fontFamily: "var(--font-open-runde)" }}>
        {children}
      </h2>
    </div>
  )
}

/** Body text: blank line = paragraph, "## " = subheading. Optionally in two columns. */
export function ArBody({ text, columns = 1, className }: { text: string; columns?: 1 | 2; className?: string }) {
  const blocks = splitBlocks(text)
  return (
    <div className={cn("text-[11px] leading-[1.65] text-[#2B2B2B]", columns === 2 && "columns-2 gap-8", className)}>
      {blocks.map((b, i) =>
        b.startsWith("## ") ? (
          <h3 key={i} className="mt-4 mb-1.5 break-after-avoid text-[12px] font-semibold first:mt-0" style={{ color: "var(--ar-ink)" }}>
            {b.slice(3)}
          </h3>
        ) : (
          <p key={i} className="mb-2.5">
            {b}
          </p>
        )
      )}
    </div>
  )
}

export function splitBlocks(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
}

/**
 * Split text into page-sized chunks at paragraph boundaries, by an estimated
 * character budget per page (subheadings cost extra). Good enough for print
 * layout without measuring the DOM.
 */
export function paginateText(text: string, firstPageBudget: number, pageBudget: number) {
  const blocks = splitBlocks(text)
  const pages: string[][] = [[]]
  let used = 0
  let budget = firstPageBudget
  for (const b of blocks) {
    const cost = b.startsWith("## ") ? 220 : b.length + 60
    if (used + cost > budget && pages[pages.length - 1].length) {
      pages.push([])
      used = 0
      budget = pageBudget
    }
    pages[pages.length - 1].push(b)
    used += cost
  }
  return pages.map((p) => p.join("\n\n"))
}

/**
 * Financial statement numbers, whole cedis, negatives in brackets (the
 * accounting convention for statements; each statement says so in its header).
 */
export function fsNum(n: number | undefined | null) {
  if (n == null) return ""
  if (Math.abs(n) < 0.5) return "–"
  const s = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(Math.abs(Math.round(n)))
  return n < 0 ? `(${s})` : s
}

/* ---------------- decoration ---------------- */

/**
 * A unique pattern id per drawing. Pattern contents take their colours from
 * where the <pattern> sits, so a shared id would paint every page (and every
 * template preview) in the first page's theme, and break when that first copy
 * is hidden, as the printable copy is on screen.
 */
function usePatternId() {
  return `ar-pat-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
}

/** Geometric pattern inspired by Adinkra symbols, drawn in the brand colour. */
export function AdinkraPattern({ className, opacity = 1 }: { className?: string; opacity?: number }) {
  const pid = usePatternId()
  return (
    <svg className={className} aria-hidden style={{ opacity }}>
      <defs>
        <pattern id={pid} width="56" height="56" patternUnits="userSpaceOnUse">
          <rect width="56" height="56" fill="var(--ar-primary)" />
          {/* Gye Nyame–like swirl reduced to circles and a diamond */}
          <circle cx="14" cy="14" r="7" fill="none" stroke="var(--ar-on-primary)" strokeOpacity=".35" strokeWidth="2" />
          <circle cx="14" cy="14" r="2" fill="var(--ar-on-primary)" fillOpacity=".35" />
          <path d="M42 34 L50 42 L42 50 L34 42 Z" fill="none" stroke="var(--ar-on-primary)" strokeOpacity=".3" strokeWidth="2" />
          <path d="M34 14 h16 M42 6 v16" stroke="var(--ar-on-primary)" strokeOpacity=".25" strokeWidth="2" />
          <path d="M6 42 q8 -10 16 0" fill="none" stroke="var(--ar-on-primary)" strokeOpacity=".25" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  )
}

/** Woven kente-like stripes in the brand colour and ink. */
export function KentePattern({ className, opacity = 1 }: { className?: string; opacity?: number }) {
  const pid = usePatternId()
  return (
    <svg className={className} aria-hidden style={{ opacity }}>
      <defs>
        <pattern id={pid} width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="48" fill="var(--ar-primary)" />
          <rect y="0" width="48" height="8" fill="var(--ar-ink)" fillOpacity=".85" />
          <rect y="20" width="48" height="4" fill="var(--ar-on-primary)" fillOpacity=".35" />
          <rect x="0" y="8" width="8" height="12" fill="var(--ar-ink)" fillOpacity=".6" />
          <rect x="24" y="8" width="8" height="12" fill="var(--ar-on-primary)" fillOpacity=".25" />
          <rect x="16" y="28" width="16" height="12" fill="var(--ar-ink)" fillOpacity=".5" />
          <rect y="44" width="48" height="4" fill="var(--ar-ink)" fillOpacity=".85" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  )
}

/** Quiet diagonal lines, for a more corporate look. */
export function LinesPattern({ className, opacity = 1 }: { className?: string; opacity?: number }) {
  const pid = usePatternId()
  return (
    <svg className={className} aria-hidden style={{ opacity }}>
      <defs>
        <pattern id={pid} width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="24" height="24" fill="var(--ar-primary)" />
          <rect width="3" height="24" fill="var(--ar-on-primary)" fillOpacity=".18" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  )
}

export function ThemePattern({ pattern, className, opacity }: { pattern: Theme["pattern"]; className?: string; opacity?: number }) {
  if (pattern === "kente") return <KentePattern className={className} opacity={opacity} />
  if (pattern === "lines") return <LinesPattern className={className} opacity={opacity} />
  return <AdinkraPattern className={className} opacity={opacity} />
}

/** A person's portrait: the uploaded photo, or their initials on the brand colour. */
export function Portrait({ name, photo, className }: { name: string; photo?: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: "var(--ar-tint)" }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="size-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[40px] font-semibold" style={{ color: "var(--ar-primary)", fontFamily: "var(--font-open-runde)" }}>
          {initials}
        </span>
      )}
    </div>
  )
}
