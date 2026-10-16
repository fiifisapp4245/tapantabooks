"use client"

import * as React from "react"
import { CircleCheck, TriangleAlert } from "lucide-react"
import { useLedger } from "@/lib/ledger"
import { fmtDate, TODAY } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { trialBalance } from "@/lib/selectors"
import { Money } from "@/components/patterns/money"

/** Every account with a balance, debits and credits side by side. Names switch the Ledger tab to that account. */
export function TrialBalance({ onOpenAccount }: { onOpenAccount: (code: string) => void }) {
  const s = useLedger()
  const rows = React.useMemo(() => trialBalance(s, TODAY), [s])
  const dr = Math.round(rows.reduce((t, r) => t + r.debit, 0) * 100) / 100
  const cr = Math.round(rows.reduce((t, r) => t + r.credit, 0) * 100) / 100
  const balanced = Math.abs(dr - cr) < 0.005

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="text-[15px] font-medium">Trial balance</h2>
          <p className="text-xs text-muted-foreground">As at {fmtDate(TODAY)} · {rows.length} accounts with a balance</p>
        </div>
        <span className={balanced ? "inline-flex items-center gap-1.5 text-[13px] text-success" : "inline-flex items-center gap-1.5 text-[13px] text-warning"}>
          {balanced ? <CircleCheck className="size-4" /> : <TriangleAlert className="size-4" />}
          {balanced ? "Debits equal credits" : `Out by ${formatMoney(Math.abs(dr - cr))}`}
        </span>
      </div>
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="hidden h-10 w-20 px-4 text-left font-medium sm:table-cell">Code</th>
            <th className="h-10 px-4 text-left font-medium">Account</th>
            <th className="h-10 w-28 px-3 text-right font-medium sm:w-40 sm:px-4">Debit (GH₵)</th>
            <th className="h-10 w-28 px-3 text-right font-medium sm:w-40 sm:px-4">Credit (GH₵)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.account.code} className="border-b last:border-b-0">
              <td className="hidden px-3 py-2.5 sm:table-cell sm:px-4">
                <button type="button" onClick={() => onOpenAccount(r.account.code)} className="font-mono text-[13px] text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:text-foreground">
                  {r.account.code}
                </button>
              </td>
              <td className="truncate px-3 py-2.5 sm:px-4">
                <button type="button" onClick={() => onOpenAccount(r.account.code)} className="max-w-full truncate text-left underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground">
                  {r.account.name}
                </button>
              </td>
              <td className="px-3 py-2.5 sm:px-4 text-right">{r.debit ? <Money amount={r.debit} hideSymbol /> : null}</td>
              <td className="px-3 py-2.5 sm:px-4 text-right">{r.credit ? <Money amount={r.credit} hideSymbol /> : null}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-foreground/70 font-semibold">
            <td className="hidden sm:table-cell" />
            <td className="px-3 py-3 sm:px-4">Totals</td>
            <td className="px-3 py-3 text-right sm:px-4"><Money amount={dr} hideSymbol /></td>
            <td className="px-3 py-3 text-right sm:px-4"><Money amount={cr} hideSymbol /></td>
          </tr>
        </tfoot>
      </table>
    </section>
  )
}
