"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { isLocked, useAnnual, type TocChoice } from "@/lib/annual/store"
import type { AnnualReport } from "@/lib/annual/types"
import type { Company } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Banner } from "@/components/patterns/banner"
import { SubmitReason } from "@/components/patterns/form-bits"
import { ContentsPreview, TocEditor, tocFromReport } from "./toc-editor"
import { FlowHeader } from "./new-report"
import { studioHref } from "./landing"
import { useStudioReport } from "./shared"

/** /reports/annual-report/contents?id=… — change an existing report's table of contents. */
export function ContentsEditPage() {
  return (
    <React.Suspense>
      <Loader />
    </React.Suspense>
  )
}

function Loader() {
  const params = useSearchParams()
  const router = useRouter()
  const { report, company } = useStudioReport(params.get("id"))
  React.useEffect(() => {
    if (!report) router.replace("/reports/annual-report")
  }, [report, router])
  if (!report) return null
  return <Editor key={report.id} report={report} company={company} />
}

function Editor({ report, company }: { report: AnnualReport; company: Company }) {
  const router = useRouter()
  const setToc = useAnnual((s) => s.setToc)
  const [toc, setLocal] = React.useState<TocChoice[]>(() => tocFromReport(report))
  const back = studioHref(report.id)
  const locked = isLocked(report)
  const none = !toc.some((c) => c.enabled)
  const reason = locked ? "Reopen the report to change its contents" : none ? "Include at least one section" : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FlowHeader title={`Contents · Annual report ${report.year}`} back={back} backLabel="Studio" />
      <div className="flex min-h-0 flex-1">
        <section aria-label="Table of contents" className="flex min-h-0 w-full shrink-0 flex-col border-r bg-card md:w-[520px]">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-5 px-6 py-6">
              <div className="space-y-1">
                <h2 className="font-sans text-xl font-medium tracking-normal">Edit the table of contents</h2>
                <p className="text-sm text-muted-foreground">Sections you switch off keep their text, so you can bring them back later.</p>
              </div>
              {locked && <Banner tone="locked" title="Signed off, so the contents are locked" />}
              <fieldset disabled={locked} className="min-w-0">
                <TocEditor toc={toc} onChange={setLocal} sections={report.sections} />
              </fieldset>
            </div>
          </div>
          <footer className="flex shrink-0 items-center justify-between gap-2 border-t px-6 py-4">
            <Button variant="outline" onClick={() => router.push(back)}>
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              <SubmitReason reason={reason} />
              <Button
                disabled={!!reason}
                onClick={() => {
                  setToc(report.id, toc)
                  toast.success("Contents updated")
                  router.push(back)
                }}
              >
                Save contents
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
