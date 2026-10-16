"use client"

import { ageing, ageingByContact, billRows, invoiceRows, ledgerLines, type DocRow } from "@/lib/selectors"
import type { LedgerState } from "@/lib/ledger"
import type { Bill, Invoice } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Money } from "@/components/patterns/money"
import { EmptyState } from "@/components/patterns/empty-state"
import { ReportPage, type ReportContext } from "./report-page"
import { CircleCheck } from "lucide-react"

// Same order as Home: crimson for current, through greys to black for 90+ days.
const COLOURS = ["bg-chart-1", "bg-chart-3", "bg-chart-5", "bg-chart-4", "bg-chart-2"]
const r2 = (n: number) => Math.round(n * 100) / 100

const isOpen = (r: { status: string }) => r.status === "unpaid" || r.status === "part_paid" || r.status === "overdue"
/** Same buckets as the ageing selector. */
const bucketOf = (daysOverdue: number) => (daysOverdue <= 0 ? 0 : daysOverdue <= 30 ? 1 : daysOverdue <= 60 ? 2 : daysOverdue <= 90 ? 3 : 4)

type Kind = "invoice" | "bill"

/** Who owes you / What you owe: an ageing bar, then a row per contact. Always as at today. */
export function AgeingReport({ kind, formalName }: { kind: Kind; formalName: string }) {
  return (
    <ReportPage formalName={formalName} fixedToday>
      {(ctx) => <Ageing ctx={ctx} kind={kind} />}
    </ReportPage>
  )
}

/** The control-account lines (who owes you / what you owe) behind a set of documents. */
function docLines(s: LedgerState, docs: DocRow<Invoice | Bill>[], kind: Kind) {
  const control = kind === "invoice" ? "1100" : "2000"
  const ids = new Set<string>()
  for (const d of docs) {
    if (d.journalId) ids.add(d.journalId)
    for (const p of s.payments) if (p.docId === d.id) ids.add(p.journalId)
  }
  return ledgerLines(s).filter((l) => ids.has(l.journal.id) && l.accountCode === control)
}

function Ageing({ ctx, kind }: { ctx: ReportContext; kind: Kind }) {
  const { s, branch, fx, drill } = ctx
  const all: DocRow<Invoice | Bill>[] = kind === "invoice" ? invoiceRows(s) : billRows(s)
  const rows = all.filter((r) => !branch || r.branch === branch)
  const open = rows.filter(isOpen)
  const buckets = ageing(rows)
  const contacts = ageingByContact(rows)
  const total = r2(buckets.reduce((t, b) => t + b.amount, 0))
  const who = kind === "invoice" ? "Customer" : "Supplier"

  const drillDocs = (title: string, docs: DocRow<Invoice | Bill>[]) =>
    drill(title, docLines(s, docs, kind), `${docs.length} ${kind === "invoice" ? "invoice" : "bill"}${docs.length === 1 ? "" : "s"} still open`)

  if (!open.length) {
    return (
      <EmptyState
        icon={CircleCheck}
        title={kind === "invoice" ? "No one owes you anything" : "You don't owe anyone"}
        description="Every posted document is fully paid."
      />
    )
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm text-muted-foreground">Total {kind === "invoice" ? "owed to you" : "you owe"}</p>
          <button type="button" onClick={() => drillDocs("All open balances", open)} className="rounded px-1 hover:bg-brand-soft">
            <Money amount={fx(total)} size="lg" />
          </button>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Ageing split">
          {buckets.map((b, i) =>
            b.amount > 0 ? <div key={b.id} className={cn("h-full", COLOURS[i])} style={{ width: `${(b.amount / total) * 100}%` }} title={b.label} /> : null
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          {buckets.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => drillDocs(b.label, open.filter((r) => bucketOf(r.daysOverdue) === i))}
              className="flex flex-col items-start gap-0.5 rounded-md p-1 text-left hover:bg-muted/60"
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("size-2 rounded-full", COLOURS[i])} aria-hidden />
                {b.label}
              </span>
              <Money amount={fx(b.amount)} hideSymbol className="font-medium" />
              <span className="text-xs text-muted-foreground">
                {b.count} {kind === "invoice" ? "invoice" : "bill"}
                {b.count === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="px-2 py-2 text-left font-medium">{who}</th>
              {buckets.map((b) => (
                <th key={b.id} className="px-2 py-2 text-right font-medium whitespace-nowrap">
                  {b.label.replace(" days", "")}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {contacts.map((c) => {
              const docs = open.filter((r) => r.contactId === c.contact.id)
              return (
                <tr key={c.contact.id}>
                  <td className="px-2 py-2.5">
                    <p className="font-medium">{c.contact.name}</p>
                    <p className="text-xs text-muted-foreground">{c.contact.city}</p>
                  </td>
                  {c.buckets.map((amt, i) => (
                    <td key={i} className="px-2 py-2.5 text-right">
                      {amt ? (
                        <button
                          type="button"
                          className="rounded px-1 hover:bg-brand-soft"
                          onClick={() => drillDocs(`${c.contact.name} · ${buckets[i].label}`, docs.filter((r) => bucketOf(r.daysOverdue) === i))}
                        >
                          <Money amount={fx(amt)} hideSymbol />
                        </button>
                      ) : (
                        <span className="text-muted-foreground/60">–</span>
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-2.5 text-right">
                    <button type="button" className="rounded px-1 hover:bg-brand-soft" onClick={() => drillDocs(c.contact.name, docs)}>
                      <Money amount={fx(c.total)} hideSymbol className="font-medium" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-foreground/80 font-semibold">
              <td className="px-2 py-2.5">Total</td>
              {buckets.map((b) => (
                <td key={b.id} className="px-2 py-2.5 text-right">
                  <Money amount={fx(b.amount)} hideSymbol />
                </td>
              ))}
              <td className="px-2 py-2.5 text-right">
                <Money amount={fx(total)} hideSymbol />
              </td>
            </tr>
          </tfoot>
        </table>
      </section>
    </div>
  )
}
