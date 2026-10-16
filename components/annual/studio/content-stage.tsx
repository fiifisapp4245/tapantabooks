"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, ListOrdered } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePrefs } from "@/lib/store"
import { isLocked, useAnnual } from "@/lib/annual/store"
import { FROM_THE_BOOKS, PARTS, type AnnualReport, type Section } from "@/lib/annual/types"
import type { AnnualFigures } from "@/lib/annual/figures"
import type { Company } from "@/lib/types"
import type { BuiltPage } from "@/components/annual/registry"
import { PAGE_W } from "@/components/annual/page"
import { ScaledPage } from "@/components/annual/report-pages"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Banner } from "@/components/patterns/banner"
import { SectionEditor } from "./section-editor"
import { userName } from "./shared"

export function ContentStage({
  report,
  figures,
  company,
  pages,
  sectionId,
  onSelect,
}: {
  report: AnnualReport
  figures: AnnualFigures
  company: Company
  pages: BuiltPage[]
  sectionId: string
  onSelect: (id: string) => void
}) {
  const section = report.sections.find((s) => s.id === sectionId) ?? report.sections[0]
  const locked = isLocked(report)
  const editorRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    editorRef.current?.scrollTo({ top: 0 })
  }, [section.id])

  return (
    <div className="flex min-h-0 flex-1">
      <SectionList report={report} pages={pages} selected={section.id} onSelect={onSelect} locked={locked} />

      <section aria-label="Section editor" className="flex min-h-0 w-[440px] shrink-0 flex-col border-r bg-card">
        <div className="shrink-0 border-b px-6 py-4">
          <p className="text-xs text-muted-foreground">{section.part}</p>
          <h2 className="truncate font-sans text-lg font-medium tracking-normal">{section.title}</h2>
        </div>
        <div ref={editorRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-5 px-6 py-5">
            {locked && <LockedBanner report={report} compact />}
            {!section.enabled && (
              <Banner tone="info" title="Left out of the report">
                Switch this section on in the list to include it. You can still edit it.
              </Banner>
            )}
            <fieldset disabled={locked} className="min-w-0 disabled:opacity-60">
              <SectionEditor key={section.id} report={report} section={section} figures={figures} pageCount={pages.length} />
            </fieldset>
          </div>
        </div>
      </section>

      <SectionPreview report={report} company={company} pages={pages.filter((p) => p.sectionId === section.id)} enabled={section.enabled} />
    </div>
  )
}

export function LockedBanner({ report, compact }: { report: AnnualReport; compact?: boolean }) {
  const userId = usePrefs((s) => s.userId)
  const reopen = useAnnual((s) => s.reopen)
  const signers = [...new Set(report.signoffs.filter((s) => s.userId).map((s) => userName(s.userId)))]
  const isOwner = userId === "ama"
  const button = isOwner ? (
    <Button size="sm" variant="outline" onClick={() => reopen(report.id)}>
      Reopen for editing
    </Button>
  ) : undefined
  return (
    <Banner
      tone="locked"
      title={report.status === "published" ? "Published, so editing is locked" : "Signed off, so editing is locked"}
      action={compact ? undefined : button}
    >
      {report.status === "published" ? "Reopening takes the report back to draft and clears every sign-off." : `Signed by ${signers.join(" and ")}. Reopening clears every sign-off.`}
      {!isOwner && " Only the Owner can reopen it."}
      {compact && button && <div className="mt-2">{button}</div>}
    </Banner>
  )
}

function SectionList({ report, pages, selected, onSelect, locked }: { report: AnnualReport; pages: BuiltPage[]; selected: string; onSelect: (id: string) => void; locked: boolean }) {
  const toggle = useAnnual((s) => s.toggleSection)
  const move = useAnnual((s) => s.moveSection)
  const firstPage = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const p of pages) if (!m.has(p.sectionId)) m.set(p.sectionId, p.number)
    return m
  }, [pages])

  return (
    <nav aria-label="Sections" className="flex min-h-0 w-[280px] shrink-0 flex-col border-r bg-background">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2.5">
        <p className="text-[13px] font-medium">Sections</p>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/reports/annual-report/contents?id=${report.id}`}>
            <ListOrdered />
            Edit contents
          </Link>
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {PARTS.map((part) => {
          const items = report.sections.filter((s) => s.part === part)
          if (!items.length) return null
          return (
            <div key={part} className="pb-2">
              <p className="px-4 pt-3 pb-1 text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">{part}</p>
              <ul>
                {items.map((s, i) => (
                  <SectionRow
                    key={s.id}
                    section={s}
                    page={firstPage.get(s.id)}
                    active={s.id === selected}
                    first={i === 0}
                    last={i === items.length - 1}
                    locked={locked}
                    onSelect={() => onSelect(s.id)}
                    onToggle={(on) => toggle(report.id, s.id, on)}
                    onMove={(dir) => move(report.id, s.id, dir)}
                  />
                ))}
              </ul>
            </div>
          )
        })}
      </div>
      <p className="shrink-0 border-t px-4 py-3 text-xs text-muted-foreground">
        {report.sections.filter((s) => s.enabled).length} of {report.sections.length} sections included · {pages.length} pages
      </p>
    </nav>
  )
}

function SectionRow({
  section,
  page,
  active,
  first,
  last,
  locked,
  onSelect,
  onToggle,
  onMove,
}: {
  section: Section
  page?: number
  active: boolean
  first: boolean
  last: boolean
  locked: boolean
  onSelect: () => void
  onToggle: (on: boolean) => void
  onMove: (dir: -1 | 1) => void
}) {
  const fromBooks = FROM_THE_BOOKS.includes(section.type)
  return (
    <li className={cn("group flex items-center gap-1 px-2", active && "bg-muted")}>
      <Switch size="sm" checked={section.enabled} disabled={locked} onCheckedChange={onToggle} aria-label={`Include ${section.title}`} className="ml-2" />
      <button type="button" onClick={onSelect} aria-current={active ? "true" : undefined} className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
        <span className={cn("w-full truncate text-[13px]", active ? "font-medium" : "", !section.enabled && "text-muted-foreground line-through decoration-muted-foreground/40")}>{section.title}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {fromBooks && <span className="rounded-sm bg-success-soft px-1.5 py-px font-medium text-success">From your books</span>}
          {section.enabled && page != null && <span>p. {page}</span>}
        </span>
      </button>
      <div className={cn("flex shrink-0 flex-col opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100", active && "opacity-100")}>
        <Button variant="ghost" size="icon-xs" disabled={locked || first} onClick={() => onMove(-1)} aria-label={`Move ${section.title} up`}>
          <ChevronUp />
        </Button>
        <Button variant="ghost" size="icon-xs" disabled={locked || last} onClick={() => onMove(1)} aria-label={`Move ${section.title} down`}>
          <ChevronDown />
        </Button>
      </div>
    </li>
  )
}

/** The muted dotted canvas the invoice editor's preview sits on. */
export const DOTTED = "bg-muted/40 bg-[radial-gradient(circle,var(--border)_1px,transparent_1.2px)] [background-size:16px_16px]"

/** The selected section's pages, fit to the pane's width, on the dotted canvas. */
function SectionPreview({ report, company, pages, enabled }: { report: AnnualReport; company: Company; pages: BuiltPage[]; enabled: boolean }) {
  const paneRef = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(0.55)
  React.useLayoutEffect(() => {
    const pane = paneRef.current
    if (!pane) return
    // Rounded, and the scrollbar's space is always reserved (below), so a page
    // that is about as tall as the pane can't make the scrollbar appear, shrink
    // the page, disappear, and grow it again — the flicker on a one-page section.
    const ro = new ResizeObserver(() => setScale(Math.round(Math.max(0.3, Math.min(0.75, (pane.clientWidth - 64) / PAGE_W)) * 100) / 100))
    ro.observe(pane)
    return () => ro.disconnect()
  }, [])

  return (
    <section ref={paneRef} aria-label="Preview" className={DOTTED + " min-w-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]"}>
      <div className="flex min-h-full flex-col items-center gap-6 p-8">
        {!enabled ? (
          <p className="mt-24 max-w-xs text-center text-sm text-muted-foreground">This section is switched off, so it has no pages. Switch it on to see it here.</p>
        ) : (
          pages.map((p) => (
            <div key={p.key} className="flex flex-col items-center gap-2">
              <ScaledPage page={p} scale={scale} report={report} company={company} />
              <span className="text-xs text-muted-foreground tabular">Page {p.number}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
