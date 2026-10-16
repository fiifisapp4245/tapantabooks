"use client"

import * as React from "react"
import { Banknote, Download, Send } from "lucide-react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { fmtDate } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { accountName, invoiceRows, useSelect } from "@/lib/selectors"
import { Button } from "@/components/ui/button"
import { DrawerSection, EntityDrawer, FactList } from "@/components/patterns/entity-drawer"
import { JournalLines } from "@/components/patterns/journal-lines"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Money } from "@/components/patterns/money"
import { Code, Term } from "@/components/patterns/text"
import { Banner } from "@/components/patterns/banner"
import { RecordPaymentDialog } from "./record-payment-dialog"
import { branchName, dueHint, isOpenStatus } from "./helpers"

/** Invoice summary, lines, payments, reminders and the journal it posted. */
export function InvoiceDrawer({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  const s = useLedger()
  const userId = usePrefs((p) => p.userId)
  const row = useSelect(invoiceRows).find((r) => r.id === invoiceId)
  const [paying, setPaying] = React.useState<string | null>(null)

  const open = row ? isOpenStatus(row.status) : false
  const payments = row ? s.payments.filter((p) => p.docId === row.id).sort((a, b) => a.date.localeCompare(b.date)) : []
  const journal = row?.journalId ? s.journals.find((j) => j.id === row.journalId) : undefined
  const hint = row ? dueHint(row) : undefined

  return (
    <>
      <EntityDrawer
        open={!!row}
        onOpenChange={(o) => !o && onClose()}
        code={row?.id}
        title={row?.contact.name ?? ""}
        subtitle={row ? `Issued ${fmtDate(row.issueDate)} · Due ${fmtDate(row.dueDate)}${hint ? ` (${hint})` : ""}` : undefined}
        status={row && <StatusBadge status={row.status} days={row.daysOverdue || undefined} />}
        amount={row ? (open ? row.balance : row.total) : undefined}
        currency={row?.currency}
        amountLabel={open ? "Amount due" : "Total"}
        actions={
          row && (
            <>
              {open && (
                <Button
                  onClick={() => {
                    s.sendReminder(row.id, userId)
                    toast.success("Reminder sent", { description: `Emailed to ${row.contact.email}.` })
                  }}
                >
                  <Send />
                  Send reminder
                </Button>
              )}
              {open && (
                <Button variant="outline" onClick={() => setPaying(row.id)}>
                  <Banknote />
                  Record payment
                </Button>
              )}
              <Button variant="outline" onClick={() => toast(`${row.id}.pdf is mocked in the prototype`)}>
                <Download />
                Download PDF
              </Button>
            </>
          )
        }
      >
        {row && (
          <>
            {row.docStatus === "draft" && (
              <Banner tone="info" title="Draft — not in your books yet">
                Drafts don&apos;t post a journal or count towards what customers owe you.
              </Banner>
            )}
            {row.docStatus === "awaiting_approval" && (
              <Banner tone="warning" title="Waiting for approval">
                This invoice posts to your books once someone approves it.
              </Banner>
            )}
            {row.docStatus === "void" && (
              <Banner tone="locked" title="Voided">
                The journal it posted was reversed, so it no longer changes your balances.
              </Banner>
            )}

            <DrawerSection title="Summary">
              <FactList
                items={[
                  { label: "Customer", value: row.contact.name },
                  { label: "Branch", value: branchName(row.branch) },
                  { label: "Delivery route", value: row.deliveryRoute },
                  { label: "Currency", value: row.currency === "GHS" ? "GHS" : `${row.currency} at ${row.rate} to GH₵` },
                  ...(row.reference ? [{ label: "Reference", value: <Code>{row.reference}</Code> }] : []),
                  { label: "Total", value: <Money amount={row.total} currency={row.currency} /> },
                  { label: "Paid so far", value: <Money amount={row.paid} currency={row.currency} /> },
                  ...(open && row.currency !== "GHS"
                    ? [{ label: <Term term="Accounts receivable">Who owes you</Term>, value: <Money amount={row.baseBalance} /> }]
                    : []),
                ]}
              />
            </DrawerSection>

            <DrawerSection title="Lines">
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                      <th className="h-9 px-3 text-left font-medium">Item</th>
                      <th className="h-9 w-14 px-3 text-right font-medium">Qty</th>
                      <th className="h-9 w-32 px-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.lines.map((l, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="px-3 py-2">
                          <p>{l.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatMoney(l.unitPrice, row.currency)} each{l.discount ? ` · ${Math.round(l.discount * 100)}% off` : ""} · {l.taxCode}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-right tabular">{l.qty}</td>
                        <td className="px-3 py-2 text-right">
                          <Money amount={l.qty * l.unitPrice * (1 - l.discount)} currency={row.currency} hideSymbol />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="text-[13px]">
                    <tr className="border-t">
                      <td colSpan={2} className="px-3 pt-2 text-muted-foreground">Subtotal</td>
                      <td className="px-3 pt-2 text-right"><Money amount={row.subtotal} currency={row.currency} hideSymbol /></td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="px-3 text-muted-foreground">VAT</td>
                      <td className="px-3 text-right"><Money amount={row.tax} currency={row.currency} hideSymbol /></td>
                    </tr>
                    <tr className="font-medium">
                      <td colSpan={2} className="px-3 pb-2">Total</td>
                      <td className="px-3 pb-2 text-right"><Money amount={row.total} currency={row.currency} /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </DrawerSection>

            <DrawerSection title="Payments">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments yet.</p>
              ) : (
                <ul className="divide-y rounded-xl border">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p>
                          {fmtDate(p.date)} · {p.method}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          <Code className="text-xs">{p.id}</Code> · into {accountName(s, p.accountCode)}
                        </p>
                      </div>
                      <Money amount={p.amount} currency={p.currency} />
                    </li>
                  ))}
                </ul>
              )}
            </DrawerSection>

            <DrawerSection title="Reminders">
              {row.remindersSent?.length ? (
                <ol className="space-y-3 border-l pl-4 text-sm">
                  {row.remindersSent.map((d, i) => (
                    <li key={i}>
                      <p>Reminder emailed to {row.contact.email}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(d)}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">{open ? "No reminders sent yet." : "None sent."}</p>
              )}
            </DrawerSection>

            <DrawerSection title="What this posted">
              {journal ? (
                <>
                  <JournalLines lines={journal.lines.map((l) => ({ ...l, accountName: accountName(s, l.accountCode) }))} />
                  <p className="text-xs text-muted-foreground">
                    <Code className="text-xs">{journal.id}</Code> · {fmtDate(journal.date)}
                    {journal.status === "reversed" ? ` · reversed by ${journal.reversedBy}` : ""}
                    {row.currency !== "GHS" ? " · in GH₵ at the invoice rate" : ""}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Nothing yet. A journal is posted when the invoice is approved.</p>
              )}
            </DrawerSection>
          </>
        )}
      </EntityDrawer>
      <RecordPaymentDialog invoiceId={paying} onClose={() => setPaying(null)} />
    </>
  )
}
