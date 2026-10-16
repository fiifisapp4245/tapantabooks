"use client"

import * as React from "react"
import { X } from "lucide-react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { CURRENCIES, type Currency } from "@/lib/constants"
import type { AccountType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AccountPicker } from "@/components/patterns/pickers"
import { Field, SubmitReason, useDiscardGuard } from "@/components/patterns/form-bits"
import { ACCOUNT_TYPES, categoriesFor, normalFor, suggestCode, typeInfo } from "./account-types"

const EMPTY = { type: "" as AccountType | "", category: "", code: "", name: "", currency: "GHS" as Currency, parent: "", description: "" }

/** New account: Type first, then everything else follows from it. */
export function NewAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { accounts, addAccount } = useLedger()
  const [f, setF] = React.useState(EMPTY)
  // Code follows the suggestion until someone types their own.
  const [codeEdited, setCodeEdited] = React.useState(false)
  const dirty = JSON.stringify(f) !== JSON.stringify(EMPTY)
  const guard = useDiscardGuard(dirty, onClose)

  const info = f.type ? typeInfo(f.type) : undefined
  const suggested = f.type ? suggestCode(f.type, f.category || undefined, accounts) : ""
  const code = codeEdited ? f.code : suggested
  const clash = accounts.find((a) => a.code === code)
  const n = Number(code)

  const reason = !f.type
    ? "Choose a type"
    : !f.category
      ? "Choose a report category"
      : !/^\d{4}$/.test(code)
        ? "Enter a 4-digit code"
        : clash
          ? `${code} is already used by ${clash.name}`
          : info && (n < info.range[0] || n > info.range[1])
            ? `${info.plural} use codes ${info.range[0]}–${info.range[1]}`
            : !f.name.trim()
              ? "Enter a name"
              : null

  const submit = () => {
    if (!f.type) return
    addAccount({
      code,
      name: f.name.trim(),
      type: f.type,
      category: f.category,
      description: f.description.trim(),
      normal: normalFor(f.type),
      currency: f.currency,
      active: true,
      parent: f.parent || undefined,
    })
    toast.success("Account added", { description: `${code} ${f.name.trim()} is ready to use.` })
    onClose()
  }

  const normal = f.type ? normalFor(f.type) : undefined

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && guard.request()}>
        <DialogContent className="max-h-[92vh] gap-5 overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">New account</DialogTitle>
            <DialogDescription>Start with the type. The category, code and normal balance follow from it.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" hint={info?.hint}>
              <Select
                value={f.type}
                onValueChange={(v) => {
                  setF((x) => ({ ...x, type: v as AccountType, category: "", parent: "" }))
                  setCodeEdited(false)
                }}
              >
                <SelectTrigger className="w-full bg-card" autoFocus>
                  <SelectValue placeholder="Choose a type" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Report category" hint={f.type ? "Where it shows up in your reports" : "Pick a type first"}>
              <Select value={f.category} onValueChange={(v) => setF((x) => ({ ...x, category: v }))} disabled={!f.type}>
                <SelectTrigger className="w-full bg-card">
                  <SelectValue placeholder={f.type ? "Choose a category" : "—"} />
                </SelectTrigger>
                <SelectContent>
                  {f.type &&
                    categoriesFor(f.type, accounts).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Code" htmlFor="na-code" hint={info ? (codeEdited ? `${info.plural} use ${info.range[0]}–${info.range[1]}` : "Suggested: the next free code") : undefined}>
              <Input
                id="na-code"
                inputMode="numeric"
                value={code}
                disabled={!f.type}
                onChange={(e) => {
                  setCodeEdited(true)
                  setF((x) => ({ ...x, code: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                }}
                placeholder="0000"
                className="bg-card font-mono tabular"
              />
            </Field>
            <Field label="Name" htmlFor="na-name">
              <Input id="na-name" value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} placeholder={info?.placeholder ?? "Choose a type first"} className="bg-card" />
            </Field>
            <Field label="Normal balance" htmlFor="na-normal" hint="Set by the type">
              <Input
                id="na-normal"
                readOnly
                tabIndex={-1}
                value={normal ? (normal === "debit" ? "Debit – grows with debits" : "Credit – grows with credits") : "—"}
                className="bg-muted text-muted-foreground"
              />
            </Field>
            <Field label="Currency">
              <Select value={f.currency} onValueChange={(v) => setF((x) => ({ ...x, currency: v as Currency }))}>
                <SelectTrigger className="w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === "GHS" ? "GHS – Ghana cedi" : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Parent account (optional)" hint="Nest it under another account in reports" className="sm:col-span-2">
              <div className="flex gap-2">
                <AccountPicker value={f.parent} onChange={(v) => setF((x) => ({ ...x, parent: v }))} types={f.type ? [f.type] : undefined} placeholder="No parent" />
                {f.parent && (
                  <Button variant="outline" size="icon" aria-label="Remove parent account" onClick={() => setF((x) => ({ ...x, parent: "" }))}>
                    <X />
                  </Button>
                )}
              </div>
            </Field>
            <Field label="Description" htmlFor="na-desc" hint="Shown under the name, so everyone knows what goes here" className="sm:col-span-2">
              <Textarea id="na-desc" value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} placeholder="What goes in this account, in plain words" className="min-h-16 bg-card" />
            </Field>
          </div>
          <DialogFooter className="items-center gap-3 sm:justify-between">
            <SubmitReason reason={reason} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={guard.request}>Cancel</Button>
              <Button disabled={!!reason} onClick={submit}>Add account</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {guard.dialog}
    </>
  )
}
