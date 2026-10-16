"use client"

import * as React from "react"
import { ChevronRight, Paperclip } from "lucide-react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { BRANCHES } from "@/lib/constants"
import { TODAY } from "@/lib/dates"
import type { BranchId, TaxCode } from "@/lib/types"
import { TAX_LABELS, TAX_RATES } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AccountPicker, ContactPicker } from "@/components/patterns/pickers"
import { Field, SubmitReason, useDiscardGuard } from "@/components/patterns/form-bits"
import { JournalLines } from "@/components/patterns/journal-lines"

export const COST_CENTRES = ["Retail", "Wholesale", "Distribution", "Admin"]

export type MoneyPrefill = {
  direction?: "in" | "out"
  amount?: number
  date?: string
  accountCode?: string
  categoryCode?: string
  memo?: string
  bankLineId?: string
}

/**
 * Record money that has no invoice or bill. Opens from + New, ⌘K, and
 * prefilled from a bank line on Reconcile.
 */
export function MoneyDialog({ open, onClose, prefill }: { open: boolean; onClose: () => void; prefill?: MoneyPrefill }) {
  const { accounts, recordMoney } = useLedger()
  const userId = usePrefs((s) => s.userId)
  const initial = React.useMemo(
    () => ({
      direction: prefill?.direction ?? "in",
      amount: prefill?.amount ? String(prefill.amount) : "",
      date: prefill?.date ?? TODAY,
      accountCode: prefill?.accountCode ?? "1010",
      categoryCode: prefill?.categoryCode ?? "",
      contactId: undefined as string | undefined,
      taxCode: "EXEMPT" as TaxCode,
      branch: "adum" as BranchId,
      costCentre: "Admin",
      memo: prefill?.memo ?? "",
    }),
    [prefill]
  )
  // Fresh state each time: FormHost remounts the dialog with a new key.
  const [f, setF] = React.useState(initial)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  const dirty = JSON.stringify(f) !== JSON.stringify(initial)
  const guard = useDiscardGuard(dirty, onClose)
  const amount = Number(f.amount)
  const reason = !(amount > 0) ? "Enter an amount" : !f.categoryCode ? "Choose what it was for" : !f.accountCode ? "Choose an account" : null

  const net = TAX_RATES[f.taxCode] ? amount / (1 + TAX_RATES[f.taxCode]) : amount
  const tax = amount - net
  const name = (c: string) => accounts.find((a) => a.code === c)?.name ?? "—"
  const preview =
    f.direction === "in"
      ? [
          { accountCode: f.accountCode, accountName: name(f.accountCode), debit: amount || 0, credit: 0 },
          { accountCode: f.categoryCode || "—", accountName: f.categoryCode ? name(f.categoryCode) : "What it was for", debit: 0, credit: net || 0 },
          ...(tax ? [{ accountCode: "2100", accountName: name("2100"), debit: 0, credit: tax }] : []),
        ]
      : [
          { accountCode: f.categoryCode || "—", accountName: f.categoryCode ? name(f.categoryCode) : "What it was for", debit: net || 0, credit: 0 },
          ...(tax ? [{ accountCode: "1300", accountName: name("1300"), debit: tax, credit: 0 }] : []),
          { accountCode: f.accountCode, accountName: name(f.accountCode), debit: 0, credit: amount || 0 },
        ]

  const submit = () => {
    const p = recordMoney({ ...f, direction: f.direction as "in" | "out", amount, bankLineId: prefill?.bankLineId }, userId)
    toast.success(`${f.direction === "in" ? "Money in" : "Money out"} recorded`, { description: `${p.id} posted to the books.` })
    onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && guard.request()}>
        <DialogContent className="max-h-[92vh] gap-5 overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Record money {f.direction}</DialogTitle>
            <DialogDescription>For money that didn&apos;t come from an invoice or go to a bill.</DialogDescription>
          </DialogHeader>
          <Tabs value={f.direction} onValueChange={(v) => setF((x) => ({ ...x, direction: v as "in" | "out", categoryCode: "", taxCode: "EXEMPT" }))}>
            <TabsList className="h-9 w-full">
              <TabsTrigger value="in" className="data-[state=active]:bg-card">Money in</TabsTrigger>
              <TabsTrigger value="out" className="data-[state=active]:bg-card">Money out</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (GH₵)" htmlFor="m-amount">
              <Input id="m-amount" inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" className="bg-card text-right tabular" autoFocus />
            </Field>
            <Field label="Date" htmlFor="m-date">
              <Input id="m-date" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className="bg-card" />
            </Field>
            <Field label={f.direction === "in" ? "Paid into" : "Paid from"}>
              <AccountPicker value={f.accountCode} onChange={(v) => set("accountCode", v)} filter={(a) => !!a.bank} />
            </Field>
            <Field label="What was it for?" hint={f.direction === "in" ? "Income, or another account like a loan received" : "The cost, or something you bought"}>
              <AccountPicker
                value={f.categoryCode}
                onChange={(v) => set("categoryCode", v)}
                types={f.direction === "in" ? ["income", "liability", "equity", "asset"] : ["expense", "cost_of_sales", "asset", "liability"]}
                filter={(a) => !a.bank && a.code !== "1100" && a.code !== "2000"}
                placeholder="e.g. Interest received – bank"
              />
            </Field>
            <Field label="Contact (optional)">
              <ContactPicker kind="any" value={f.contactId} onChange={(v) => set("contactId", v)} allowNone placeholder="No contact" />
            </Field>
            <Field label="Tax">
              <Select value={f.taxCode} onValueChange={(v) => set("taxCode", v as TaxCode)}>
                <SelectTrigger className="w-full bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TAX_LABELS) as TaxCode[]).map((t) => <SelectItem key={t} value={t}>{TAX_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Branch">
              <Select value={f.branch} onValueChange={(v) => set("branch", v as BranchId)}>
                <SelectTrigger className="w-full bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BRANCHES.slice(1).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cost centre">
              <Select value={f.costCentre} onValueChange={(v) => set("costCentre", v)}>
                <SelectTrigger className="w-full bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COST_CENTRES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Memo" htmlFor="m-memo" className="sm:col-span-2">
              <Textarea id="m-memo" value={f.memo} onChange={(e) => set("memo", e.target.value)} placeholder="What happened, in a few words" className="min-h-16 bg-card" />
            </Field>
            <Button variant="outline" className="w-fit border-dashed bg-card text-muted-foreground" onClick={() => toast("Attachments are mocked in the prototype")}>
              <Paperclip />
              Attach receipt
            </Button>
          </div>
          <Collapsible className="group/wp rounded-xl border">
            <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium">
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-[state=open]/wp:rotate-90" />
              What this posts
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <JournalLines lines={preview} />
            </CollapsibleContent>
          </Collapsible>
          <DialogFooter className="items-center gap-3 sm:justify-between">
            <SubmitReason reason={reason} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={guard.request}>Cancel</Button>
              <Button disabled={!!reason} onClick={submit}>Record</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {guard.dialog}
    </>
  )
}
