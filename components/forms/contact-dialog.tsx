"use client"

import * as React from "react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, SubmitReason, useDiscardGuard } from "@/components/patterns/form-bits"

/** New customer or supplier. */
export function ContactDialog({
  open,
  onClose,
  kind,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  kind: "customer" | "supplier"
  onCreated?: (id: string) => void
}) {
  const addContact = useLedger((s) => s.addContact)
  const empty = { name: "", email: "", phone: "", city: "", tin: "", termsDays: "30" }
  const [f, setF] = React.useState(empty)
  const dirty = Object.entries(f).some(([k, v]) => v !== (empty as Record<string, string>)[k])
  const guard = useDiscardGuard(dirty, onClose)
  const reason = !f.name.trim() ? "Enter a name" : f.email && !/^\S+@\S+\.\S+$/.test(f.email) ? "Check the email address" : null
  const label = kind === "customer" ? "customer" : "supplier"
  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && guard.request()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">New {label}</DialogTitle>
            <DialogDescription>Only the name is required. You can add the rest later.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="c-name" className="sm:col-span-2">
              <Input id="c-name" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={kind === "customer" ? "e.g. Melcom Ltd" : "e.g. Tema Wholesale Depot"} className="bg-card" />
            </Field>
            <Field label="Email" htmlFor="c-email">
              <Input id="c-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="bg-card" />
            </Field>
            <Field label="Phone" htmlFor="c-phone">
              <Input id="c-phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+233" className="bg-card" />
            </Field>
            <Field label="City" htmlFor="c-city">
              <Input id="c-city" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className="bg-card" />
            </Field>
            <Field label="TIN" htmlFor="c-tin">
              <Input id="c-tin" value={f.tin} onChange={(e) => setF({ ...f, tin: e.target.value })} className="bg-card" />
            </Field>
            <Field label="Payment terms (days)" htmlFor="c-terms">
              <Input id="c-terms" inputMode="numeric" value={f.termsDays} onChange={(e) => setF({ ...f, termsDays: e.target.value.replace(/\D/g, "") })} className="bg-card" />
            </Field>
          </div>
          <DialogFooter className="items-center gap-3 sm:justify-between">
            <SubmitReason reason={reason} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={guard.request}>Cancel</Button>
              <Button
                disabled={!!reason}
                onClick={() => {
                  const c = addContact({ kind, name: f.name.trim(), email: f.email, phone: f.phone, city: f.city, tin: f.tin, termsDays: Number(f.termsDays) || 30, currency: "GHS" })
                  toast.success(`${c.name} added`)
                  onCreated?.(c.id)
                  onClose()
                }}
              >
                Save {label}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {guard.dialog}
    </>
  )
}
