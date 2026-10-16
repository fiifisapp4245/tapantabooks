"use client"

import * as React from "react"
import { Download, FilePlus2 } from "lucide-react"
import { toast } from "sonner"
import { usePrefs } from "@/lib/store"
import { useLedger } from "@/lib/ledger"
import { fmtDate, TODAY } from "@/lib/dates"
import { ageing, invoiceRows, useSelect } from "@/lib/selectors"
import { r2 } from "@/lib/mock/seed"
import type { Contact } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DrawerSection, EntityDrawer, FactList } from "@/components/patterns/entity-drawer"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Money } from "@/components/patterns/money"
import { Code } from "@/components/patterns/text"
import { InvoiceDrawer } from "@/components/invoices/invoice-drawer"

type StatementLine = { date: string; ref: string; text: string; charge: number; payment: number; balance: number }

/**
 * Invoices and the payments against them, in GH₵, with a running balance.
 * Drafts, invoices awaiting approval and voided invoices never reached the
 * books, so they're left out. The closing balance matches Who owes you.
 */
function useStatement(contactId?: string) {
  const s = useLedger()
  // Not useSelect: that only recomputes when the ledger changes, and this also depends on the customer.
  return React.useMemo(() => {
    if (!contactId) return [] as StatementLine[]
    const invoices = s.invoices.filter((i) => i.contactId === contactId && i.status === "posted")
    const ids = new Set(invoices.map((i) => i.id))
    const entries = [
      ...invoices.map((i) => ({ date: i.issueDate, order: 0, ref: i.id, text: "Invoice", charge: r2(i.total * i.rate), payment: 0 })),
      ...s.payments
        .filter((p) => p.direction === "in" && p.docId && ids.has(p.docId))
        .map((p) => ({ date: p.date, order: 1, ref: p.id, text: `Payment for ${p.docId} · ${p.method}`, charge: 0, payment: r2(p.amount * p.rate) })),
    ]
      .filter((e) => e.date <= TODAY)
      .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order || a.ref.localeCompare(b.ref))
    let running = 0
    return entries.map<StatementLine>((e) => {
      running = r2(running + e.charge - e.payment)
      return { date: e.date, ref: e.ref, text: e.text, charge: e.charge, payment: e.payment, balance: running }
    })
  }, [s, contactId])
}

export function CustomerDrawer({ contact, onClose }: { contact?: Contact; onClose: () => void }) {
  const rows = useSelect(invoiceRows)
  const statement = useStatement(contact?.id)
  const [tab, setTab] = React.useState("overview")
  const [invoiceId, setInvoiceId] = React.useState<string | null>(null)

  const invoices = contact ? rows.filter((r) => r.contactId === contact.id) : []
  const buckets = ageing(invoices)
  const owed = r2(buckets.reduce((t, b) => t + b.amount, 0))
  const overdue = r2(owed - buckets[0].amount)

  return (
    <>
      <EntityDrawer
        open={!!contact && !invoiceId}
        onOpenChange={(o) => {
          if (!o) {
            setTab("overview")
            onClose()
          }
        }}
        title={contact?.name ?? ""}
        subtitle={contact ? [contact.city, contact.email].filter(Boolean).join(" · ") : undefined}
        amount={owed}
        amountLabel="Owes you"
        actions={
          contact && (
            <Button variant="outline" onClick={() => usePrefs.getState().openForm("invoice", { contactId: contact.id })}>
              <FilePlus2 />
              New invoice
            </Button>
          )
        }
      >
        {contact && (
          <Tabs value={tab} onValueChange={setTab} className="gap-6">
            <TabsList className="h-9">
              <TabsTrigger value="overview" className="data-[state=active]:bg-card">Overview</TabsTrigger>
              <TabsTrigger value="invoices" className="data-[state=active]:bg-card">Invoices</TabsTrigger>
              <TabsTrigger value="statement" className="data-[state=active]:bg-card">Statement</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <DrawerSection title="Balance by age">
                <ul className="divide-y rounded-xl border">
                  {buckets.map((b) => (
                    <li key={b.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className={b.amount ? "" : "text-muted-foreground"}>
                        {b.id === "current" ? "Not yet due" : `${b.label} overdue`}
                        {b.count > 0 && <span className="ml-2 text-xs text-muted-foreground">{b.count}</span>}
                      </span>
                      <Money amount={b.amount} className={b.amount ? "" : "text-muted-foreground"} />
                    </li>
                  ))}
                  <li className="flex items-center justify-between px-3 py-2 text-sm font-medium">
                    <span>Overdue in total</span>
                    <Money amount={overdue} />
                  </li>
                </ul>
              </DrawerSection>
              <DrawerSection title="Details">
                <FactList
                  items={[
                    { label: "Email", value: contact.email || "—" },
                    { label: "Phone", value: contact.phone || "—" },
                    { label: "City", value: contact.city || "—" },
                    { label: "TIN", value: contact.tin ? <Code>{contact.tin}</Code> : "—" },
                    { label: "Payment terms", value: `Net ${contact.termsDays} days` },
                    { label: "Currency", value: contact.currency },
                    { label: "VAT", value: contact.overseas ? "Overseas – zero-rated" : "Standard" },
                  ]}
                />
              </DrawerSection>
            </TabsContent>

            <TabsContent value="invoices">
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices for {contact.name} yet.</p>
              ) : (
                <ul className="divide-y rounded-xl border">
                  {invoices.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setInvoiceId(r.id)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/40"
                      >
                        <div className="min-w-0 flex-1">
                          <Code>{r.id}</Code>
                          <p className="text-xs text-muted-foreground">
                            Issued {fmtDate(r.issueDate)} · due {fmtDate(r.dueDate)}
                          </p>
                        </div>
                        <StatusBadge status={r.status} days={r.daysOverdue || undefined} />
                        <Money amount={r.total} currency={r.currency} className="w-32 text-right" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="statement" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">All activity to {fmtDate(TODAY)}, in GH₵</p>
                <Button variant="outline" onClick={() => toast(`Statement for ${contact.name} is mocked in the prototype`)}>
                  <Download />
                  Download statement
                </Button>
              </div>
              {statement.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing on the statement yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                        <th className="h-9 px-3 text-left font-medium">Date</th>
                        <th className="h-9 px-3 text-left font-medium">Details</th>
                        <th className="h-9 px-3 text-right font-medium">Invoiced</th>
                        <th className="h-9 px-3 text-right font-medium">Paid</th>
                        <th className="h-9 px-3 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.map((l) => (
                        <tr key={l.ref} className="border-b last:border-b-0">
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{fmtDate(l.date)}</td>
                          <td className="px-3 py-2">
                            <Code>{l.ref}</Code>
                            <p className="text-xs text-muted-foreground">{l.text}</p>
                          </td>
                          <td className="px-3 py-2 text-right">{l.charge ? <Money amount={l.charge} hideSymbol size="sm" /> : null}</td>
                          <td className="px-3 py-2 text-right">{l.payment ? <Money amount={l.payment} hideSymbol size="sm" /> : null}</td>
                          <td className="px-3 py-2 text-right"><Money amount={l.balance} hideSymbol size="sm" /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/50 font-medium">
                        <td colSpan={4} className="px-3 py-2 text-[13px]">Balance owed on {fmtDate(TODAY)}</td>
                        <td className="px-3 py-2 text-right"><Money amount={statement[statement.length - 1].balance} size="sm" /></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </EntityDrawer>
      <InvoiceDrawer invoiceId={invoiceId} onClose={() => setInvoiceId(null)} />
    </>
  )
}
