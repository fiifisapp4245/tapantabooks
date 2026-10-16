"use client"

import * as React from "react"
import { CircleCheck, CircleX, PenLine, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePrefs } from "@/lib/store"
import { useAnnual } from "@/lib/annual/store"
import { FROM_THE_BOOKS, type AnnualReport } from "@/lib/annual/types"
import type { AnnualFigures } from "@/lib/annual/figures"
import { Button } from "@/components/ui/button"
import { Banner } from "@/components/patterns/banner"
import { Money } from "@/components/patterns/money"
import { SubmitReason } from "@/components/patterns/form-bits"
import { emptyFields, fmtStamp, SIGN_STEPS, userName } from "./shared"

export function ReviewStage({ report, figures, onOpenSection }: { report: AnnualReport; figures: AnnualFigures; onOpenSection: (id: string) => void }) {
  const userId = usePrefs((s) => s.userId)
  const sign = useAnnual((s) => s.sign)
  const submit = useAnnual((s) => s.submitForReview)
  const allPass = figures.checks.every((c) => c.ok)
  const passed = figures.checks.filter((c) => c.ok).length

  const incomplete = report.sections
    .filter((s) => s.enabled && !FROM_THE_BOOKS.includes(s.type))
    .map((s) => ({ section: s, missing: emptyFields(s.type, s.data as Record<string, unknown>) }))
    .filter((x) => x.missing.length > 0)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex max-w-[960px] flex-col gap-6 px-6 py-8">
        {report.status === "draft" && (
          <Banner
            tone="info"
            title="This report is still a draft"
            action={
              <Button size="sm" onClick={() => submit(report.id)}>
                Submit for review
              </Button>
            }
          >
            Submit it when the writing is done. The preparer, a reviewer and a director then sign it off in turn.
          </Banner>
        )}

        {/* ---- the figures ---- */}
        <section className="rounded-xl border bg-card">
          <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 className="font-sans text-base font-medium tracking-normal">Do the numbers agree?</h2>
              <p className="text-sm text-muted-foreground">The cross-checks an auditor would do by hand, run on the books.</p>
            </div>
            <span className={cn("text-sm font-medium whitespace-nowrap", allPass ? "text-success" : "text-destructive")}>
              {passed} of {figures.checks.length} passed
            </span>
          </header>
          <ul className="divide-y">
            {figures.checks.map((c) => (
              <li key={c.id} className="flex gap-3 px-5 py-4">
                {c.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-label="Passed" /> : <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Failed" />}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-sm text-muted-foreground">{c.detail}</p>
                </div>
                <div className="flex shrink-0 items-start gap-2 text-sm">
                  <Money amount={c.values[0]} />
                  <span className="text-muted-foreground">{c.ok ? "=" : "≠"}</span>
                  <Money amount={c.values[1]} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- the writing ---- */}
        <section className="rounded-xl border bg-card">
          <header className="border-b px-5 py-4">
            <h2 className="font-sans text-base font-medium tracking-normal">Is everything written?</h2>
            <p className="text-sm text-muted-foreground">Sections you&apos;ve included that still have empty text or lists.</p>
          </header>
          {incomplete.length === 0 ? (
            <p className="flex items-center gap-2 px-5 py-4 text-sm">
              <CircleCheck className="size-4 text-success" />
              Every included section has its text.
            </p>
          ) : (
            <ul className="divide-y">
              {incomplete.map(({ section, missing }) => (
                <li key={section.id} className="flex items-center gap-3 px-5 py-3">
                  <TriangleAlert className="size-4 shrink-0 text-warning" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{section.title}</p>
                    <p className="text-xs text-muted-foreground">Empty: {missing.join(", ")}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onOpenSection(section.id)}>
                    Open
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- sign-off ---- */}
        <section className="rounded-xl border bg-card">
          <header className="border-b px-5 py-4">
            <h2 className="font-sans text-base font-medium tracking-normal">Sign-off</h2>
            <p className="text-sm text-muted-foreground">Three people sign in order. The director&apos;s signature approves the report and locks it for printing.</p>
          </header>
          <ol className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
            {SIGN_STEPS.map((step, i) => {
              const so = report.signoffs.find((s) => s.role === step.role)
              const prev = i === 0 ? undefined : report.signoffs.find((s) => s.role === SIGN_STEPS[i - 1].role)
              const prevSigned = i === 0 || !!prev?.userId
              const canUser = step.can.includes(userId)
              const reason = so?.userId
                ? null
                : report.status === "draft"
                  ? "Submit the report for review first"
                  : !allPass
                    ? "Every check has to pass first"
                    : !prevSigned
                      ? `Waiting for the ${SIGN_STEPS[i - 1].label.toLowerCase()}`
                      : !canUser
                        ? `${userName(userId)} can't sign as ${step.label.toLowerCase()}`
                        : null
              return (
                <li key={step.role} className="flex flex-col gap-3 p-5">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-medium", so?.userId ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
                      {so?.userId ? <CircleCheck className="size-3.5" /> : i + 1}
                    </span>
                    <h3 className="font-sans text-sm font-medium tracking-normal">{step.label}</h3>
                  </div>
                  {so?.userId ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{userName(so.userId)}</p>
                      <p className="text-xs text-muted-foreground">Signed {fmtStamp(so.at)}</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">Who can sign: {step.who}</p>
                      <div className="mt-auto flex flex-col items-start gap-1.5">
                        <Button size="sm" variant={reason ? "outline" : "default"} disabled={!!reason} onClick={() => sign(report.id, step.role, userId)}>
                          <PenLine />
                          Sign as {userName(userId).split(" ")[0]}
                        </Button>
                        <SubmitReason reason={reason} />
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      </div>
    </div>
  )
}
