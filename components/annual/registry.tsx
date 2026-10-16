"use client"

/**
 * Turns a report into numbered A4 pages.
 *
 * Each section type has a renderer that returns one or more pages. Parts get
 * an opener page before their first enabled section. Pages are built twice:
 * once to count them, then again with the finished contents (TOC) so the
 * Contents page can show real page numbers.
 */
import * as React from "react"
import type { AnnualFigures } from "@/lib/annual/figures"
import type { AnnualReport, Part, Section, SectionType, Theme } from "@/lib/annual/types"
import type { Company } from "@/lib/types"
import { NARRATIVE, PartOpener } from "./pages/narrative"
import { FINANCIAL } from "./pages/financial"
import { ArBody, ArTitle } from "./page"

export type TocEntry = { sectionId: string; title: string; part: Part; page: number }

export type RenderCtx = {
  report: AnnualReport
  section: Section
  figures: AnnualFigures
  theme: Theme
  company: Company
  /** Finished contents; empty on the counting pass. */
  toc: TocEntry[]
}

/** One page of a section. `bleed` pages fill the sheet edge to edge, with no footer. */
export type PageSpec = { node: React.ReactNode; bleed?: boolean }

export type SectionRenderer = (ctx: RenderCtx) => PageSpec[]

/** Parts that open with a full-page divider, as in a printed annual report. */
export const PARTS_WITH_OPENER: Part[] = ["Who we are", "Performance", "Governance", "Financial statements", "Shareholder information"]

const fallback: SectionRenderer = ({ section }) => [
  {
    node: (
      <>
        <ArTitle>{section.title}</ArTitle>
        <ArBody text="This section's layout is on its way." />
      </>
    ),
  },
]

export const RENDERERS: Partial<Record<SectionType, SectionRenderer>> = { ...NARRATIVE, ...FINANCIAL }

export type BuiltPage = {
  key: string
  number: number
  /** The section this page belongs to; part openers belong to the part's first section. */
  sectionId: string
  spec: PageSpec
}

export function buildPages(report: AnnualReport, figures: AnnualFigures, company: Company) {
  const run = (toc: TocEntry[]) => {
    const pages: BuiltPage[] = []
    const entries: TocEntry[] = []
    const opened = new Set<Part>()
    for (const section of report.sections) {
      if (!section.enabled) continue
      const ctx: RenderCtx = { report, section, figures, theme: report.theme, company, toc }
      if (PARTS_WITH_OPENER.includes(section.part) && !opened.has(section.part)) {
        opened.add(section.part)
        pages.push({ key: `opener-${section.part}`, number: pages.length + 1, sectionId: section.id, spec: { node: <PartOpener part={section.part} ctx={ctx} />, bleed: true } })
      }
      const renderer = RENDERERS[section.type] ?? fallback
      const specs = renderer(ctx)
      entries.push({ sectionId: section.id, title: section.title, part: section.part, page: pages.length + 1 })
      specs.forEach((spec, i) => pages.push({ key: `${section.id}-${i}`, number: pages.length + 1, sectionId: section.id, spec }))
    }
    return { pages, toc: entries }
  }
  // Counting pass, then the real pass with page numbers in the contents.
  const first = run([])
  return run(first.toc)
}

export const footerText = (company: Company, year: number) => `${company.name} · ${year} Annual report`
