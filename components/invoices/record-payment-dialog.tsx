"use client"

import * as React from "react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { TODAY } from "@/lib/dates"
import { currencySymbol } from "@/lib/money"
import { invoiceRows, useSelect } from "@/lib/selectors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AccountPicker } from "@/components/patterns/pickers"
import { Field, SubmitReason } from "@/components/patterns/form-bits"
import { Money } from "@/components/patterns/money"

/** Small "Record payment" form for one invoice, used by the drawer and the editor's success state. */
export function RecordPaymentDialog({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  const row = useSelect(invoiceRows).find((r) => r.id === invoiceId)
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* Keyed so each invoice starts with its own balance. */}
        {row && <PaymentForm key={row.id} invoiceId={row.id} balance={row.balance} currency={row.currency} customer={row.contact.name} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function PaymentForm({
  invoiceId,
  balance,
  currency,
  customer,
  onClose,
}: {
  invoiceId: string
  balance: number
  currency: Parameters<typeof currencySymbol>[0]
  customer: string
  onClose: () => void
}) {
  const recordInvoicePayment = useLedger((s) => s.recordInvoicePayment)
  const userId = usePrefs((s) => s.userId)
  const [amount, setAmount] = React.useState(String(balance))
  const [date, setDate] = React.useState(TODAY)
  // Dollar invoices are usually paid into the dollar account.
  const [accountCode, setAccountCode] = React.useState(currency === "USD" ? "1025" : "1010")
  const value = Number(amount)
  const reason = !(value > 0)
    ? "Enter an amount"
    : value > balance + 0.005
      ? "That's more than is still due"
      : !date
        ? "Choose a date"
        : null

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">Record payment</DialogTitle>
        <DialogDescription>
          {customer} · {invoiceId} · <Money amount={balance} currency={currency} size="sm" /> still due
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <Field label={`Amount received (${currencySymbol(currency)})`} htmlFor="rp-amount">
          <Input
            id="rp-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="bg-card text-right tabular"
            autoFocus
          />
        </Field>
        <Field label="Date received" htmlFor="rp-date">
          <Input id="rp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-card" />
        </Field>
        <Field label="Paid into">
          <AccountPicker value={accountCode} onChange={setAccountCode} filter={(a) => !!a.bank} />
        </Field>
      </div>
      <DialogFooter className="items-center gap-3 sm:justify-between">
        <SubmitReason reason={reason} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!!reason}
            onClick={() => {
              const p = recordInvoicePayment(invoiceId, { amount: value, date, accountCode }, userId)
              toast.success("Payment recorded", { description: `${p.id} applied to ${invoiceId}.` })
              onClose()
            }}
          >
            Record payment
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}
