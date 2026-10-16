"use client"

import * as React from "react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { TODAY } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import type { Bill, Journal, JournalLine, Payment } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AccountPicker } from "@/components/patterns/pickers"
import { Field, SubmitReason, useDiscardGuard } from "@/components/patterns/form-bits"
import { JournalLines } from "@/components/patterns/journal-lines"
import { auditEvent, nextId, nextJournalId, r2 } from "./shared"

/**
 * Pay a bill: Dr What you owe (2000) / Cr the bank, cash or MoMo account.
 * The store has no bill-payment action, so this writes the payment and its
 * journal itself, shaped exactly like the seeded ones.
 */
export function BillPaymentDialog({ bill, balance, open, onClose }: { bill: Bill; balance: number; open: boolean; onClose: () => void }) {
  const accounts = useLedger((s) => s.accounts)
  const userId = usePrefs((s) => s.userId)
  const initial = React.useMemo(() => ({ amount: balance.toFixed(2), date: TODAY, accountCode: "1010" }), [balance])
  const [f, setF] = React.useState(initial)
  const dirty = JSON.stringify(f) !== JSON.stringify(initial)
  const guard = useDiscardGuard(dirty, onClose)
  const amount = Number(f.amount)
  const reason =
    !(amount > 0)
      ? "Enter an amount"
      : amount > balance + 0.005
        ? `That's more than the ${formatMoney(balance, bill.currency)} still owed`
        : !f.accountCode
          ? "Choose where it was paid from"
          : !f.date
            ? "Choose a date"
            : null
  const base = r2((amount || 0) * bill.rate)
  const name = (c: string) => accounts.find((a) => a.code === c)?.name ?? c
  const lines: JournalLine[] = [
    { accountCode: "2000", description: bill.id, debit: base, credit: 0 },
    { accountCode: f.accountCode, debit: 0, credit: base },
  ]

  const submit = () => {
    const s = useLedger.getState()
    const supplier = s.contacts.find((c) => c.id === bill.contactId)?.name ?? "supplier"
    const id = nextId("PAY-", s.payments.filter((p) => p.direction === "out").map((p) => p.id))
    const j: Journal = {
      id: nextJournalId(s.journals.map((x) => x.id)),
      date: f.date,
      memo: `Payment to ${supplier} for ${bill.id}`,
      reference: id,
      source: "purchases",
      sourceDocId: id,
      status: "posted",
      branch: bill.branch,
      lines,
      createdBy: userId,
      createdAt: TODAY,
    }
    const p: Payment = {
      id,
      direction: "out",
      date: f.date,
      contactId: bill.contactId,
      docId: bill.id,
      accountCode: f.accountCode,
      amount: r2(amount),
      currency: bill.currency,
      rate: bill.rate,
      method: f.accountCode === "1030" ? "MTN MoMo" : f.accountCode === "1000" ? "Cash" : "Bank transfer",
      branch: bill.branch,
      memo: `Payment for ${bill.id}`,
      journalId: j.id,
    }
    useLedger.setState((st) => ({
      payments: [...st.payments, p],
      journals: [...st.journals, j],
      audit: [auditEvent(st.audit, userId, `Recorded payment ${id} on ${bill.id}`, "payment.record", id, `${bill.currency} ${amount.toFixed(2)}`), ...st.audit],
    }))
    toast.success(`Payment ${id} recorded`, { description: `${formatMoney(amount, bill.currency)} paid to ${supplier}.` })
    onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && guard.request()}>
        <DialogContent className="gap-5 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Record payment</DialogTitle>
            <DialogDescription>
              Money out for {bill.id}. {formatMoney(balance, bill.currency)} is still owed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Amount (${bill.currency === "GHS" ? "GH₵" : bill.currency})`} htmlFor="bp-amount">
              <Input id="bp-amount" inputMode="decimal" autoFocus value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^0-9.]/g, "") })} className="bg-card text-right tabular" />
            </Field>
            <Field label="Date" htmlFor="bp-date">
              <Input id="bp-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="bg-card" />
            </Field>
            <Field label="Paid from" className="sm:col-span-2">
              <AccountPicker value={f.accountCode} onChange={(v) => setF({ ...f, accountCode: v })} filter={(a) => !!a.bank} />
            </Field>
          </div>
          <JournalLines lines={lines.map((l) => ({ ...l, accountName: name(l.accountCode) }))} />
          <DialogFooter className="items-center gap-3 sm:justify-between">
            <SubmitReason reason={reason} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={guard.request}>Cancel</Button>
              <Button disabled={!!reason} onClick={submit}>Record payment</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {guard.dialog}
    </>
  )
}
