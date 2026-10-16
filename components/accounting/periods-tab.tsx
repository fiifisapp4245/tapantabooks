"use client"

import * as React from "react"
import Link from "next/link"
import { Circle, CircleCheck, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { endOfMonth, fmtDate, monthKey, TODAY } from "@/lib/dates"
import { attention } from "@/lib/selectors"
import type { Period } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Banner } from "@/components/patterns/banner"
import { StatusBadge } from "@/components/patterns/status-badge"
import { SubmitReason } from "@/components/patterns/form-bits"

const LEGEND: { status: Period["status"]; text: string }[] = [
  { status: "open", text: "Anyone with access can post into the month." },
  { status: "locked", text: "Behind the period lock. Nobody can post while it's reviewed." },
  { status: "closed", text: "Checked and signed off. Reopen only to correct a mistake." },
]

const NOTES: Record<Period["status"], string> = {
  open: "Posting allowed",
  locked: "Posting blocked by the period lock",
  closed: "Closed and signed off",
}

export function PeriodsTab({ onGoToRevaluation }: { onGoToRevaluation: () => void }) {
  const s = useLedger()
  const userId = usePrefs((p) => p.userId)
  const [reopening, setReopening] = React.useState<Period | null>(null)
  const lockDate = s.settings.periodLockDate
  const months = [...s.periods].sort((a, b) => b.month.localeCompare(a.month))
  const current = s.periods.find((p) => p.month === monthKey(TODAY))

  const a = React.useMemo(() => attention(s), [s])
  const revalued = s.journals.some((j) => j.source === "revaluation" && j.status === "posted" && monthKey(j.date) === monthKey(TODAY))
  const checks = [
    {
      id: "bank",
      label: "Bank reconciled",
      done: a.reconcileOpen === 0,
      detail: a.reconcileOpen === 0 ? "Every statement line is matched." : `${a.reconcileOpen} bank ${a.reconcileOpen === 1 ? "line" : "lines"} to match`,
      action: <Button variant="outline" asChild><Link href="/reconcile">Reconcile</Link></Button>,
    },
    {
      id: "approvals",
      label: "Approvals cleared",
      done: a.journalsAwaitingApproval === 0,
      detail: a.journalsAwaitingApproval === 0 ? "No journals waiting." : `${a.journalsAwaitingApproval} ${a.journalsAwaitingApproval === 1 ? "journal" : "journals"} awaiting approval`,
      action: <Button variant="outline" asChild><Link href="/journals">Review</Link></Button>,
    },
    {
      id: "reval",
      label: "Revaluation posted",
      done: revalued,
      detail: revalued ? "Foreign currency balances are at today's rates." : "Foreign currency balances not yet revalued",
      action: <Button variant="outline" onClick={onGoToRevaluation}>Revalue</Button>,
    },
    {
      id: "imports",
      label: "Imports clear",
      done: a.importsNeedAttention === 0,
      detail: a.importsNeedAttention === 0 ? "Nothing held or failed." : `${a.importsNeedAttention} ${a.importsNeedAttention === 1 ? "import needs" : "imports need"} attention`,
      action: <Button variant="outline" asChild><Link href="/settings/imports">Fix</Link></Button>,
    },
  ]
  const left = checks.filter((c) => !c.done).length
  const closeReason = current?.status !== "open" ? `${current?.label ?? "This month"} isn't open` : left ? `${left} ${left === 1 ? "check" : "checks"} left` : null

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Banner
        tone="locked"
        title={`Locked up to ${fmtDate(lockDate)}`}
        action={
          <Button variant="outline" className="bg-card" asChild>
            <Link href="/settings">Change in Settings</Link>
          </Button>
        }
      >
        <span className="font-medium text-foreground/90">Period locks</span> stop anyone posting on or before this date. It&apos;s one setting, edited in Settings.
      </Banner>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        {/* Month list */}
        <section className="min-w-0 rounded-xl border bg-card">
          <header className="border-b px-4 py-3">
            <h2 className="text-[15px] font-medium">Months in 2026</h2>
          </header>
          <ul className="divide-y">
            {months.map((p) => (
              <li key={p.month} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {p.label}
                    {p.month === current?.month && <span className="ml-2 text-xs font-normal text-muted-foreground">Current month</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{NOTES[p.status]}</p>
                </div>
                <StatusBadge status={p.status} />
                <div className="w-full sm:w-28 sm:text-right">
                  {p.status !== "open" && (
                    <Button variant="ghost" onClick={() => setReopening(p)}>
                      <RotateCcw />
                      Reopen
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <footer className="grid gap-2 border-t px-4 py-3 sm:grid-cols-3">
            {LEGEND.map((l) => (
              <div key={l.status} className="flex flex-col items-start gap-1">
                <StatusBadge status={l.status} />
                <p className="text-xs text-muted-foreground">{l.text}</p>
              </div>
            ))}
          </footer>
        </section>

        {/* Close checklist */}
        <section className="min-w-0 rounded-xl border bg-card">
          <header className="border-b px-4 py-3">
            <h2 className="text-[15px] font-medium">Close {current?.label ?? "this month"}</h2>
            <p className="text-xs text-muted-foreground">
              {4 - left} of 4 done · as at {fmtDate(TODAY)}
            </p>
          </header>
          <ul className="divide-y">
            {checks.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                {c.done ? <CircleCheck className="size-5 shrink-0 text-success" aria-label="Done" /> : <Circle className="size-5 shrink-0 text-muted-foreground/60" aria-label="Not done" />}
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", c.done && "text-muted-foreground")}>{c.label}</p>
                  <p className={cn("text-xs", c.done ? "text-muted-foreground" : "text-warning")}>{c.detail}</p>
                </div>
                {!c.done && c.action}
              </li>
            ))}
          </ul>
          <footer className="flex flex-wrap items-center justify-end gap-3 border-t px-4 py-3">
            <SubmitReason reason={closeReason} />
            <Button
              disabled={!!closeReason}
              onClick={() => {
                if (!current) return
                s.setPeriodStatus(current.month, "closed", userId, "Month-end checklist complete")
                toast.success(`${current.label} closed`)
              }}
            >
              Close month
            </Button>
          </footer>
        </section>
      </div>

      {reopening && <ReopenDialog key={reopening.month} period={reopening} lockDate={lockDate} onClose={() => setReopening(null)} />}
    </div>
  )
}

function ReopenDialog({ period, lockDate, onClose }: { period: Period; lockDate: string; onClose: () => void }) {
  const setPeriodStatus = useLedger((s) => s.setPeriodStatus)
  const userId = usePrefs((p) => p.userId)
  const [reason, setReason] = React.useState("")
  const stillLocked = endOfMonth(period.month) <= lockDate
  const why = reason.trim().length < 5 ? "Say why it needs reopening" : null
  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reopen {period.label}?</AlertDialogTitle>
          <AlertDialogDescription>
            Reopening lets people post into a month that was {period.status}. The reason goes in the audit trail.
            {stillLocked && ` Posting stays blocked until the period lock (${fmtDate(lockDate)}) is moved in Settings.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reopen-reason" className="text-[13px] font-medium">Reason</Label>
          <Textarea id="reopen-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Supplier bill for September arrived late" className="min-h-20 bg-card" autoFocus />
        </div>
        <AlertDialogFooter className="items-center gap-3 sm:justify-between">
          <SubmitReason reason={why} />
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              disabled={!!why}
              onClick={() => {
                setPeriodStatus(period.month, "open", userId, reason.trim())
                toast.success(`${period.label} reopened`, { description: "Logged in the audit trail with your reason." })
                onClose()
              }}
            >
              Reopen month
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
