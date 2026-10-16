"use client"

import * as React from "react"
import Link from "next/link"
import { CheckCheck, CircleCheck, GitCompareArrows, Inbox } from "lucide-react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { fmtDate } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { RECONCILED } from "@/lib/mock/seed"
import { bankSummary } from "@/lib/selectors"
import type { BankLine } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PageBody } from "@/components/patterns/list-page"
import { PageHeader } from "@/components/patterns/page-header"
import { StatusTabs } from "@/components/patterns/status-tabs"
import { Money } from "@/components/patterns/money"
import { Term } from "@/components/patterns/text"
import { Banner } from "@/components/patterns/banner"
import { EmptyState } from "@/components/patterns/empty-state"
import { SubmitReason } from "@/components/patterns/form-bits"
import { JournalDrawer } from "@/components/drawers/journal-drawer"
import { ReconcileLine, hasUsableSuggestion, type Candidate } from "@/components/banking/reconcile-line"

const ACCOUNT = "1010"

type Tab = "all" | "open" | "matched" | "excluded"

export default function ReconcilePage() {
  const s = useLedger()
  const userId = usePrefs((p) => p.userId)
  const [tab, setTab] = React.useState<Tab>("all")
  const [journalId, setJournalId] = React.useState<string | null>(null)
  const [completed, setCompleted] = React.useState(false)

  const account = s.accounts.find((a) => a.code === ACCOUNT)!
  const statementDate = RECONCILED[ACCOUNT].statementDate
  const sum = React.useMemo(() => bankSummary(s, ACCOUNT), [s])
  const lines = React.useMemo(() => s.bankLines.filter((b) => b.accountCode === ACCOUNT), [s.bankLines])
  const matched = lines.filter((l) => l.status === "matched").length
  const excluded = lines.filter((l) => l.status === "excluded").length
  const open = lines.filter((l) => l.status === "open")
  const done = matched + excluded
  const suggestible = open.filter((l) => hasUsableSuggestion(l) && (l.suggestion!.confidence === "High" || l.suggestion!.confidence === "Medium"))

  // Recent posted entries on this account that no statement line has claimed yet (mocked "find match" source).
  const candidates = React.useMemo<Candidate[]>(() => {
    const claimed = new Set(s.bankLines.map((b) => b.matchedJournalId).filter(Boolean))
    return s.journals
      .filter((j) => j.status === "posted" && j.date > RECONCILED[ACCOUNT].lastReconciled && !claimed.has(j.id) && j.lines.some((l) => l.accountCode === ACCOUNT))
      .map((j) => ({ journal: j, amount: Math.round(j.lines.filter((l) => l.accountCode === ACCOUNT).reduce((t, l) => t + l.debit - l.credit, 0) * 100) / 100 }))
      .sort((a, b) => b.journal.date.localeCompare(a.journal.date) || b.journal.id.localeCompare(a.journal.id))
      .slice(0, 12)
  }, [s.bankLines, s.journals])

  const shown = tab === "all" ? lines : lines.filter((l) => l.status === tab)
  const tabs = [
    { id: "all", label: "All", count: lines.length },
    { id: "open", label: "To match", count: open.length },
    { id: "matched", label: "Matched", count: matched },
    { id: "excluded", label: "Excluded", count: excluded },
  ]

  const accept = (l: BankLine) => {
    s.acceptBankLine(l.id, userId)
    toast.success("Matched", { description: `${l.description} → ${l.suggestion?.label}` })
  }
  const acceptAll = () => {
    for (const l of suggestible) useLedger.getState().acceptBankLine(l.id, userId)
    toast.success(`${suggestible.length} suggestions accepted`, { description: "Each one posted its entry and is now matched." })
  }
  const pick = (l: BankLine, id: string) => {
    useLedger.setState((st) => ({ bankLines: st.bankLines.map((b) => (b.id === l.id ? { ...b, status: "matched" as const, matchedJournalId: id } : b)) }))
    toast.success("Matched", { description: `${l.description} → ${id}` })
  }
  const create = (l: BankLine) => {
    const byName = s.accounts.find((a) => !a.bank && a.name === l.suggestion?.label)?.code
    const categoryCode = /INTEREST/i.test(l.description) ? "4100" : byName
    usePrefs.getState().openForm(l.amount > 0 ? "money-in" : "money-out", {
      amount: Math.abs(l.amount),
      date: l.date,
      accountCode: ACCOUNT,
      memo: l.description,
      bankLineId: l.id,
      categoryCode,
    })
  }
  const exclude = (l: BankLine) => {
    s.excludeBankLine(l.id, userId)
    toast("Line excluded", { description: l.description })
  }
  const restore = (l: BankLine) => {
    useLedger.setState((st) => ({ bankLines: st.bankLines.map((b) => (b.id === l.id ? { ...b, status: "open" as const } : b)) }))
  }

  const zero = Math.abs(sum.difference) < 0.005
  const completeReason = open.length > 0 ? `Difference must be ${formatMoney(0)} — ${open.length} ${open.length === 1 ? "line" : "lines"} left` : !zero ? `Difference must be ${formatMoney(0)}` : null

  return (
    <PageBody>
      <PageHeader
        title="Reconcile"
        description="Match your bank statement to your books."
        term="Bank reconciliation"
        meta={
          <>
            {account.name} · <span className="font-mono">{account.bank?.masked}</span> · Last reconciled {fmtDate(RECONCILED[ACCOUNT].lastReconciled)}
          </>
        }
      />

      {completed && (
        <Banner tone="info" title={`Reconciled to ${fmtDate(statementDate)}`} action={<Button variant="outline" className="bg-card" asChild><Link href="/bank">Back to Bank & cash</Link></Button>}>
          Every line on the statement is matched or excluded, and the books agree with the bank.
        </Banner>
      )}

      {/* Summary: progress, both balances with their dates, the gap, and the two big actions. */}
      <section className="rounded-xl border bg-card">
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">
              {matched} of {lines.length} matched
              {excluded > 0 && <span className="font-normal text-muted-foreground"> · {excluded} excluded</span>}
            </p>
            <p className="text-xs text-muted-foreground">{open.length === 0 ? "Nothing left to match" : `${open.length} to match`}</p>
          </div>
          <Progress value={lines.length ? (done / lines.length) * 100 : 0} className="h-2 [&_[data-slot=progress-indicator]]:bg-success" aria-label={`${done} of ${lines.length} lines done`} />
        </div>
        <dl className="grid border-t sm:grid-cols-3 sm:divide-x">
          <div className="space-y-0.5 p-4">
            <dt className="text-[13px] text-muted-foreground">Bank says</dt>
            <dd><Money amount={sum.bankSays} size="lg" /></dd>
            <dd className="text-xs text-muted-foreground">on {fmtDate(statementDate)}</dd>
          </div>
          <div className="space-y-0.5 border-t p-4 sm:border-t-0">
            <dt className="text-[13px] text-muted-foreground">In Tapanta</dt>
            <dd><Money amount={sum.book} size="lg" /></dd>
            <dd className="text-xs text-muted-foreground">on {fmtDate(statementDate)}</dd>
          </div>
          <div className="space-y-0.5 border-t p-4 sm:border-t-0">
            <dt className="text-[13px] text-muted-foreground">
              <Term term="Out of agreement">Difference</Term>
            </dt>
            <dd><Money amount={sum.difference} size="lg" className={zero ? "text-success" : "text-warning"} /></dd>
            <dd className="text-xs text-muted-foreground">{zero ? "Bank and books agree" : `From ${open.length} unmatched ${open.length === 1 ? "line" : "lines"}`}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t px-4 py-3">
          <SubmitReason reason={completed ? null : completeReason} />
          <Button variant="outline" disabled={suggestible.length === 0} onClick={acceptAll}>
            <CheckCheck />
            Accept all suggestions{suggestible.length > 0 && ` (${suggestible.length})`}
          </Button>
          <Button
            disabled={!!completeReason || completed}
            onClick={() => {
              setCompleted(true)
              toast.success("Reconciliation complete", { description: `${account.name} agrees with the bank on ${fmtDate(statementDate)}.` })
            }}
          >
            <CircleCheck />
            Complete reconciliation
          </Button>
        </div>
      </section>

      <div className="flex flex-col gap-4">
        <StatusTabs tabs={tabs} value={tab} onValueChange={(v) => setTab(v as Tab)} />
        <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
          <div className="hidden border-b text-xs font-medium text-muted-foreground lg:grid lg:grid-cols-2 lg:divide-x">
            <p className="flex h-10 items-center justify-between px-4">
              <span>On the bank statement</span>
              <span>Amount</span>
            </p>
            <p className="flex h-10 items-center px-4">In Tapanta</p>
          </div>
          {shown.length === 0 ? (
            tab === "open" ? (
              <EmptyState icon={GitCompareArrows} title="Everything is matched" description="Complete the reconciliation to lock in this statement." action={<Button variant="outline" onClick={() => setTab("all")}>See all lines</Button>} />
            ) : (
              <EmptyState icon={Inbox} title={tab === "excluded" ? "Nothing excluded" : "No lines here yet"} description="Lines show up here as you work through the statement." action={<Button variant="outline" onClick={() => setTab("open")}>Go to lines to match</Button>} />
            )
          ) : (
            <ul className="divide-y">
              {shown.map((l) => (
                <ReconcileLine
                  key={l.id}
                  line={l}
                  matchedJournal={l.matchedJournalId ? s.journals.find((j) => j.id === l.matchedJournalId) : undefined}
                  candidates={candidates}
                  onAccept={() => accept(l)}
                  onPick={(id) => pick(l, id)}
                  onCreate={() => create(l)}
                  onExclude={() => exclude(l)}
                  onRestore={() => restore(l)}
                  onOpenJournal={setJournalId}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <JournalDrawer journalId={journalId} onClose={() => setJournalId(null)} />
    </PageBody>
  )
}
