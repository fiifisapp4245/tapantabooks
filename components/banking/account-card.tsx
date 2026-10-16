"use client"

import Link from "next/link"
import { ArrowLeftRight, GitCompareArrows, Landmark, Smartphone, TriangleAlert, Wallet, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { fmtDate, TODAY } from "@/lib/dates"
import { RATES } from "@/lib/mock/seed"
import type { Account } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Money } from "@/components/patterns/money"
import { Code, Term } from "@/components/patterns/text"
import { StatusBadge } from "@/components/patterns/status-badge"

export const KIND_ICONS: Record<NonNullable<Account["bank"]>["kind"], LucideIcon> = {
  bank: Landmark,
  momo: Smartphone,
  cash: Wallet,
}

export type BankCardData = {
  account: Account
  book: number
  bankSays: number
  difference: number
  openCount: number
  hasFeed: boolean
  lastReconciled?: string
  statementDate?: string
}

/** One bank account, wallet or cash box: both balances, the gap, and what to do about it. */
export function AccountCard({ data, onTransfer }: { data: BankCardData; onTransfer: () => void }) {
  const { account: a, book, bankSays, difference, openCount, hasFeed, lastReconciled, statementDate } = data
  const kind = a.bank!.kind
  const Icon = KIND_ICONS[kind]
  const matches = Math.abs(difference) < 0.005
  const negative = book < 0 && kind !== "bank"
  const asAt = hasFeed && statementDate && statementDate !== TODAY ? ` on ${fmtDate(statementDate)}` : ""
  const sideLabel = kind === "cash" ? "Counted" : kind === "momo" ? "Wallet says" : "Bank says"

  return (
    <article className="flex min-w-0 flex-col rounded-xl border bg-card">
      <header className="flex items-start gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[15px] font-medium">{a.name}</h2>
          </div>
          <p className="truncate text-[13px] text-muted-foreground">
            {a.bank!.institution} · <span className="font-mono">{a.bank!.masked}</span>
          </p>
        </div>
        <Code className="shrink-0">{a.code}</Code>
      </header>

      <dl className="divide-y border-t text-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <dt className="text-muted-foreground">In Tapanta</dt>
          <dd className="text-right">
            <Money amount={book} size="lg" negativeHint="Below zero" />
            {a.currency !== "GHS" && (
              <p className="text-xs text-muted-foreground">
                ≈ <Money amount={book / RATES[a.currency]} currency={a.currency} size="sm" className="text-muted-foreground" />
              </p>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <dt className="text-muted-foreground">
            {sideLabel}
            {asAt && <span className="text-xs">{asAt}</span>}
          </dt>
          <dd>
            <Money amount={bankSays} size="lg" negativeHint="Below zero" />
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-2.5">
          <dt className="text-muted-foreground">
            <Term term="Out of agreement">Difference</Term>
          </dt>
          <dd>{matches ? <StatusBadge status="reconciled" /> : <Money amount={difference} size="lg" className="text-warning" />}</dd>
          <dd className={cn("col-span-2 text-xs", matches ? "text-muted-foreground" : "text-warning")}>
            {matches ? (
              hasFeed ? "Every statement line is matched." : `No statement lines waiting. Matched up to ${fmtDate(statementDate)}.`
            ) : (
              <>
                <Money amount={Math.abs(difference)} size="sm" className="text-warning" /> — {openCount} {openCount === 1 ? "line" : "lines"} not yet matched
              </>
            )}
          </dd>
        </div>
      </dl>

      {negative && (
        <div role="status" className="flex items-start gap-2 border-t bg-warning-soft px-4 py-2.5 text-[13px] text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-medium">This is a data issue, not real money.</span>{" "}
            <span className="text-foreground/75">
              {kind === "momo" ? "A wallet can't hold less than zero. Check for a payout recorded twice." : "A cash box can't hold less than zero. Check for a missing deposit."}{" "}
              <Link href={`/general-ledger?account=${a.code}`} className="underline underline-offset-4">
                See the movements
              </Link>
            </span>
          </p>
        </div>
      )}

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Last reconciled {lastReconciled ? fmtDate(lastReconciled) : "never"}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onTransfer}>
            <ArrowLeftRight />
            Transfer
          </Button>
          <Button variant="outline" asChild>
            <Link href="/reconcile">
              <GitCompareArrows />
              Reconcile
            </Link>
          </Button>
        </div>
      </footer>
    </article>
  )
}
