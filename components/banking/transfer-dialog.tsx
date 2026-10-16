"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { fmtDate, TODAY } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { accountBalance } from "@/lib/selectors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AccountPicker } from "@/components/patterns/pickers"
import { Field, SubmitReason, useDiscardGuard } from "@/components/patterns/form-bits"
import { JournalLines } from "@/components/patterns/journal-lines"
import { Money } from "@/components/patterns/money"
import { postJournal } from "@/components/accounting/post-journal"

/** Move money between two of your own accounts (bank, MoMo, cash). */
export function TransferDialog({ fromCode, onClose }: { fromCode: string | null; onClose: () => void }) {
  const open = !!fromCode
  const s = useLedger()
  const userId = usePrefs((p) => p.userId)
  const initial = React.useMemo(() => ({ from: fromCode ?? "", to: "", amount: "", date: TODAY, memo: "" }), [fromCode])
  const [f, setF] = React.useState(initial)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))
  const dirty = JSON.stringify(f) !== JSON.stringify(initial)
  const guard = useDiscardGuard(dirty, onClose)

  const amount = Number(f.amount)
  const name = (c: string) => s.accounts.find((a) => a.code === c)?.name ?? "—"
  const fromAcc = s.accounts.find((a) => a.code === f.from)
  const toAcc = s.accounts.find((a) => a.code === f.to)
  const fromBalance = f.from ? accountBalance(s, f.from) : 0
  const lockDate = s.settings.periodLockDate

  const reason = !f.from
    ? "Choose where the money leaves"
    : !f.to
      ? "Choose where the money goes"
      : f.from === f.to
        ? "Pick two different accounts"
        : fromAcc?.currency !== toAcc?.currency
          ? "Both accounts must be in the same currency"
          : !(amount > 0)
            ? "Enter an amount"
            : !f.date
              ? "Enter a date"
              : f.date <= lockDate
                ? `${fmtDate(f.date)} is in a locked period`
                : null

  const submit = () => {
    const j = postJournal(
      {
        date: f.date,
        memo: f.memo || `Transfer ${name(f.from)} → ${name(f.to)}`,
        reference: `TRF-${f.date.replace(/-/g, "").slice(2)}`,
        source: "banking",
        branch: "adum",
        createdBy: userId,
        lines: [
          { accountCode: f.to, description: `From ${name(f.from)}`, debit: amount, credit: 0 },
          { accountCode: f.from, description: `To ${name(f.to)}`, debit: 0, credit: amount },
        ],
      },
      "Posted transfer"
    )
    toast.success("Transfer recorded", { description: `${j.id}: ${formatMoney(amount)} from ${name(f.from)} to ${name(f.to)}.` })
    onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && guard.request()}>
        <DialogContent className="max-h-[92vh] gap-5 overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Transfer between accounts</DialogTitle>
            <DialogDescription>Moving money between your own accounts. It isn&apos;t income or a cost.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="From" hint={f.from ? <>Balance in Tapanta: <Money amount={fromBalance} size="sm" className="text-muted-foreground" /></> : undefined}>
              <AccountPicker value={f.from} onChange={(v) => set("from", v)} filter={(a) => !!a.bank} />
            </Field>
            <Field label="To">
              <AccountPicker value={f.to} onChange={(v) => set("to", v)} filter={(a) => !!a.bank && a.code !== f.from} placeholder="Choose an account" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount (GH₵)" htmlFor="t-amount">
                <Input id="t-amount" inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" className="bg-card text-right tabular" autoFocus />
              </Field>
              <Field label="Date" htmlFor="t-date">
                <Input id="t-date" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className="bg-card" />
              </Field>
            </div>
            <Field label="Memo" htmlFor="t-memo">
              <Textarea id="t-memo" value={f.memo} onChange={(e) => set("memo", e.target.value)} placeholder="e.g. Float for the Osu shop" className="min-h-16 bg-card" />
            </Field>
          </div>
          <Collapsible className="group/wp rounded-xl border">
            <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium">
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-[state=open]/wp:rotate-90" />
              What this posts
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <JournalLines
                lines={[
                  { accountCode: f.to || "—", accountName: f.to ? name(f.to) : "To account", debit: amount || 0, credit: 0 },
                  { accountCode: f.from || "—", accountName: f.from ? name(f.from) : "From account", debit: 0, credit: amount || 0 },
                ]}
              />
            </CollapsibleContent>
          </Collapsible>
          <DialogFooter className="items-center gap-3 sm:justify-between">
            <SubmitReason reason={reason} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={guard.request}>Cancel</Button>
              <Button disabled={!!reason} onClick={submit}>Transfer</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {guard.dialog}
    </>
  )
}
