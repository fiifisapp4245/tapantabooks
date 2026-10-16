"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import type { AnnualReport } from "@/lib/annual/types"
import type { AnnualFigures } from "@/lib/annual/figures"
import type { Company } from "@/lib/types"
import { PrintableReport, useReportPages } from "@/components/annual/report-pages"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ContentStage } from "./content-stage"
import { ReviewStage } from "./review-stage"
import { DesignStage } from "./design-stage"
import { PublishStage } from "./publish-stage"
import { fmtStamp, ReportStatusBadge, useStudioReport } from "./shared"
import "./annual-print.css"

/*
 * The annual report studio.
 *   /reports/annual-report/studio?id=ar-…&stage=content&section=chairman
 * The stage and section live in the URL, so a link lands in the same place.
 * The store is in memory, so an unknown id (say, after a reload) goes back to the landing page.
 */

const STAGES = [
  { id: "content", label: "Content" },
  { id: "review", label: "Review" },
  { id: "design", label: "Design" },
  { id: "publish", label: "Publish" },
] as const
type Stage = (typeof STAGES)[number]["id"]

export function AnnualStudio() {
  return (
    <React.Suspense>
      <Loader />
    </React.Suspense>
  )
}

function Loader() {
  const params = useSearchParams()
  const router = useRouter()
  const { report, figures, company } = useStudioReport(params.get("id"))
  React.useEffect(() => {
    if (!report) router.replace("/reports/annual-report")
  }, [report, router])
  if (!report) return null
  return <Studio report={report} figures={figures} company={company} />
}

function Studio({ report, figures, company }: { report: AnnualReport; figures: AnnualFigures; company: Company }) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const stageParam = params.get("stage")
  const stage: Stage = STAGES.some((s) => s.id === stageParam) ? (stageParam as Stage) : "content"
  const sectionParam = params.get("section")
  const sectionId = report.sections.some((s) => s.id === sectionParam) ? sectionParam! : (report.sections.find((s) => s.enabled) ?? report.sections[0]).id
  const { pages } = useReportPages(report, figures, company)

  const go = React.useCallback(
    (patch: { stage?: Stage; section?: string }) => {
      const next = new URLSearchParams(params.toString())
      if (patch.stage) next.set("stage", patch.stage)
      if (patch.section) next.set("section", patch.section)
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [params, pathname, router]
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6">
        <Button variant="ghost" asChild className="-ml-2 px-2 text-muted-foreground">
          <Link href="/reports/annual-report">
            <ArrowLeft />
            Annual report
          </Link>
        </Button>
        <span className="text-muted-foreground/50">/</span>
        <h1 className="truncate font-sans text-base font-medium tracking-normal">Annual report {report.year}</h1>
        <ReportStatusBadge status={report.status} />
        <span className="hidden truncate text-xs text-muted-foreground lg:inline">Saved {fmtStamp(report.updatedAt)}</span>
        <Tabs value={stage} onValueChange={(v) => go({ stage: v as Stage })} className="ml-auto">
          <TabsList className="h-9">
            {STAGES.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className="px-3 text-[13px] data-[state=active]:bg-card">
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {stage === "content" && <ContentStage report={report} figures={figures} company={company} pages={pages} sectionId={sectionId} onSelect={(id) => go({ section: id })} />}
      {stage === "review" && <ReviewStage report={report} figures={figures} onOpenSection={(id) => go({ stage: "content", section: id })} />}
      {stage === "design" && <DesignStage report={report} company={company} pages={pages} />}
      {stage === "publish" && <PublishStage report={report} figures={figures} pages={pages} onGoToReview={() => go({ stage: "review" })} />}

      {/* Hidden on screen; the only thing that prints (annual-print.css). */}
      <PrintableReport report={report} figures={figures} company={company} />
    </div>
  )
}
