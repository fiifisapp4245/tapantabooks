"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { fmtDate, monthKey, monthLabel, TODAY } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { EXCHANGE_RATES, RATES } from "@/lib/mock/seed"
import { accountBalance, billRows, invoiceRows } from "@/lib/selectors"
import type { LedgerState } from "@/lib/ledger"
import { Button } from "@/components/ui/button"
import { Money } from "@/components/patterns/money"
import { Code } from "@/components/patterns/text"
import { JournalLines } from "@/components/patterns/journal-lines"
import { SubmitReason } from "@/components/patterns/form-bits"
import { postJournal } from "./post-journal"

const USD_ACCOUNT = "1025"
const FX_ACCOUNT = "4200"
const r2 = (n: number) => Math.round(n * 100) / 100

/** Dollars held in the USD account: the starting balance plus every receipt and payment through it. */
function usdHeld(s: LedgerState) {
  const opening = s.journals.find((j) => j.source === "opening")?.lines.find((l) => l.accountCode === USD_ACCOUNT)
  let usd = opening ? opening.debit / RATES.USD : 0
  for (const p of s.payments) {
    if (p.accountCode !== USD_ACCOUNT) continue
    const inUsd = p.currency === "USD" ? p.amount : (p.amount * p.rate) / RATES.USD
    usd += p.direction === "in" ? inUsd : -inUsd
  }
  return r2(usd)
}

export function RevaluationTab() {
  const s = useLedger()
  const userId = usePrefs((p) => p.userId)
  const acc = s.accounts.find((a) => a.code === USD_ACCOUNT)!
  const closing = EXCHANGE_RATES.find((r) => r.currency === "USD")!.rate

  const usd = React.useMemo(() => usdHeld(s), [s])
  const book = React.useMemo(() => accountBalance(s, USD_ACCOUNT), [s])
  const revalued = r2(usd * closing)
  const adj = r2(revalued - book)
  const gain = adj >= 0
  const month = monthKey(TODAY)
  const posted = s.journals.find((j) => j.source === "revaluation" && j.status === "posted" && monthKey(j.date) === month)

  // Which currencies are in use, and where.
  const usage = React.useMemo(() => {
    const docs = [...invoiceRows(s), ...billRows(s)].filter((d) => d.balance > 0.005 && (d.status === "unpaid" || d.status === "part_paid" || d.status === "overdue"))
    return Object.fromEntries(
      EXCHANGE_RATES.map((r) => {
        const accounts = s.accounts.filter((a) => a.currency === r.currency && a.active)
        const open = docs.filter((d) => d.currency === r.currency).length
        return [r.currency, { accounts, open }]
      })
    )
  }, [s])

  const name = (c: string) => s.accounts.find((a) => a.code === c)?.name ?? c
  const lines = gain
    ? [
        { accountCode: USD_ACCOUNT, accountName: name(USD_ACCOUNT), description: `US$ revalued at ${closing.toFixed(4)}`, debit: Math.abs(adj), credit: 0 },
        { accountCode: FX_ACCOUNT, accountName: name(FX_ACCOUNT), description: "Exchange gain", debit: 0, credit: Math.abs(adj) },
      ]
    : [
        { accountCode: FX_ACCOUNT, accountName: name(FX_ACCOUNT), description: "Exchange loss", debit: Math.abs(adj), credit: 0 },
        { accountCode: USD_ACCOUNT, accountName: name(USD_ACCOUNT), description: `US$ revalued at ${closing.toFixed(4)}`, debit: 0, credit: Math.abs(adj) },
      ]

  const reason = posted ? `Already posted for ${monthLabel(month, true)} (${posted.id})` : Math.abs(adj) < 0.005 ? "Nothing to revalue" : null

  const post = () => {
    const j = postJournal(
      {
        date: TODAY,
        memo: `Currency revaluation – Ecobank USD (${monthLabel(month, true).split(" ")[0]})`,
        reference: `REVAL-${month.slice(5)}`,
        source: "revaluation",
        branch: "adum",
        createdBy: userId,
        lines: lines.map(({ accountCode, description, debit, credit }) => ({ accountCode, description, debit, credit })),
      },
      "Posted revaluation"
    )
    toast.success("Revaluation posted", { description: `${j.id}: ${acc.name} now shows ${formatMoney(usd, "USD")} at today's rate.` })
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Closing rates */}
      <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
        <header className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3">
          <div>
            <h2 className="text-[15px] font-medium">Closing rates</h2>
            <p className="text-xs text-muted-foreground">Bank of Ghana mid-rates on {fmtDate(EXCHANGE_RATES[0].updated)}</p>
          </div>
          <Link href="/settings" className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Rates are edited in Settings
          </Link>
        </header>
        <ul className="divide-y">
          {EXCHANGE_RATES.map((r) => {
            const u = usage[r.currency]
            const inUse = u.accounts.length > 0 || u.open > 0
            return (
              <li key={r.currency} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <span className="w-12 font-mono text-[13px] font-medium">{r.currency}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    1 {r.currency} = <span className="tabular font-medium">GH₵ {r.rate.toFixed(4)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inUse
                      ? [
                          u.accounts.length ? u.accounts.map((a) => a.name).join(", ") : null,
                          u.open ? `${u.open} open ${u.open === 1 ? "document" : "documents"}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : "Not in use yet. Ready if you invoice in this currency."}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{r.source}</span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Preview */}
      <section className="min-w-0 space-y-4">
        <div>
          <h2 className="text-[15px] font-medium">Preview: {acc.name}</h2>
          <p className="text-sm text-muted-foreground">
            The account holds <Money amount={usd} currency="USD" />. Valued at today&apos;s rate, the books need to {gain ? "rise" : "fall"} by{" "}
            <Money amount={Math.abs(adj)} />.
          </p>
        </div>
        <dl className="grid min-w-0 rounded-xl border bg-card sm:grid-cols-3 sm:divide-x">
          <div className="space-y-0.5 p-4">
            <dt className="text-[13px] text-muted-foreground">In Tapanta now</dt>
            <dd><Money amount={book} size="lg" /></dd>
            <dd className="text-xs text-muted-foreground"><Code>{USD_ACCOUNT}</Code> at earlier rates</dd>
          </div>
          <div className="space-y-0.5 border-t p-4 sm:border-t-0">
            <dt className="text-[13px] text-muted-foreground">At today&apos;s rate</dt>
            <dd><Money amount={revalued} size="lg" /></dd>
            <dd className="text-xs text-muted-foreground">US$ × {closing.toFixed(4)}</dd>
          </div>
          <div className="space-y-0.5 border-t p-4 sm:border-t-0">
            <dt className="text-[13px] text-muted-foreground">Exchange {gain ? "gain" : "loss"}</dt>
            <dd><Money amount={adj} size="lg" negativeHint="A loss: the dollars are worth less in cedis" /></dd>
            <dd className="text-xs text-muted-foreground">Posts to {name(FX_ACCOUNT)}</dd>
          </div>
        </dl>
        <JournalLines lines={lines} />
        <div className="flex flex-wrap items-center justify-end gap-3">
          <SubmitReason reason={reason} />
          <Button disabled={!!reason} onClick={post}>
            Post revaluation
          </Button>
        </div>
      </section>
    </div>
  )
}
