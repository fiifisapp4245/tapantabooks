"use client"

import * as React from "react"
import { ChevronRight, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { BRANCHES } from "@/lib/constants"
import { addDays, fmtDate, TODAY } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { billJournalLines } from "@/lib/mock/seed"
import type { Bill, BranchId, DocLine, Journal, TaxCode } from "@/lib/types"
import { TAX_LABELS, TAX_RATES } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AccountPicker, ContactPicker } from "@/components/patterns/pickers"
import { Field, SubmitReason, useDiscardGuard } from "@/components/patterns/form-bits"
import { JournalLines } from "@/components/patterns/journal-lines"
import { Money } from "@/components/patterns/money"
import { ContactDialog } from "@/components/forms/contact-dialog"
import { auditEvent, nextId, nextJournalId, r2 } from "./shared"

type LineDraft = { key: number; description: string; accountCode: string; amount: string; taxCode: TaxCode }

const blankLine = (key: number): LineDraft => ({ key, description: "", accountCode: "", amount: "", taxCode: "GH-STD" })

/** A supplier's bill: who, when, what for, and what it posts to the books. */
export function BillDialog({ open, onClose, prefill }: { open: boolean; onClose: () => void; prefill?: Record<string, unknown> }) {
  const accounts = useLedger((s) => s.accounts)
  const contacts = useLedger((s) => s.contacts)
  const bills = useLedger((s) => s.bills)
  const userId = usePrefs((s) => s.userId)

  const initial = React.useMemo(() => {
    const contactId = typeof prefill?.contactId === "string" ? prefill.contactId : undefined
    const terms = contacts.find((c) => c.id === contactId)?.termsDays ?? 30
    return {
      contactId,
      issueDate: TODAY,
      dueDate: addDays(TODAY, terms),
      reference: "",
      branch: "adum" as BranchId,
      lines: [blankLine(1)],
    }
    // Only on mount: FormHost remounts the dialog for each open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [f, setF] = React.useState(initial)
  const [adding, setAdding] = React.useState(false)
  const [contactKey, setContactKey] = React.useState(0)
  const dirty = JSON.stringify(f) !== JSON.stringify(initial)
  const guard = useDiscardGuard(dirty, onClose)

  const setLine = (key: number, patch: Partial<LineDraft>) => setF((x) => ({ ...x, lines: x.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }))
  const addLine = () => setF((x) => ({ ...x, lines: [...x.lines, blankLine(Math.max(0, ...x.lines.map((l) => l.key)) + 1)] }))
  const removeLine = (key: number) => setF((x) => ({ ...x, lines: x.lines.filter((l) => l.key !== key) }))

  const pickSupplier = (id: string | undefined) => {
    // Read the store directly: a supplier created a moment ago isn't in this render's list yet.
    const terms = useLedger.getState().contacts.find((c) => c.id === id)?.termsDays
    setF((x) => ({ ...x, contactId: id, dueDate: terms != null ? addDays(x.issueDate, terms) : x.dueDate }))
  }

  const filled = f.lines.filter((l) => l.description.trim() || l.accountCode || Number(l.amount) > 0)
  const docLines: DocLine[] = filled
    .filter((l) => l.accountCode && Number(l.amount) > 0)
    .map((l) => ({ description: l.description.trim(), qty: 1, unitPrice: r2(Number(l.amount)), discount: 0, taxCode: l.taxCode, accountCode: l.accountCode }))
  const subtotal = r2(docLines.reduce((t, l) => t + l.unitPrice, 0))
  const tax = r2(docLines.reduce((t, l) => t + r2(l.unitPrice * TAX_RATES[l.taxCode]), 0))
  const total = r2(subtotal + tax)

  const lockDate = useLedger((s) => s.settings.periodLockDate)
  const reason = !f.contactId
    ? "Choose a supplier"
    : !f.issueDate
      ? "Enter the bill date"
      : f.issueDate <= lockDate
        ? `${fmtDate(lockDate)} and earlier are locked`
        : !f.dueDate || f.dueDate < f.issueDate
          ? "Due date can't be before the bill date"
          : filled.some((l) => !l.accountCode)
            ? "Choose an account on every line"
            : filled.some((l) => !(Number(l.amount) > 0))
              ? "Enter an amount on every line"
              : docLines.length === 0
                ? "Add at least one line"
                : null
  const draftReason = !f.contactId ? "Choose a supplier" : null

  const newId = nextId("BILL-", bills.map((b) => b.id))
  const preview = billJournalLines({ lines: docLines, rate: 1, id: newId })
  const accountName = (code: string) => accounts.find((a) => a.code === code)?.name ?? code

  const save = (mode: "draft" | "post") => {
    const s = useLedger.getState()
    const id = nextId("BILL-", s.bills.map((b) => b.id))
    const name = s.contacts.find((c) => c.id === f.contactId)?.name ?? ""
    const bill: Bill = {
      kind: "bill",
      id,
      contactId: f.contactId!,
      issueDate: f.issueDate,
      dueDate: f.dueDate,
      currency: "GHS",
      rate: 1,
      branch: f.branch,
      reference: f.reference.trim() || undefined,
      lines: docLines,
      status: mode === "draft" ? "draft" : "posted",
      subtotal,
      tax,
      total,
      createdBy: userId,
    }
    let journal: Journal | undefined
    if (mode === "post") {
      journal = {
        id: nextJournalId(s.journals.map((j) => j.id)),
        date: f.issueDate,
        memo: `Bill ${id} – ${name}`,
        reference: id,
        source: "purchases",
        sourceDocId: id,
        status: "posted",
        branch: f.branch,
        lines: billJournalLines(bill),
        createdBy: userId,
        createdAt: TODAY,
        approvedBy: userId,
      }
      bill.journalId = journal.id
    }
    useLedger.setState((st) => ({
      bills: [...st.bills, bill],
      journals: journal ? [...st.journals, journal] : st.journals,
      audit: [
        auditEvent(st.audit, userId, mode === "draft" ? `Saved draft bill ${id}` : `Posted bill ${id}`, mode === "draft" ? "bill.draft" : "bill.post", id, `GHS ${total.toFixed(2)}`),
        ...st.audit,
      ],
    }))
    toast.success(mode === "draft" ? `Draft ${id} saved` : `Bill ${id} posted`, {
      description: mode === "draft" ? `${name} · nothing posted to the books yet.` : `${formatMoney(total)} added to what you owe ${name}.`,
    })
    onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && guard.request()}>
        <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="font-heading text-xl">New bill</DialogTitle>
            <DialogDescription>A bill a supplier sent you. Posting it adds to what you owe them.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Supplier" className="lg:col-span-2">
                <ContactPicker kind="supplier" value={f.contactId} onChange={pickSupplier} onCreate={() => setAdding(true)} />
              </Field>
              <Field label="Supplier reference" htmlFor="b-ref" hint="The number on their bill">
                <Input id="b-ref" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="e.g. TWD-88213" className="bg-card" />
              </Field>
              <Field label="Bill date" htmlFor="b-date">
                <Input
                  id="b-date"
                  type="date"
                  value={f.issueDate}
                  onChange={(e) => {
                    const terms = contacts.find((c) => c.id === f.contactId)?.termsDays ?? 30
                    setF({ ...f, issueDate: e.target.value, dueDate: e.target.value ? addDays(e.target.value, terms) : f.dueDate })
                  }}
                  className="bg-card"
                />
              </Field>
              <Field label="Due date" htmlFor="b-due">
                <Input id="b-due" type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} className="bg-card" />
              </Field>
              <Field label="Branch">
                <Select value={f.branch} onValueChange={(v) => setF({ ...f, branch: v as BranchId })}>
                  <SelectTrigger className="w-full bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BRANCHES.slice(1).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="space-y-2">
              <h3 className="text-[13px] font-medium">What the bill is for</h3>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                      <th className="h-9 px-3 text-left font-medium">Description</th>
                      <th className="h-9 w-[240px] px-3 text-left font-medium">Account</th>
                      <th className="h-9 w-[130px] px-3 text-right font-medium">Amount (GH₵)</th>
                      <th className="h-9 w-[170px] px-3 text-left font-medium">Tax</th>
                      <th className="h-9 w-11" aria-label="Remove" />
                    </tr>
                  </thead>
                  <tbody>
                    {f.lines.map((l, i) => (
                      <tr key={l.key} className="border-b last:border-b-0">
                        <td className="px-2 py-2">
                          <Input aria-label={`Line ${i + 1} description`} value={l.description} onChange={(e) => setLine(l.key, { description: e.target.value })} placeholder="e.g. 50 bags of rice" className="bg-card" />
                        </td>
                        <td className="px-2 py-2">
                          <AccountPicker value={l.accountCode} onChange={(v) => setLine(l.key, { accountCode: v })} types={["expense", "cost_of_sales", "asset"]} filter={(a) => !a.bank && a.code !== "1100" && a.code !== "1300"} placeholder="Choose" />
                        </td>
                        <td className="px-2 py-2">
                          <Input aria-label={`Line ${i + 1} amount`} inputMode="decimal" value={l.amount} onChange={(e) => setLine(l.key, { amount: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="0.00" className="bg-card text-right tabular" />
                        </td>
                        <td className="px-2 py-2">
                          <Select value={l.taxCode} onValueChange={(v) => setLine(l.key, { taxCode: v as TaxCode })}>
                            <SelectTrigger className="w-full bg-card" aria-label={`Line ${i + 1} tax`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.keys(TAX_LABELS) as TaxCode[]).map((t) => <SelectItem key={t} value={t}>{TAX_LABELS[t]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-1 py-2">
                          <Button variant="ghost" size="icon" aria-label={`Remove line ${i + 1}`} disabled={f.lines.length === 1} onClick={() => removeLine(l.key)}>
                            <Trash2 />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <Button variant="outline" className="bg-card" onClick={addLine}>
                  <Plus />
                  Add line
                </Button>
                <dl className="grid min-w-56 grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Before VAT</dt>
                  <dd className="text-right"><Money amount={subtotal} /></dd>
                  <dt className="text-muted-foreground">VAT</dt>
                  <dd className="text-right"><Money amount={tax} /></dd>
                  <dt className="font-medium">Total</dt>
                  <dd className="text-right"><Money amount={total} size="lg" /></dd>
                </dl>
              </div>
            </div>

            <Collapsible className="group/wp rounded-xl border">
              <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium">
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-[state=open]/wp:rotate-90" />
                What this posts
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 px-4 pb-4">
                {docLines.length ? (
                  <JournalLines lines={preview.map((l) => ({ ...l, accountName: accountName(l.accountCode) }))} />
                ) : (
                  <p className="text-sm text-muted-foreground">Add a line with an account and amount to see the entry.</p>
                )}
                <p className="text-xs text-muted-foreground">Each line is a cost or asset; VAT you can claim back goes to 1300; the total goes to What you owe (2000).</p>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="flex flex-col-reverse gap-3 rounded-b-xl border-t bg-muted/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <SubmitReason reason={reason} />
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={guard.request}>Cancel</Button>
              <Button variant="outline" disabled={!!draftReason} onClick={() => save("draft")}>Save draft</Button>
              <Button disabled={!!reason} onClick={() => save("post")}>Post bill</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {guard.dialog}
      <ContactDialog
        key={contactKey}
        open={adding}
        kind="supplier"
        onClose={() => {
          setAdding(false)
          setContactKey((k) => k + 1)
        }}
        onCreated={(id) => pickSupplier(id)}
      />
    </>
  )
}
