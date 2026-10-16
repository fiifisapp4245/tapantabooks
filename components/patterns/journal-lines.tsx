"use client"

import { cn } from "@/lib/utils"
import type { Currency } from "@/lib/constants"
import { formatMoney } from "@/lib/money"
import { Money } from "./money"
import { Code } from "./text"

export type JournalLine = {
  accountCode: string
  accountName: string
  description?: string
  debit: number
  credit: number
}

/**
 * "What this posts": the Dr/Cr lines behind a document. Used in drawers,
 * in form preview panels, and in report drill-downs.
 */
export function JournalLines({
  lines,
  currency = "GHS",
  className,
}: {
  lines: JournalLine[]
  currency?: Currency
  className?: string
}) {
  const dr = lines.reduce((s, l) => s + l.debit, 0)
  const cr = lines.reduce((s, l) => s + l.credit, 0)
  const balanced = Math.abs(dr - cr) < 0.005
  return (
    <div className={cn("overflow-hidden rounded-xl border", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
            <th className="h-9 px-3 text-left font-medium">Account</th>
            <th className="h-9 w-28 px-3 text-right font-medium">Debit</th>
            <th className="h-9 w-28 px-3 text-right font-medium">Credit</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b last:border-b-0">
              <td className={cn("px-3 py-2", l.credit > 0 && "pl-7")}>
                <div className="flex items-baseline gap-2">
                  <Code>{l.accountCode}</Code>
                  <span className="truncate">{l.accountName}</span>
                </div>
                {l.description && <p className="text-xs text-muted-foreground">{l.description}</p>}
              </td>
              <td className="px-3 py-2 text-right">{l.debit ? <Money amount={l.debit} currency={currency} hideSymbol /> : null}</td>
              <td className="px-3 py-2 text-right">{l.credit ? <Money amount={l.credit} currency={currency} hideSymbol /> : null}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/50 text-[13px] font-medium">
            <td className="px-3 py-2">
              <span className={cn("text-xs", balanced ? "text-success" : "text-warning")}>
                {balanced ? "Balanced" : `Out by ${formatMoney(Math.abs(dr - cr), currency)}`}
              </span>
            </td>
            <td className="px-3 py-2 text-right"><Money amount={dr} currency={currency} hideSymbol /></td>
            <td className="px-3 py-2 text-right"><Money amount={cr} currency={currency} hideSymbol /></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
