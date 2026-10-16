"use client"

import * as React from "react"
import { Check, ChevronLeft, ChevronRight, ImagePlus, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { isLocked, useAnnual } from "@/lib/annual/store"
import { THEMES, type AnnualReport, type Theme, type ThemePreset } from "@/lib/annual/types"
import type { Company } from "@/lib/types"
import type { BuiltPage } from "@/components/annual/registry"
import { PAGE_W, ThemePattern, themeStyle } from "@/components/annual/page"
import { ScaledPage } from "@/components/annual/report-pages"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field } from "@/components/patterns/form-bits"
import { DOTTED, LockedBanner } from "./content-stage"
import { pickFile } from "./shared"

const PRESET_NAMES: Record<ThemePreset, string> = { crimson: "Crimson", gold: "Gold", emerald: "Emerald", navy: "Navy" }
const PATTERNS: { id: Theme["pattern"]; name: string }[] = [
  { id: "adinkra", name: "Adinkra" },
  { id: "kente", name: "Kente" },
  { id: "lines", name: "Lines" },
]

export function DesignStage({ report, company, pages }: { report: AnnualReport; company: Company; pages: BuiltPage[] }) {
  // The open page by position, so Previous/Next can step through every page.
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)
  const open = openIndex == null ? null : (pages[openIndex] ?? null)
  const hasPrev = openIndex != null && openIndex > 0
  const hasNext = openIndex != null && openIndex < pages.length - 1
  const step = (dir: -1 | 1) => setOpenIndex((i) => (i == null ? i : Math.min(pages.length - 1, Math.max(0, i + dir))))
  const sectionTitle = (p: BuiltPage) => (p.key.startsWith("opener-") ? p.key.slice(7) : report.sections.find((s) => s.id === p.sectionId)?.title)

  return (
    <div className="flex min-h-0 flex-1">
      <ThemePanel report={report} />
      <section aria-label="All pages" className={cn(DOTTED, "min-w-0 flex-1 overflow-y-auto")}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] justify-items-center gap-x-4 gap-y-6 p-8">
          {pages.map((p) => (
            <figure key={p.key} className="flex flex-col items-center gap-1.5">
              <ScaledPage page={p} scale={0.2} report={report} company={company} onClick={() => setOpenIndex(pages.indexOf(p))} />
              <figcaption className="max-w-[159px] truncate text-center text-[11px] text-muted-foreground">
                <span className="tabular">{p.number}</span> · {sectionTitle(p)}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenIndex(null)}>
        <DialogContent
          className="max-h-[calc(100svh-2rem)] gap-3 overflow-y-auto sm:max-w-[min(680px,calc(100%-2rem))]"
          onKeyDown={(e) => {
            // ← and → move between pages without closing.
            if (e.key === "ArrowLeft" && hasPrev) {
              e.preventDefault()
              step(-1)
            }
            if (e.key === "ArrowRight" && hasNext) {
              e.preventDefault()
              step(1)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Page {open?.number}</DialogTitle>
            <DialogDescription>{open && sectionTitle(open)}</DialogDescription>
          </DialogHeader>
          {open && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="icon" className="shrink-0 rounded-full" onClick={() => step(-1)} disabled={!hasPrev} aria-label="Previous page">
                <ChevronLeft />
              </Button>
              <ScaledPage page={open} scale={Math.min(0.62, 520 / PAGE_W)} report={report} company={company} />
              <Button variant="outline" size="icon" className="shrink-0 rounded-full" onClick={() => step(1)} disabled={!hasNext} aria-label="Next page">
                <ChevronRight />
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <Button variant="ghost" onClick={() => step(-1)} disabled={!hasPrev}>
              <ChevronLeft />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground tabular" aria-live="polite">
              {openIndex != null && `${openIndex + 1} of ${pages.length}`} · use ← → to move
            </span>
            <Button variant="ghost" onClick={() => step(1)} disabled={!hasNext}>
              Next
              <ChevronRight />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ThemePanel({ report }: { report: AnnualReport }) {
  const setTheme = useAnnual((s) => s.setTheme)
  const t = report.theme
  const locked = isLocked(report)
  const colourId = React.useId()
  const apply = (patch: Partial<Theme>) => setTheme(report.id, patch)

  return (
    <aside aria-label="Theme" className="flex min-h-0 w-[320px] shrink-0 flex-col border-r bg-card">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-6 py-5">
          <div className="space-y-1">
            <h2 className="font-sans text-lg font-medium tracking-normal">Look and feel</h2>
            <p className="text-sm text-muted-foreground">Every page picks up these colours, so the report stays consistent.</p>
          </div>
          {locked && <LockedBanner report={report} compact />}
          <fieldset disabled={locked} className="flex min-w-0 flex-col gap-6 disabled:opacity-60">
            <Field label="Colour scheme">
              <div role="radiogroup" aria-label="Colour scheme" className="grid grid-cols-4 gap-2">
                {(Object.keys(THEMES) as ThemePreset[]).map((id) => {
                  const p = THEMES[id]
                  const active = t.preset === id && t.primary.toLowerCase() === p.primary.toLowerCase()
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => apply({ ...p })}
                      className={cn("flex flex-col items-center gap-1.5 rounded-lg border p-2 text-[11px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50", active ? "border-foreground" : "hover:border-foreground/30")}
                    >
                      <span className="relative flex h-8 w-full overflow-hidden rounded-md">
                        <span className="flex-[2]" style={{ background: p.primary }} />
                        <span className="flex-1" style={{ background: p.ink }} />
                        <span className="flex-1" style={{ background: p.tint }} />
                        {active && (
                          <Check className="absolute top-1/2 left-1/3 size-3.5 -translate-x-1/2 -translate-y-1/2" style={{ color: p.onPrimary }} />
                        )}
                      </span>
                      {PRESET_NAMES[id]}
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label="Your own colour" htmlFor={colourId} hint="Your brand colour for headings, highlights and big numbers. Check it reads well as a background behind white text.">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Pick a colour"
                  value={/^#[0-9a-f]{6}$/i.test(t.primary) ? t.primary : "#000000"}
                  onChange={(e) => apply({ primary: e.target.value })}
                  className="size-9 shrink-0 cursor-pointer rounded-lg border bg-transparent p-1"
                />
                <Input
                  id={colourId}
                  value={t.primary}
                  onChange={(e) => {
                    const v = e.target.value.trim()
                    if (/^#[0-9a-f]{0,6}$/i.test(v)) apply({ primary: v })
                  }}
                  className="w-32 font-mono uppercase"
                  maxLength={7}
                />
              </div>
            </Field>

            <Field label="Pattern" hint="Used on the cover and the part openers.">
              <div role="radiogroup" aria-label="Pattern" className="grid grid-cols-3 gap-2">
                {PATTERNS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={t.pattern === p.id}
                    onClick={() => apply({ pattern: p.id })}
                    className={cn("flex flex-col items-center gap-1.5 rounded-lg border p-2 text-[11px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50", t.pattern === p.id ? "border-foreground" : "hover:border-foreground/30")}
                  >
                    <span className="block h-12 w-full overflow-hidden rounded-md" style={themeStyle(t)}>
                      <ThemePattern pattern={p.id} className="size-full" />
                    </span>
                    {p.name}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Cover photo" hint="A wide, high-resolution photo of your people, premises or products. Without one, the cover uses the pattern.">
              <div className="flex flex-col gap-2">
                <div className="flex aspect-[794/1123] w-28 items-center justify-center overflow-hidden rounded-md border bg-muted">
                  {t.coverPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.coverPhoto} alt="" className="size-full object-cover" />
                  ) : (
                    <ImagePlus className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => pickFile("image/*", (_, url) => apply({ coverPhoto: url }))}>
                    <Upload />
                    {t.coverPhoto ? "Replace" : "Upload"}
                  </Button>
                  {t.coverPhoto && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => apply({ coverPhoto: undefined })}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </Field>
          </fieldset>
        </div>
      </div>
      <p className="shrink-0 border-t px-6 py-3 text-xs text-muted-foreground">
        A4 portrait, 210 × 297 mm
      </p>
    </aside>
  )
}
