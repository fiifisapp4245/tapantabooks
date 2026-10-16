"use client"

import * as React from "react"
import Link from "next/link"
import { BookMarked, Plus } from "lucide-react"
import { useAnnual } from "@/lib/annual/store"
import { templateById } from "@/lib/annual/templates"
import type { AnnualReport } from "@/lib/annual/types"
import { FY2025_FIGURES } from "@/lib/annual/store"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PageHeader } from "@/components/patterns/page-header"
import { EmptyState } from "@/components/patterns/empty-state"
import { SubmitReason } from "@/components/patterns/form-bits"
import { ScaledPage, useReportPages } from "@/components/annual/report-pages"
import { fmtStamp, ReportStatusBadge, useCompany } from "./shared"

export const NEW_REPORT_HREF = "/reports/annual-report/new?step=template"
export const studioHref = (id: string, stage = "content") => `/reports/annual-report/studio?id=${id}&stage=${stage}`

const STAGES = [
  { name: "Prepare", text: "Pick a template and the contents. The figures come straight from your closed books." },
  { name: "Write", text: "Add the story: statements, the board, governance. CFO and directors' text is drafted from the numbers." },
  { name: "Review", text: "Six cross-checks run on the figures. The preparer, a reviewer and a director sign off." },
  { name: "Design", text: "Choose your colours, a pattern and a cover photo. Every page follows." },
  { name: "Publish", text: "Print or save an A4 PDF, and share a link with shareholders." },
]

export function AnnualLanding({ title, description }: { title: string; description?: string }) {
  const reports = useAnnual((s) => s.reports)

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        exportable={false}
        primary={
          reports.length > 0 ? (
            <Button asChild>
              <Link href={NEW_REPORT_HREF}>
                <Plus />
                New report
              </Link>
            </Button>
          ) : undefined
        }
      />

      {reports.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={BookMarked}
            title="Create your FY2025 annual report"
            description="2025 is closed, so its figures are final. Choose a template, set the contents, and we'll build the pages from your books."
            action={
              <Button asChild>
                <Link href={NEW_REPORT_HREF}>Create your FY2025 annual report</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}

      <section className="rounded-xl border bg-card" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="border-b px-5 py-3 font-sans text-sm font-medium tracking-normal">
          How it works
        </h2>
        <ol className="grid divide-y sm:grid-cols-5 sm:divide-x sm:divide-y-0">
          {STAGES.map((s, i) => (
            <li key={s.name} className="flex flex-col gap-1 px-5 py-4">
              <span className="text-xs text-muted-foreground tabular">{i + 1}</span>
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" disabled>
          Start FY2026 report
        </Button>
        <SubmitReason reason="The 2026 financial year isn't closed yet" />
      </div>
    </>
  )
}

function ReportCard({ report }: { report: AnnualReport }) {
  const company = useCompany(report.companyId)
  const { pages } = useReportPages(report, FY2025_FIGURES, company)
  const signed = report.signoffs.filter((s) => s.userId).length
  const template = report.templateId ? templateById(report.templateId) : undefined
  const cover = pages[0]

  return (
    <article className="flex flex-col gap-5 rounded-xl border bg-card p-5 sm:flex-row">
      {cover && (
        <Link href={studioHref(report.id)} aria-label={`Open ${report.year} report`} className="self-start">
          <ScaledPage page={cover} scale={0.22} report={report} company={company} />
        </Link>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="font-sans text-lg font-medium tracking-normal">Annual report {report.year}</h2>
              <ReportStatusBadge status={report.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {template ? `${template.name} template` : "Custom"} · {company.name}
            </p>
          </div>
          <Button asChild>
            <Link href={studioHref(report.id)}>Open studio</Link>
          </Button>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Financial year</dt>
            <dd>1 Jan – 31 Dec {report.year}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Pages</dt>
            <dd className="tabular">{pages.length} A4 pages</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last updated</dt>
            <dd>{fmtStamp(report.updatedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{report.publishedAt ? "Published" : "Sign-off"}</dt>
            <dd>{report.publishedAt ? fmtStamp(report.publishedAt) : `${signed} of ${report.signoffs.length} signed`}</dd>
          </div>
        </dl>

        <div className="mt-auto space-y-1.5">
          <Progress value={(signed / report.signoffs.length) * 100} className="h-1.5 [&>[data-slot=progress-indicator]]:bg-success" aria-label="Sign-off progress" />
          <p className="text-xs text-muted-foreground">Preparer → Reviewer → Director</p>
        </div>
      </div>
    </article>
  )
}
