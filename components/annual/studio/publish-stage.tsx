"use client"

import * as React from "react"
import { CircleCheck, Circle, Link2, Printer, Send } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { usePrefs } from "@/lib/store"
import { useAnnual } from "@/lib/annual/store"
import type { AnnualReport } from "@/lib/annual/types"
import type { AnnualFigures } from "@/lib/annual/figures"
import type { BuiltPage } from "@/components/annual/registry"
import { Button } from "@/components/ui/button"
import { Banner } from "@/components/patterns/banner"
import { SubmitReason } from "@/components/patterns/form-bits"
import { fmtStamp, SIGN_STEPS, userName } from "./shared"

export function PublishStage({ report, figures, pages, onGoToReview }: { report: AnnualReport; figures: AnnualFigures; pages: BuiltPage[]; onGoToReview: () => void }) {
  const publish = useAnnual((s) => s.publish)
  const reopen = useAnnual((s) => s.reopen)
  const userId = usePrefs((s) => s.userId)
  const published = report.status === "published"
  const ready = report.status === "approved"
  const shareUrl = `https://books.tapanta.com/r/kumasi-traders/annual-report-${report.year}`

  // What still stands between the report and publishing, in order.
  const missing: { label: string; done: boolean }[] = [
    { label: "Submitted for review", done: report.status !== "draft" },
    { label: `Every check passes (${figures.checks.filter((c) => c.ok).length} of ${figures.checks.length})`, done: figures.checks.every((c) => c.ok) },
    ...SIGN_STEPS.map((s) => {
      const so = report.signoffs.find((x) => x.role === s.role)
      return { label: so?.userId ? `${s.label}: signed by ${userName(so.userId)}` : `${s.label} signs`, done: !!so?.userId }
    }),
  ]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // Clipboard can be blocked; the toast still shows the link.
    }
    toast.success("Share link copied", { description: shareUrl })
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 py-8">
        {published ? (
          <Banner
            tone="info"
            title={`Published ${fmtStamp(report.publishedAt)}`}
            action={
              userId === "ama" ? (
                <Button size="sm" variant="outline" onClick={() => reopen(report.id)}>
                  Reopen
                </Button>
              ) : undefined
            }
          >
            Shareholders with the link see this version. Reopening takes the report back to draft and clears every sign-off.
            {userId !== "ama" && " Only the Owner can reopen it."}
          </Banner>
        ) : !ready ? (
          <Banner tone="warning" title="Not approved yet" action={<Button size="sm" variant="outline" onClick={onGoToReview}>Go to review</Button>}>
            A report can be published once the director has signed it off.
          </Banner>
        ) : null}

        <section className="rounded-xl border bg-card">
          <header className="border-b px-5 py-4">
            <h2 className="font-sans text-base font-medium tracking-normal">Approval</h2>
            <p className="text-sm text-muted-foreground">Publishing needs every step below.</p>
          </header>
          <ul className="divide-y">
            {missing.map((m) => (
              <li key={m.label} className="flex items-center gap-3 px-5 py-3 text-sm">
                {m.done ? <CircleCheck className="size-4 shrink-0 text-success" aria-label="Done" /> : <Circle className="size-4 shrink-0 text-muted-foreground" aria-label="To do" />}
                <span className={cn(!m.done && "text-muted-foreground")}>{m.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-card">
          <header className="border-b px-5 py-4">
            <h2 className="font-sans text-base font-medium tracking-normal">Print and share</h2>
            <p className="text-sm text-muted-foreground">
              {pages.length} pages, A4 portrait (210 × 297 mm), printed edge to edge. Choose &ldquo;Save as PDF&rdquo; in the print window for a file to email or file.
            </p>
          </header>
          <div className="flex flex-col divide-y">
            <Row title="Print or save as PDF" text="Only the report pages print, one per sheet, with your colours.">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer />
                Print / save as PDF
              </Button>
            </Row>
            <Row title="Share link" text={shareUrl}>
              <Button variant="outline" onClick={copy}>
                <Link2 />
                Copy share link
              </Button>
            </Row>
            <Row title="Publish" text={published ? "This report is published." : "Mark this version as final and make the share link live."}>
              <div className="flex flex-col items-end gap-1">
                <Button disabled={!ready} onClick={() => { publish(report.id); toast.success("Annual report published") }}>
                  <Send />
                  Publish
                </Button>
                {!published && <SubmitReason reason={ready ? null : "Needs the director's sign-off"} />}
              </div>
            </Row>
          </div>
        </section>
      </div>
    </div>
  )
}

function Row({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{text}</p>
      </div>
      {children}
    </div>
  )
}
