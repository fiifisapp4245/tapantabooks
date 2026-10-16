"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { FY2025_FIGURES, templateToc, useAnnual, type TocChoice } from "@/lib/annual/store"
import { defaultReport } from "@/lib/annual/defaults"
import { TEMPLATES, templateById, type AnnualTemplate } from "@/lib/annual/templates"
import { THEMES, type AnnualReport } from "@/lib/annual/types"
import type { Company } from "@/lib/types"
import { buildPages } from "@/components/annual/registry"
import { ScaledPage } from "@/components/annual/report-pages"
import { Button } from "@/components/ui/button"
import { SubmitReason } from "@/components/patterns/form-bits"
import { ContentsPreview, TocEditor } from "./toc-editor"
import { studioHref } from "./landing"
import { useCompany } from "./shared"

const LANDING = "/reports/annual-report"
const STEPS = ["Template", "Contents", "Build"] as const

/** A throwaway FY2025 report in a template's look, for previews. */
function templateReport(t: AnnualTemplate): AnnualReport {
  return { ...defaultReport(FY2025_FIGURES), templateId: t.id, theme: { ...THEMES[t.preset], pattern: t.pattern } }
}

/** The header bar shared by the creation steps and the contents editor. */
export function FlowHeader({ title, step, back = LANDING, backLabel = "Annual report" }: { title: string; step?: 0 | 1 | 2; back?: string; backLabel?: string }) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6">
      <Button variant="ghost" asChild className="-ml-2 px-2 text-muted-foreground">
        <Link href={back}>
          <ArrowLeft />
          {backLabel}
        </Link>
      </Button>
      <span className="text-muted-foreground/50">/</span>
      <h1 className="truncate font-sans text-base font-medium tracking-normal">{title}</h1>
      {step != null && (
        <ol className="ml-auto hidden items-center gap-2 text-[13px] sm:flex" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2" aria-current={i === step ? "step" : undefined}>
              {i > 0 && <span className="h-px w-6 bg-border" aria-hidden />}
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px] font-medium",
                  i < step ? "bg-foreground text-background" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              <span className={i === step ? "font-medium" : "text-muted-foreground"}>{s}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function NewReportFlow() {
  return (
    <React.Suspense>
      <Flow />
    </React.Suspense>
  )
}

function Flow() {
  const params = useSearchParams()
  const router = useRouter()
  const company = useCompany()
  const step = params.get("step") === "contents" ? "contents" : "template"
  const templateId = params.get("template") ?? undefined
  const template = templateId ? templateById(templateId) : undefined

  // The contents step needs a template; without one, start again.
  React.useEffect(() => {
    if (step === "contents" && !template) router.replace(`${LANDING}/new?step=template`)
  }, [step, template, router])

  if (step === "contents" && template) return <ContentsStep key={template.id} template={template} company={company} />
  return <TemplateStep initial={templateId} company={company} />
}

/* ---------------- step 1: template ---------------- */

function TemplateStep({ initial, company }: { initial?: string; company: Company }) {
  const router = useRouter()
  const [chosen, setChosen] = React.useState<string | undefined>(initial)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FlowHeader title="New annual report" step={0} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-6 py-8">
          <div className="space-y-1">
            <h2 className="font-sans text-xl font-medium tracking-normal">Choose a template</h2>
            <p className="text-sm text-muted-foreground">A template sets which sections you start with and the look. You can change both later.</p>
          </div>
          <div role="radiogroup" aria-label="Templates" className="grid gap-5 md:grid-cols-3">
            {TEMPLATES.map((t) => (
              <TemplateCard key={t.id} template={t} company={company} selected={chosen === t.id} onSelect={() => setChosen(t.id)} />
            ))}
          </div>
        </div>
      </div>
      <footer className="flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4">
        <SubmitReason reason={chosen ? null : "Choose a template to continue"} />
        <Button disabled={!chosen} onClick={() => router.push(`${LANDING}/new?step=contents&template=${chosen}`)}>
          Continue
        </Button>
      </footer>
    </div>
  )
}

function TemplateCard({ template, company, selected, onSelect }: { template: AnnualTemplate; company: Company; selected: boolean; onSelect: () => void }) {
  // Only the cover is drawn, so the preview stays cheap.
  const { report, cover } = React.useMemo(() => {
    const base = templateReport(template)
    const r = { ...base, sections: base.sections.map((s) => ({ ...s, enabled: s.type === "cover" })) }
    return { report: r, cover: buildPages(r, FY2025_FIGURES, company).pages[0] }
  }, [template, company])

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card text-left transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        selected ? "border-primary ring-2 ring-primary" : "hover:border-foreground/25"
      )}
    >
      <div className="flex justify-center border-b bg-muted/40 py-6">{cover && <ScaledPage page={cover} scale={0.3} report={report} company={company} />}</div>
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-medium">{template.name}</p>
          {selected && <Check className="size-4 text-primary" aria-hidden />}
        </div>
        <p className="text-[13px] font-medium text-muted-foreground">{template.audience}</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{template.description}</p>
        <p className="mt-auto pt-2 text-xs text-muted-foreground tabular">{template.sections.length} sections</p>
      </div>
    </button>
  )
}

/* ---------------- step 2: contents ---------------- */

function ContentsStep({ template, company }: { template: AnnualTemplate; company: Company }) {
  const router = useRouter()
  const createReport = useAnnual((s) => s.createReport)
  const [toc, setToc] = React.useState<TocChoice[]>(() => templateToc(template.id))
  const report = React.useMemo(() => templateReport(template), [template])
  const none = !toc.some((c) => c.enabled)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FlowHeader title="New annual report" step={1} />
      <div className="flex min-h-0 flex-1">
        <section aria-label="Table of contents" className="flex min-h-0 w-full shrink-0 flex-col border-r bg-card md:w-[520px]">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-5 px-6 py-6">
              <div className="space-y-1">
                <h2 className="font-sans text-xl font-medium tracking-normal">Set the table of contents</h2>
                <p className="text-sm text-muted-foreground">
                  Starting from the {template.name} template. Switch sections on or off, rename them, and change their order within each part.
                </p>
              </div>
              <TocEditor toc={toc} onChange={setToc} sections={report.sections} />
            </div>
          </div>
          <footer className="flex shrink-0 items-center justify-between gap-2 border-t px-6 py-4">
            <Button variant="outline" onClick={() => router.push(`${LANDING}/new?step=template&template=${template.id}`)}>
              Back
            </Button>
            <div className="flex items-center gap-3">
              <SubmitReason reason={none ? "Include at least one section" : null} />
              <Button
                disabled={none}
                onClick={() => {
                  const id = createReport(template.id, toc)
                  router.push(studioHref(id))
                }}
              >
                Create report
              </Button>
            </div>
          </footer>
        </section>
        <section aria-label="Contents preview" className="hidden min-w-0 flex-1 md:flex">
          <ContentsPreview report={report} toc={toc} company={company} />
        </section>
      </div>
    </div>
  )
}
