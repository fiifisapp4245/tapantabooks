"use client"

import * as React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TocChoice } from "@/lib/annual/store"
import { FY2025_FIGURES } from "@/lib/annual/store"
import { FROM_THE_BOOKS, PARTS, type AnnualReport, type Section } from "@/lib/annual/types"
import type { Company } from "@/lib/types"
import { buildPages } from "@/components/annual/registry"
import { ScaledPage } from "@/components/annual/report-pages"
import { PAGE_W } from "@/components/annual/page"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DOTTED } from "./content-stage"

/** Reorder, rename and switch sections to match a table of contents (mirrors the store). */
export function applyChoices(sections: Section[], toc: TocChoice[]): Section[] {
  const byId = new Map(sections.map((x) => [x.id, x]))
  const ordered = toc.flatMap((c) => {
    const s = byId.get(c.id)
    return s ? [{ ...s, enabled: c.enabled, title: c.title.trim() || s.title }] : []
  })
  const missing = sections.filter((x) => !toc.some((c) => c.id === x.id)).map((x) => ({ ...x, enabled: false }))
  return [...ordered, ...missing]
}

export const tocFromReport = (r: AnnualReport): TocChoice[] => r.sections.map((s) => ({ id: s.id, enabled: s.enabled, title: s.title }))

/**
 * The editable table of contents: switch sections on or off, rename them, and
 * reorder them within their part. `sections` supplies each row's part and type.
 */
export function TocEditor({ toc, onChange, sections }: { toc: TocChoice[]; onChange: (toc: TocChoice[]) => void; sections: Section[] }) {
  const meta = React.useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections])
  const partOf = (id: string) => meta.get(id)?.part

  const patch = (id: string, p: Partial<TocChoice>) => onChange(toc.map((c) => (c.id === id ? { ...c, ...p } : c)))
  const move = (id: string, dir: -1 | 1) => {
    const i = toc.findIndex((c) => c.id === id)
    const j = i + dir
    if (j < 0 || j >= toc.length || partOf(toc[j].id) !== partOf(toc[i].id)) return
    const next = [...toc]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-5">
      {PARTS.map((part) => {
        const rows = toc.filter((c) => partOf(c.id) === part)
        if (!rows.length) return null
        return (
          <section key={part} aria-label={part}>
            <h3 className="mb-1.5 text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">{part}</h3>
            <ul className="divide-y rounded-lg border">
              {rows.map((c, i) => {
                const s = meta.get(c.id)!
                const fromBooks = FROM_THE_BOOKS.includes(s.type)
                return (
                  <li key={c.id} className={cn("flex items-center gap-3 px-3 py-2", !c.enabled && "bg-muted/40")}>
                    <Switch size="sm" checked={c.enabled} onCheckedChange={(enabled) => patch(c.id, { enabled })} aria-label={`Include ${c.title}`} />
                    <Input
                      value={c.title}
                      onChange={(e) => patch(c.id, { title: e.target.value })}
                      aria-label={`Title of ${s.title}`}
                      className={cn("h-8 min-w-0 flex-1 border-transparent bg-transparent px-2 shadow-none hover:border-input focus-visible:border-ring", !c.enabled && "text-muted-foreground")}
                    />
                    {fromBooks && <span className="shrink-0 rounded-sm bg-success-soft px-1.5 py-px text-[11px] font-medium text-success">From your books</span>}
                    <div className="flex shrink-0">
                      <Button variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(c.id, -1)} aria-label={`Move ${c.title} up`}>
                        <ChevronUp />
                      </Button>
                      <Button variant="ghost" size="icon-sm" disabled={i === rows.length - 1} onClick={() => move(c.id, 1)} aria-label={`Move ${c.title} down`}>
                        <ChevronDown />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

/** The Contents page as it will print with these choices, on the dotted canvas. */
export function ContentsPreview({ report, toc, company }: { report: AnnualReport; toc: TocChoice[]; company: Company }) {
  const preview = React.useMemo(() => ({ ...report, sections: applyChoices(report.sections, toc) }), [report, toc])
  const { pages } = React.useMemo(() => buildPages(preview, FY2025_FIGURES, company), [preview, company])
  const contents = pages.find((p) => preview.sections.find((s) => s.id === p.sectionId)?.type === "contents" && !p.key.startsWith("opener"))
  const count = toc.filter((c) => c.enabled).length
  const paneRef = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(0.55)
  React.useLayoutEffect(() => {
    const pane = paneRef.current
    if (!pane) return
    const ro = new ResizeObserver(() => setScale(Math.round(Math.max(0.25, Math.min(0.55, (pane.clientWidth - 64) / PAGE_W)) * 100) / 100))
    ro.observe(pane)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={paneRef} className={cn(DOTTED, "min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]")}>
      <div className="flex min-h-full flex-col items-center gap-3 p-8">
        <p className="text-sm text-muted-foreground tabular">
          {count} sections · about {pages.length} pages
        </p>
        {contents ? (
          <ScaledPage page={contents} scale={scale} report={preview} company={company} />
        ) : (
          <p className="mt-16 max-w-xs text-center text-sm text-muted-foreground">The Contents page is switched off, so there&apos;s nothing to preview. Your report will still be numbered.</p>
        )}
      </div>
    </div>
  )
}
