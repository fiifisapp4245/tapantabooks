"use client"

import * as React from "react"
import { Download, Wallet } from "lucide-react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { fmtDate } from "@/lib/dates"
import { billRows, useSelect } from "@/lib/selectors"
import { TAX_LABELS } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { DrawerSection, EntityDrawer, FactList } from "@/components/patterns/entity-drawer"
import { JournalLines } from "@/components/patterns/journal-lines"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Money } from "@/components/patterns/money"
import { Code, Term } from "@/components/patterns/text"
import { JournalDrawer } from "@/components/drawers/journal-drawer"
import { BillPaymentDialog } from "./bill-payment-dialog"
import { branchName } from "./shared"

/** One bill: summary, lines, payments, the journal it posted, Record payment and Download. */
export function BillDrawer({ billId, onClose }: { billId: string | null; onClose: () => void }) {
  const rows = useSelect(billRows)
  const accounts = useLedger((s) => s.accounts)
  const journals = useLedger((s) => s.journals)
  const payments = useLedger((s) => s.payments)
  const bill = rows.find((r) => r.id === billId)
  const [journalId, setJournalId] = React.useState<string | null>(null)
  const [paying, setPaying] = React.useState(false)
  const accountName = (code: string) => accounts.find((a) => a.code === code)?.name ?? code
  const journal = journals.find((j) => j.id === bill?.journalId)
  const paid = payments.filter((p) => p.docId === bill?.id).sort((a, b) => a.date.localeCompare(b.date))
  const canPay = !!bill && bill.docStatus === "posted" && bill.balance > 0.005

  return (
    <>
      <EntityDrawer
        open={!!bill && !journalId}
        onOpenChange={(o) => !o && onClose()}
        code={bill?.id}
        title={bill?.contact.name ?? ""}
        subtitle={bill ? `Billed ${fmtDate(bill.issueDate)} · Due ${fmtDate(bill.dueDate)} · ${branchName(bill.branch)}` : undefined}
        status={bill && <StatusBadge status={bill.status} days={bill.daysOverdue || undefined} />}
        amount={bill ? (bill.status === "paid" || bill.status === "draft" ? bill.total : bill.balance) : undefined}
        currency={bill?.currency}
        amountLabel={bill?.status === "paid" ? "Bill total" : bill?.status === "draft" ? "Bill total (draft)" : "Still to pay"}
        actions={
          bill && (
            <>
              {canPay && (
                <Button onClick={() => setPaying(true)}>
                  <Wallet />
                  Record payment
                </Button>
              )}
              <Button variant="outline" onClick={() => toast(`${bill.id} downloaded`, { description: "PDF downloads are mocked in the prototype." })}>
                <Download />
                Download
              </Button>
            </>
          )
        }
      >
        {bill && (
          <>
            <DrawerSection title="Summary">
              <FactList
                items={[
                  { label: "Supplier", value: bill.contact.name },
                  { label: "Supplier ref", value: bill.reference ? <Code>{bill.reference}</Code> : "—" },
                  { label: "Bill date", value: fmtDate(bill.issueDate) },
                  { label: "Due", value: fmtDate(bill.dueDate) },
                  { label: "Branch", value: branchName(bill.branch) },
                  { label: "Before VAT", value: <Money amount={bill.subtotal} currency={bill.currency} size="sm" /> },
                  { label: "VAT", value: <Money amount={bill.tax} currency={bill.currency} size="sm" /> },
                  { label: "Total", value: <Money amount={bill.total} currency={bill.currency} size="sm" /> },
                  { label: "Paid so far", value: <Money amount={bill.paid} currency={bill.currency} size="sm" /> },
                ]}
              />
            </DrawerSection>

            <DrawerSection title="Lines">
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                      <th className="h-9 px-3 text-left font-medium">What for</th>
                      <th className="h-9 w-32 px-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.lines.map((l, i) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="px-3 py-2">
                          <p>{l.description || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            <Code className="text-xs">{l.accountCode}</Code> {accountName(l.accountCode)} · {TAX_LABELS[l.taxCode]}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Money amount={l.qty * l.unitPrice * (1 - l.discount)} currency={bill.currency} hideSymbol size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DrawerSection>

            <DrawerSection title="Payments">
              {paid.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {bill.docStatus === "draft" ? "Post the bill before paying it." : "Nothing paid yet."}
                </p>
              ) : (
                <ul className="divide-y rounded-xl border">
                  {paid.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => setJournalId(p.journalId)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/40">
                        <Code>{p.id}</Code>
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">
                          {fmtDate(p.date)} · {p.method} · {accountName(p.accountCode)}
                        </span>
                        <Money amount={p.amount} currency={p.currency} size="sm" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </DrawerSection>

            <DrawerSection
              title="What it posted"
              action={
                journal && (
                  <Button variant="ghost" size="sm" onClick={() => setJournalId(journal.id)}>
                    Open {journal.id}
                  </Button>
                )
              }
            >
              {journal ? (
                <>
                  <JournalLines lines={journal.lines.map((l) => ({ ...l, accountName: accountName(l.accountCode) }))} />
                  <p className="text-xs text-muted-foreground">
                    Adds to <Term term="Accounts payable (2000)">What you owe</Term> and records VAT you can claim back.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Drafts don&apos;t post anything until they&apos;re posted.</p>
              )}
            </DrawerSection>
          </>
        )}
      </EntityDrawer>
      <JournalDrawer journalId={journalId} onClose={() => setJournalId(null)} />
      {bill && paying && (
        <BillPaymentDialog
          bill={{ ...bill, status: bill.docStatus }}
          balance={bill.balance}
          open={paying}
          onClose={() => setPaying(false)}
        />
      )}
    </>
  )
}
