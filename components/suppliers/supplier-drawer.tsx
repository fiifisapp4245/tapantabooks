"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { useLedger, type LedgerState } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { fmtDate, TODAY } from "@/lib/dates"
import { billRows, useSelect } from "@/lib/selectors"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DrawerSection, EntityDrawer, FactList } from "@/components/patterns/entity-drawer"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Money } from "@/components/patterns/money"
import { Code, Term } from "@/components/patterns/text"
import { BillDrawer } from "@/components/bills/bill-drawer"
import { JournalDrawer } from "@/components/drawers/journal-drawer"
import { r2 } from "@/components/bills/shared"

type StatementLine = { date: string; kind: "bill" | "payment" | "credit"; id: string; journalId?: string; label: string; charge: number; paid: number; balance: number }

/** Every posted bill, payment and supplier credit for one supplier, oldest first, with a running balance. */
function statementFor(s: LedgerState, contactId?: string) {
  if (!contactId) return { lines: [] as StatementLine[], closing: 0 }
  const raw: Omit<StatementLine, "balance">[] = [
    ...s.bills
      .filter((b) => b.contactId === contactId && b.status === "posted")
      .map((b) => ({ date: b.issueDate, kind: "bill" as const, id: b.id, journalId: b.journalId, label: b.reference ? `Bill · their ref ${b.reference}` : "Bill", charge: r2(b.total * b.rate), paid: 0 })),
    ...s.payments
      .filter((p) => p.direction === "out" && p.contactId === contactId)
      .map((p) => ({ date: p.date, kind: "payment" as const, id: p.id, journalId: p.journalId, label: p.docId ? `Payment for ${p.docId}` : "Payment", charge: 0, paid: r2(p.amount * p.rate) })),
    ...s.creditNotes
      .filter((c) => c.kind === "supplier_credit" && c.contactId === contactId && c.journalId && c.status !== "void")
      .map((c) => ({ date: c.date, kind: "credit" as const, id: c.id, journalId: c.journalId, label: `Credit · ${c.reason}`, charge: 0, paid: c.total })),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "bill" ? -1 : 1) - (b.kind === "bill" ? -1 : 1))
  let running = 0
  const lines = raw.map((l) => {
    running = r2(running + l.charge - l.paid)
    return { ...l, balance: running }
  })
  return { lines, closing: running }
}

export function SupplierDrawer({ contactId, onClose }: { contactId: string | null; onClose: () => void }) {
  const contact = useLedger((s) => s.contacts.find((c) => c.id === contactId))
  const rows = useSelect(billRows)
  const payments = useLedger((s) => s.payments)
  const credits = useLedger((s) => s.creditNotes)
  const [tab, setTab] = React.useState("overview")
  const [billId, setBillId] = React.useState<string | null>(null)
  const [journalId, setJournalId] = React.useState<string | null>(null)
  const ledger = useLedger()
  const statement = React.useMemo(() => statementFor(ledger, contactId ?? undefined), [ledger, contactId])

  const bills = rows.filter((r) => r.contactId === contactId)
  const open = bills.filter((r) => r.status === "unpaid" || r.status === "part_paid" || r.status === "overdue")
  const owed = r2(open.reduce((t, r) => t + r.baseBalance, 0))
  const overdue = r2(bills.filter((r) => r.status === "overdue").reduce((t, r) => t + r.baseBalance, 0))
  const openCredit = r2(credits.filter((c) => c.kind === "supplier_credit" && c.contactId === contactId && c.status === "open").reduce((t, c) => t + c.total - c.applied, 0))
  const paidYear = r2(payments.filter((p) => p.direction === "out" && p.contactId === contactId && p.date.startsWith(TODAY.slice(0, 4)) && p.date <= TODAY).reduce((t, p) => t + p.amount * p.rate, 0))

  return (
    <>
      <EntityDrawer
        open={!!contact && !billId && !journalId}
        onOpenChange={(o) => {
          if (!o) {
            setTab("overview")
            onClose()
          }
        }}
        title={contact?.name ?? ""}
        subtitle={contact ? [contact.city, `${contact.termsDays}-day terms`].filter(Boolean).join(" · ") : undefined}
        status={overdue > 0 ? <StatusBadge status="overdue" /> : undefined}
        amount={owed}
        amountLabel="You owe"
        actions={
          contact && (
            <>
              <Button onClick={() => usePrefs.getState().openForm("bill", { contactId: contact.id })}>
                <Plus />
                New bill
              </Button>
            </>
          )
        }
      >
        {contact && (
          <Tabs value={tab} onValueChange={setTab} className="gap-5">
            <TabsList className="h-9">
              <TabsTrigger value="overview" className="data-[state=active]:bg-card">Overview</TabsTrigger>
              <TabsTrigger value="bills" className="data-[state=active]:bg-card">Bills ({bills.length})</TabsTrigger>
              <TabsTrigger value="statement" className="data-[state=active]:bg-card">Statement</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <DrawerSection title="Balance">
                <FactList
                  items={[
                    { label: <Term term="Accounts payable">You owe</Term>, value: <Money amount={owed} size="sm" /> },
                    { label: "Overdue", value: <Money amount={overdue} size="sm" className={overdue > 0 ? "text-warning" : undefined} /> },
                    { label: "Open bills", value: open.length },
                    { label: "Credit to use", value: <Money amount={openCredit} size="sm" /> },
                    { label: "Paid this year", value: <Money amount={paidYear} size="sm" /> },
                  ]}
                />
              </DrawerSection>
              <DrawerSection title="Contact">
                <FactList
                  items={[
                    { label: "Email", value: contact.email || "—" },
                    { label: "Phone", value: contact.phone || "—" },
                    { label: "City", value: contact.city || "—" },
                    { label: "TIN", value: contact.tin ? <Code>{contact.tin}</Code> : "—" },
                    { label: "Payment terms", value: `${contact.termsDays} days` },
                    { label: "Currency", value: contact.currency },
                  ]}
                />
              </DrawerSection>
            </TabsContent>

            <TabsContent value="bills">
              {bills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bills from {contact.name} yet.</p>
              ) : (
                <ul className="divide-y rounded-xl border">
                  {bills.map((b) => (
                    <li key={b.id}>
                      <button type="button" onClick={() => setBillId(b.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/40">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Code>{b.id}</Code>
                            <StatusBadge status={b.status} days={b.daysOverdue || undefined} />
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {fmtDate(b.issueDate)} · due {fmtDate(b.dueDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <Money amount={b.total} currency={b.currency} size="sm" />
                          {b.balance > 0.005 && b.balance < b.total && (
                            <p className="text-xs text-muted-foreground">
                              <Money amount={b.balance} currency={b.currency} size="sm" className="text-xs text-muted-foreground" /> left
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="statement" className="space-y-2">
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                      <th className="h-9 px-3 text-left font-medium">Date and item</th>
                      <th className="h-9 w-24 px-3 text-right font-medium">Billed</th>
                      <th className="h-9 w-24 px-3 text-right font-medium">Paid</th>
                      <th className="h-9 w-28 px-3 text-right font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.lines.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Nothing posted for this supplier yet.</td>
                      </tr>
                    )}
                    {statement.lines.map((l) => (
                      <tr
                        key={l.id}
                        className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40"
                        onClick={() => (l.kind === "bill" ? setBillId(l.id) : l.journalId && setJournalId(l.journalId))}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs whitespace-nowrap text-muted-foreground">{fmtDate(l.date)}</span>
                            <Code>{l.id}</Code>
                          </div>
                          <p className="truncate text-[13px]">{l.label}</p>
                        </td>
                        <td className="px-3 py-2 text-right">{l.charge ? <Money amount={l.charge} hideSymbol size="sm" /> : null}</td>
                        <td className="px-3 py-2 text-right">{l.paid ? <Money amount={l.paid} hideSymbol size="sm" /> : null}</td>
                        <td className="px-3 py-2 text-right"><Money amount={l.balance} hideSymbol size="sm" negativeHint="They owe you" /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/50 text-[13px] font-medium">
                      <td className="px-3 py-2" colSpan={3}>Balance as at {fmtDate(TODAY)}</td>
                      <td className="px-3 py-2 text-right"><Money amount={statement.closing} size="sm" negativeHint="They owe you" /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {Math.abs(statement.closing - owed) > 0.005 && (
                <p className="text-xs text-muted-foreground">
                  The statement balance takes off credits you haven&apos;t used yet, so it differs from the{" "}
                  <Money amount={owed} size="sm" className="text-xs text-muted-foreground" /> left on open bills.
                </p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </EntityDrawer>
      <BillDrawer billId={billId} onClose={() => setBillId(null)} />
      <JournalDrawer journalId={journalId} onClose={() => setJournalId(null)} />
    </>
  )
}
