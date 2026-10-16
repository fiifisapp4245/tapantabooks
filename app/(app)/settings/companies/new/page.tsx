"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageBody } from "@/components/patterns/list-page"
import { Field, SubmitReason } from "@/components/patterns/form-bits"
import { LogoField } from "@/components/invoices/editor/fields"

export default function Page() {
  return (
    <React.Suspense>
      <NewCompany />
    </React.Suspense>
  )
}

/**
 * Add a company. Opened from the invoice editor with ?returnTo=…, it saves
 * and goes straight back there with the new company selected.
 */
function NewCompany() {
  const params = useSearchParams()
  const router = useRouter()
  const addCompany = useLedger((s) => s.addCompany)
  const returnTo = params.get("returnTo")
  // Only follow links inside the app.
  const back = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/settings/companies"
  const [f, setF] = React.useState({ name: params.get("name") ?? "", email: "", otherEmails: "", phone: "", address: "", taxId: "", logoUrl: undefined as string | undefined })
  const set = (k: keyof typeof f, v: string | undefined) => setF((x) => ({ ...x, [k]: v }))
  const emailOk = (e: string) => /^\S+@\S+\.\S+$/.test(e)
  const extra = f.otherEmails.split(/[,\s]+/).filter(Boolean)
  const reason = !f.name.trim() ? "Enter the company name" : !emailOk(f.email) ? "Enter a valid email" : extra.some((e) => !emailOk(e)) ? "Check the other sender emails" : null

  const save = () => {
    const c = addCompany({
      name: f.name.trim(),
      email: f.email.trim(),
      emails: [f.email.trim(), ...extra],
      phone: f.phone.trim() || undefined,
      address: f.address.trim() || undefined,
      taxId: f.taxId.trim() || undefined,
      logoUrl: f.logoUrl,
    })
    if (returnTo) router.push(`${back}${back.includes("?") ? "&" : "?"}company=${c.id}`)
    else {
      toast.success(`${c.name} added`)
      router.push(back)
    }
  }

  return (
    <PageBody className="max-w-2xl">
      <div className="space-y-1">
        <Button variant="ghost" asChild className="-ml-2 px-2 text-muted-foreground">
          <Link href={back}>
            <ArrowLeft />
            {returnTo ? "Back to invoice" : "Companies"}
          </Link>
        </Button>
        <h1 className="text-[26px] leading-8 font-semibold">Add company</h1>
        <p className="text-sm text-muted-foreground">
          {returnTo ? "Once it's saved, you'll go straight back to your invoice with this company selected." : "A company you invoice from."}
        </p>
      </div>
      <form
        className="flex flex-col gap-5 rounded-xl border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (!reason) save()
        }}
      >
        <Field label="Company name" htmlFor="co-name">
          <Input id="co-name" autoFocus value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. KT Logistics Ltd" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" htmlFor="co-email" hint="Invoices are sent from this address">
            <Input id="co-email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="accounts@company.com.gh" />
          </Field>
          <Field label="Phone" htmlFor="co-phone">
            <Input id="co-phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+233" />
          </Field>
        </div>
        <Field label="Other sender emails (optional)" htmlFor="co-emails" hint="Separate with commas">
          <Input id="co-emails" value={f.otherEmails} onChange={(e) => set("otherEmails", e.target.value)} placeholder="billing@company.com.gh" />
        </Field>
        <Field label="Address" htmlFor="co-address">
          <Input id="co-address" value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, city" />
        </Field>
        <Field label="Tax ID" htmlFor="co-tin">
          <Input id="co-tin" value={f.taxId} onChange={(e) => set("taxId", e.target.value)} placeholder="TIN" />
        </Field>
        <Field label="Logo" htmlFor="co-logo">
          <LogoField id="co-logo" value={f.logoUrl} onChange={(v) => set("logoUrl", v)} />
        </Field>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-5">
          <SubmitReason reason={reason} />
          <Button variant="outline" asChild>
            <Link href={back}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={!!reason}>
            {returnTo ? "Save and go back" : "Save company"}
          </Button>
        </div>
      </form>
    </PageBody>
  )
}
