"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { formatMoney } from "@/lib/money"
import { Button } from "@/components/ui/button"
import { STEPS, draftFromInvoice, draftTotals, emptyDraft, partyFromCompany, toLedgerInput, useDraft, validateStep, type StepId } from "./editor/draft"
import { useDetailsOpen } from "./editor/fields"
import { AddPayoutView, CompanyStep, CurrencyPicker, CustomerStep, ItemsStep, PaymentStep, TermsStep } from "./editor/steps"
import { PreviewPane } from "./editor/preview"

/*
 * The step-by-step invoice editor, as its own page.
 *   /invoices/new?step=company           a new invoice
 *   /invoices/new?draft=INV-0044&step=…  after the first autosave (same page, so typing isn't interrupted)
 *   /invoices/edit?id=INV-0043&step=items an existing draft
 * The step lives in the URL, so a reload comes back to the same place.
 */

const nextInvoiceId = (ids: string[]) => {
  const max = ids.reduce((m, id) => Math.max(m, Number(id.replace(/\D/g, "")) || 0), 0)
  return `INV-${String(max + 1).padStart(4, "0")}`
}

/** Sends openForm("invoice") (from + New, ⌘K, Home…) to the editor page. */
export function InvoiceEditorHost() {
  const form = usePrefs((s) => s.form)
  const closeForm = usePrefs((s) => s.closeForm)
  const router = useRouter()
  React.useEffect(() => {
    if (form?.kind !== "invoice") return
    const id = form.prefill?.id as string | undefined
    const customer = form.prefill?.contactId as string | undefined
    closeForm()
    router.push(id ? `/invoices/edit?id=${id}&step=items` : `/invoices/new?step=${customer ? "items" : "company"}${customer ? `&customer=${customer}` : ""}`)
  }, [form, closeForm, router])
  return null
}

export function InvoiceEditorPage({ mode = "new" }: { mode?: "new" | "edit" }) {
  return (
    <React.Suspense>
      <Editor mode={mode} />
    </React.Suspense>
  )
}

function Editor({ mode }: { mode: "new" | "edit" }) {
  const params = useSearchParams()
  const invoiceId = mode === "edit" ? (params.get("id") ?? undefined) : undefined
  const router = useRouter()
  const pathname = usePathname()
  const stepParam = params.get("step") as StepId | null
  const step: StepId = STEPS.some((s) => s.id === stepParam) ? stepParam! : "company"
  // The draft this page edits: from the route, or set by autosave on /invoices/new.
  const target = invoiceId ?? params.get("draft") ?? "new"

  const invoices = useLedger((s) => s.invoices)
  const userId = usePrefs((s) => s.userId)
  const { draft, version, savedVersion, load, setErrors, markSaved } = useDraft()
  const [addingPayout, setAddingPayout] = React.useState(false)
  const [mobileView, setMobileView] = React.useState<"edit" | "preview">("edit")
  const bodyRef = React.useRef<HTMLDivElement>(null)

  const setParams = React.useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(next)) {
        if (v === null) sp.delete(k)
        else sp.set(k, v)
      }
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false })
    },
    [params, pathname, router]
  )

  /* ---------- load once per draft ---------- */

  const loadedFor = React.useRef<string | null>(null)
  React.useLayoutEffect(() => {
    if (loadedFor.current === target) return
    const s = useLedger.getState()
    const existing = target !== "new" ? s.invoices.find((i) => i.id === target && i.status === "draft") : undefined
    // Drafts live in memory, so after a reload this one is gone.
    if (target !== "new" && !existing) toast("That draft is no longer here, so this is a new invoice")
    const fresh = emptyDraft(nextInvoiceId(s.invoices.map((i) => i.id)))
    const c = s.contacts.find((x) => x.id === params.get("customer"))
    if (c) Object.assign(fresh, { to: { contactId: c.id, name: c.name, email: c.email, taxId: c.tin, address: c.city }, currency: c.currency, taxCode: c.overseas ? "ZERO" : "GH-STD" })
    load(existing ? draftFromInvoice(existing, s) : fresh)
    useDetailsOpen.getState().reset()
    loadedFor.current = target
  }, [target, params, load])

  // Back from "Add company": select the new company.
  const companyParam = params.get("company")
  React.useEffect(() => {
    if (!companyParam) return
    const c = useLedger.getState().companies.find((x) => x.id === companyParam)
    if (c) {
      useDraft.getState().update((d) => ({ ...d, from: partyFromCompany(c) }))
      toast.success(`${c.name} added and selected`)
    }
    setParams({ company: null })
  }, [companyParam, setParams])

  const isEdit = !!draft.id
  const idx = STEPS.findIndex((s) => s.id === step)
  const meta = STEPS[idx]
  const isLast = idx === STEPS.length - 1
  const taken = (n: string) => invoices.some((i) => i.id === n)

  /* ---------- saving ---------- */

  const save = React.useCallback(
    (opts: { quiet?: boolean; syncUrl?: boolean } = {}) => {
      const d = useDraft.getState().draft
      const v = useDraft.getState().version
      let contactId = d.to.contactId ?? ""
      // A customer typed in as new becomes a contact on first save.
      if (!contactId && d.to.name.trim()) {
        contactId = useLedger.getState().addContact({ kind: "customer", name: d.to.name.trim(), email: d.to.email, phone: "", city: d.to.address ?? "", tin: d.to.taxId ?? "", termsDays: 14, currency: d.currency }).id
        useDraft.setState((s) => ({ draft: { ...s.draft, to: { ...s.draft.to, contactId } } }))
      }
      const id = useLedger.getState().saveDraftInvoice(toLedgerInput({ ...d, to: { ...d.to, contactId } }, contactId), userId)
      markSaved(id, v)
      useDraft.setState((s) => ({ draft: { ...s.draft, number: id } }))
      if (!invoiceId) loadedFor.current = id
      if (opts.syncUrl !== false && !invoiceId && params.get("draft") !== id) setParams({ draft: id })
      if (!opts.quiet) toast.success("Draft saved")
      return id
    },
    [invoiceId, markSaved, params, setParams, userId]
  )

  // Autosave 1s after the last change.
  React.useEffect(() => {
    if (version === 0 || version <= savedVersion) return
    const t = setTimeout(() => save({ quiet: true }), 1000)
    return () => clearTimeout(t)
  }, [version, savedVersion, save])
  const pending = version > savedVersion

  // Leaving the page never loses typing: flush anything not yet saved.
  const saveRef = React.useRef(save)
  React.useEffect(() => {
    saveRef.current = save
  }, [save])
  React.useEffect(
    () => () => {
      const s = useDraft.getState()
      if (s.version > s.savedVersion) saveRef.current({ quiet: true, syncUrl: false })
    },
    []
  )

  /* ---------- navigation ---------- */

  const goTo = (s: StepId) => {
    setErrors({})
    setAddingPayout(false)
    setParams({ step: s })
    bodyRef.current?.scrollTo({ top: 0 })
  }

  const fail = (s: StepId, errors: Record<string, string>) => {
    setErrors(errors)
    if (s !== step) setParams({ step: s })
    const first = Object.keys(errors)[0]
    requestAnimationFrame(() => document.getElementById(first)?.focus())
    if (first === "payment") toast.error(errors[first])
    else if (s !== step) toast.error(`Finish “${STEPS.find((x) => x.id === s)!.pill}” first`)
  }

  const next = () => {
    const errors = validateStep(step, draft, taken)
    if (Object.keys(errors).length) return fail(step, errors)
    if (!isLast) return goTo(STEPS[idx + 1].id)
    for (const s of STEPS) {
      const e = validateStep(s.id, draft, taken)
      if (Object.keys(e).length) return fail(s.id, e)
    }
    const id = save({ quiet: true, syncUrl: false })
    const inv = useLedger.getState().postInvoice(id, userId)
    useDraft.setState((s) => ({ savedVersion: s.version }))
    toast.success(`${inv.id} created`, { description: `${formatMoney(inv.total, inv.currency)} posted to Who owes you.` })
    router.push("/invoices")
  }

  /** Back is always allowed; forward stops at the first step with errors. */
  const jump = (to: StepId) => {
    const t = STEPS.findIndex((s) => s.id === to)
    if (t <= idx) return goTo(to)
    for (let i = idx; i < t; i++) {
      const e = validateStep(STEPS[i].id, draft, taken)
      if (Object.keys(e).length) return fail(STEPS[i].id, e)
    }
    goTo(to)
  }

  /** Save the draft, then go and add a company; it comes back selected. */
  const addCompany = (name: string) => {
    const id = save({ quiet: true, syncUrl: false })
    const back = invoiceId ? `/invoices/edit?id=${invoiceId}&step=company` : `/invoices/new?draft=${id}&step=company`
    router.push(`/settings/companies/new?returnTo=${encodeURIComponent(back)}${name ? `&name=${encodeURIComponent(name)}` : ""}`)
  }

  const total = draftTotals(draft).total

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---------- page header: back to the list ---------- */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6">
        <Button variant="ghost" asChild className="-ml-2 px-2 text-muted-foreground">
          <Link href="/invoices">
            <ArrowLeft />
            Invoices
          </Link>
        </Button>
        <span className="text-muted-foreground/50">/</span>
        <h1 className="truncate font-sans text-base font-medium tracking-normal">{isEdit ? `Edit draft ${draft.number}` : "New invoice"}</h1>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {pending ? "Saving…" : isEdit ? "Saved" : ""}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* ---------- left: the form ---------- */}
        <section className="flex min-h-0 w-full flex-1 flex-col bg-card md:w-[540px] md:flex-none md:border-r" aria-label="Invoice details">
          <div className="flex shrink-0 gap-1 border-b p-2 md:hidden" role="tablist" aria-label="Editor view">
            {(["edit", "preview"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={mobileView === v}
                onClick={() => setMobileView(v)}
                className={cn("h-8 flex-1 rounded-md text-sm font-medium text-muted-foreground", mobileView === v && "bg-muted text-foreground")}
              >
                {v === "edit" ? "Edit" : `Preview · ${formatMoney(total / 100, draft.currency)}`}
              </button>
            ))}
          </div>

          {mobileView === "preview" ? (
            <PreviewPane active={step} onJump={(s) => { jump(s); setMobileView("edit") }} className="min-h-0 flex-1 md:hidden" />
          ) : (
            <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto">
              <div key={`${step}-${addingPayout}`} className="flex flex-col gap-6 px-6 py-6 duration-200 animate-in fade-in-0 motion-reduce:animate-none">
                {addingPayout ? (
                  <AddPayoutView
                    onCancel={() => setAddingPayout(false)}
                    onAdded={(id) => {
                      useDraft.getState().update((d) => ({ ...d, payoutMethodIds: d.payoutMethodIds.includes(id) ? d.payoutMethodIds : [...d.payoutMethodIds, id] }))
                      setErrors({})
                      setAddingPayout(false)
                    }}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-sans text-xl font-medium tracking-normal text-foreground">{meta.heading}</h2>
                      {step === "items" && <CurrencyPicker />}
                    </div>
                    {step === "company" && <CompanyStep onAddCompany={addCompany} />}
                    {step === "customer" && <CustomerStep />}
                    {step === "items" && <ItemsStep />}
                    {step === "payment" && <PaymentStep onAdd={() => setAddingPayout(true)} />}
                    {step === "terms" && <TermsStep />}
                  </>
                )}
              </div>
            </div>
          )}

          <footer className="flex shrink-0 items-center justify-between gap-2 border-t px-6 py-4">
            <Button variant="outline" disabled={addingPayout} onClick={() => save()}>
              Save draft
            </Button>
            <div className="flex items-center gap-2">
              {idx > 0 && (
                <Button variant="ghost" disabled={addingPayout} onClick={() => goTo(STEPS[idx - 1].id)}>
                  Back
                </Button>
              )}
              <Button disabled={addingPayout} onClick={next}>
                {isLast ? "Create invoice" : "Next"}
              </Button>
            </div>
          </footer>
        </section>

        {/* ---------- right: the live preview ---------- */}
        <section className="relative hidden min-w-0 flex-1 md:flex" aria-label="Invoice preview">
          <PreviewPane active={step} onJump={jump} className="min-h-0 flex-1" />
        </section>
      </div>
    </div>
  )
}
