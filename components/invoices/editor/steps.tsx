"use client"

import * as React from "react"
import { Bitcoin, ChevronLeft, Info, Landmark, Smartphone, Trash2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { BRANCHES, CURRENCIES, type Currency } from "@/lib/constants"
import { addDays } from "@/lib/dates"
import { useLedger } from "@/lib/ledger"
import { PRODUCTS, RATES } from "@/lib/mock/seed"
import type { BranchId, PayoutMethod, TaxCode } from "@/lib/types"
import { TAX_LABELS } from "@/lib/types"
import { invoiceJournalLines } from "@/lib/mock/seed"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { AccountPicker } from "@/components/patterns/pickers"
import { JournalLines } from "@/components/patterns/journal-lines"
import { AdditionalDetails, Combobox, EField, LogoField, NumberInput, OptionCards, TextArea, TextInput, fieldShell } from "./fields"
import { docLines, newLine, partyFromCompany, useDraft, type InvoiceDraft } from "./draft"
import { BANK_COUNTRIES, CURRENCY_FLAGS, CURRENCY_NAMES, RAIL_LABELS, methodHint, methodLabel, type Rail } from "./payout"

const useD = () => {
  const draft = useDraft((s) => s.draft)
  const errors = useDraft((s) => s.errors)
  const update = useDraft((s) => s.update)
  const patch = (fn: (d: InvoiceDraft) => Partial<InvoiceDraft>) => update((d) => ({ ...d, ...fn(d) }))
  return { draft, errors, update, patch }
}

const selectCls = cn(fieldShell, "h-10 w-full border-0 px-3 text-sm shadow-none")

/* ---------------- 1 · Company ---------------- */

export function CompanyStep({ onAddCompany }: { onAddCompany: (name: string) => void }) {
  const { draft, errors, patch } = useD()
  const companies = useLedger((s) => s.companies)
  const from = draft.from
  const company = companies.find((c) => c.id === from.companyId)
  const setFrom = (p: Partial<typeof from>) => patch((d) => ({ from: { ...d.from, ...p } }))
  return (
    <>
      <EField id="inv-from-name" label="Company name" error={errors["inv-from-name"]}>
        <Combobox
          id="inv-from-name"
          value={from.companyId}
          renderValue={from.name ? <span className="text-foreground">{from.name}</span> : undefined}
          onSelect={(id) => setFrom(partyFromCompany(companies.find((c) => c.id === id)!))}
          options={companies.map((c) => ({ value: c.id, label: c.name, hint: c.address?.split(",").at(-1)?.trim() }))}
          placeholder="Choose a company"
          searchPlaceholder="Search company…"
          groupLabel="My companies"
          addLabel={(q) => (q ? `Add “${q}” as a company` : "Add company")}
          onAdd={onAddCompany}
          error={errors["inv-from-name"]}
        />
      </EField>
      <EField id="inv-from-email" label="Email" error={errors["inv-from-email"]}>
        <Combobox
          id="inv-from-email"
          value={from.email}
          onSelect={(v) => setFrom({ email: v })}
          options={(company?.emails ?? [from.email].filter(Boolean)).map((e) => ({ value: e, label: e, hint: "Verified" }))}
          placeholder="Choose an email"
          searchPlaceholder="Search email…"
          groupLabel="Verified emails"
          error={errors["inv-from-email"]}
        />
      </EField>
      <AdditionalDetails stepKey="company">
        <EField id="inv-from-address" label="Address">
          <TextInput id="inv-from-address" placeholder="Street, city" value={from.address ?? ""} onChange={(e) => setFrom({ address: e.target.value })} />
        </EField>
        <EField id="inv-from-tax" label="Tax ID">
          <TextInput id="inv-from-tax" placeholder="TIN" value={from.taxId ?? ""} onChange={(e) => setFrom({ taxId: e.target.value })} />
        </EField>
        <EField id="inv-from-logo" label="Logo">
          <LogoField id="inv-from-logo" value={from.logoUrl} onChange={(logoUrl) => setFrom({ logoUrl })} />
        </EField>
      </AdditionalDetails>
    </>
  )
}

/* ---------------- 2 · Customer ---------------- */

const GH_ADDRESSES = [
  "Adum Road, Kumasi",
  "Kejetia Market, Kumasi",
  "Ring Road Central, Accra",
  "Oxford Street, Osu, Accra",
  "Spintex Road, Accra",
  "Harbour Area, Tema",
  "Market Circle, Takoradi",
  "Liberation Road, Takoradi",
  "Independence Avenue, Accra",
  "Asafo, Kumasi",
]

export function CustomerStep() {
  const { draft, errors, patch } = useD()
  const contacts = useLedger((s) => s.contacts)
  const customers = contacts.filter((c) => c.kind === "customer")
  const to = draft.to
  const setTo = (p: Partial<typeof to>) => patch((d) => ({ to: { ...d.to, ...p } }))
  const [addrOpen, setAddrOpen] = React.useState(false)
  const suggestions = (to.address ?? "").trim().length >= 2 ? GH_ADDRESSES.filter((a) => a.toLowerCase().includes(to.address!.toLowerCase().trim())).slice(0, 5) : []

  return (
    <>
      <EField id="inv-to-name" label="Name" error={errors["inv-to-name"]}>
        <Combobox
          id="inv-to-name"
          value={to.contactId}
          renderValue={to.name ? <span className="text-foreground">{to.name}</span> : undefined}
          onSelect={(id) => {
            const c = customers.find((x) => x.id === id)!
            patch((d) => ({
              to: { contactId: c.id, name: c.name, email: c.email, taxId: c.tin, address: c.city, logoUrl: d.to.logoUrl },
              currency: c.currency,
              taxCode: c.overseas ? "ZERO" : d.taxCode === "ZERO" ? "GH-STD" : d.taxCode,
            }))
          }}
          options={customers.map((c) => ({ value: c.id, label: c.name, hint: c.city }))}
          placeholder="Choose a customer"
          searchPlaceholder="Search contact…"
          groupLabel="My customers"
          addLabel={(q) => (q ? `Add “${q}” as a new customer` : "Add new customer")}
          onAdd={(q) => setTo({ contactId: undefined, name: q, email: "", taxId: "", address: "" })}
          error={errors["inv-to-name"]}
        />
      </EField>
      <EField id="inv-to-email" label="Email" error={errors["inv-to-email"]}>
        <TextInput id="inv-to-email" type="email" error={errors["inv-to-email"]} placeholder="accounts@customer.com" value={to.email} onChange={(e) => setTo({ email: e.target.value })} />
      </EField>
      <AdditionalDetails stepKey="customer">
        <EField id="inv-to-address" label="Address">
          <div className="relative">
            <TextInput
              id="inv-to-address"
              placeholder="Start typing an address"
              autoComplete="off"
              role="combobox"
              aria-expanded={addrOpen && suggestions.length > 0}
              aria-controls="inv-to-address-list"
              value={to.address ?? ""}
              onChange={(e) => {
                setTo({ address: e.target.value })
                setAddrOpen(true)
              }}
              onBlur={() => setTimeout(() => setAddrOpen(false), 120)}
              onKeyDown={(e) => e.key === "Escape" && addrOpen && (e.stopPropagation(), setAddrOpen(false))}
            />
            {addrOpen && suggestions.length > 0 && (
              <ul id="inv-to-address-list" role="listbox" className="absolute inset-x-0 top-11 z-10 overflow-hidden rounded-lg border bg-popover p-1">
                {suggestions.map((a) => (
                  <li key={a} role="option" aria-selected={false}>
                    <button type="button" className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted" onMouseDown={(e) => e.preventDefault()} onClick={() => { setTo({ address: a }); setAddrOpen(false) }}>
                      {a}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </EField>
        <EField id="inv-to-tax" label="Tax ID">
          <TextInput id="inv-to-tax" placeholder="TIN" value={to.taxId ?? ""} onChange={(e) => setTo({ taxId: e.target.value })} />
        </EField>
        <EField id="inv-to-logo" label="Logo">
          <LogoField id="inv-to-logo" value={to.logoUrl} onChange={(logoUrl) => setTo({ logoUrl })} />
        </EField>
      </AdditionalDetails>
    </>
  )
}

/* ---------------- 3 · Items ---------------- */

export function CurrencyPicker() {
  const { draft, patch } = useD()
  return (
    <Combobox
      id="inv-currency"
      value={draft.currency}
      onSelect={(v) => patch(() => ({ currency: v as Currency }))}
      options={CURRENCIES.map((c) => ({ value: c, label: c, hint: CURRENCY_NAMES[c], icon: <span aria-hidden>{CURRENCY_FLAGS[c]}</span> }))}
      placeholder="Currency"
      searchPlaceholder="Search currency…"
      className="w-32"
    />
  )
}

export function ItemsStep() {
  const { draft, errors, patch } = useD()
  const setItem = (id: string, p: Partial<InvoiceDraft["items"][number]>) => patch((d) => ({ items: d.items.map((i) => (i.id === id ? { ...i, ...p } : i)) }))
  const addItem = () => {
    const line = newLine()
    patch((d) => ({ items: [...d.items, line] }))
    requestAnimationFrame(() => document.getElementById(`inv-item-${draft.items.length}-name`)?.focus())
  }
  const removeItem = (idx: number) =>
    patch((d) => (d.items.length === 1 ? { items: [{ ...newLine() }] } : { items: d.items.filter((_, i) => i !== idx) }))

  return (
    <>
      <div className="flex flex-col">
        {draft.items.map((item, idx) => {
          const eName = errors[`inv-item-${idx}-name`]
          const eQty = errors[`inv-item-${idx}-qty`]
          const ePrice = errors[`inv-item-${idx}-unitPrice`]
          return (
            <div key={item.id} className={cn("grid grid-cols-[minmax(0,1fr)_68px_110px_24px] items-start gap-3", idx > 0 && "mt-6 border-t pt-6")}>
              <EField id={`inv-item-${idx}-name`} label="Item" error={eName}>
                <TextInput
                  id={`inv-item-${idx}-name`}
                  list="inv-products"
                  error={eName}
                  placeholder="What you sold"
                  value={item.name}
                  onChange={(e) => {
                    const name = e.target.value
                    const product = PRODUCTS.find((p) => p.name === name)
                    setItem(item.id, { name, ...(product && !item.unitPrice ? { unitPrice: Math.round((product.price / RATES[draft.currency]) * 100) } : {}) })
                  }}
                />
              </EField>
              <EField id={`inv-item-${idx}-qty`} label="Qty" error={eQty}>
                <NumberInput id={`inv-item-${idx}-qty`} value={item.qty} onValue={(qty) => setItem(item.id, { qty })} error={eQty} />
              </EField>
              <EField id={`inv-item-${idx}-unitPrice`} label="Price" error={ePrice}>
                <NumberInput id={`inv-item-${idx}-unitPrice`} minor value={item.unitPrice} onValue={(unitPrice) => setItem(item.id, { unitPrice })} error={ePrice} />
              </EField>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                aria-label={draft.items.length === 1 ? "Clear item" : `Remove ${item.name || "item"}`}
                className="mt-[34px] flex size-6 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive-soft"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          )
        })}
        <datalist id="inv-products">
          {PRODUCTS.map((p) => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
      </div>
      <button type="button" onClick={addItem} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-card text-sm font-medium text-foreground/80 ring-1 ring-input ring-inset transition-all duration-200 hover:bg-muted/60 hover:ring-foreground/20">
        <Plus className="size-4" />
        Add item
      </button>
      <EField id="inv-note" label="Note">
        <TextArea id="inv-note" placeholder="Add a note" value={draft.note} onChange={(e) => patch(() => ({ note: e.target.value }))} />
      </EField>
      <EField id="inv-discount" label={`Discount (${draft.currency})`}>
        <NumberInput id="inv-discount" minor value={draft.discount} onValue={(discount) => patch(() => ({ discount }))} className="w-40" />
      </EField>
      <AdditionalDetails stepKey="items">
        <EField id="inv-tax" label="Tax">
          <Select value={draft.taxCode} onValueChange={(v) => patch(() => ({ taxCode: v as TaxCode }))}>
            <SelectTrigger id="inv-tax" className={selectCls}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TAX_LABELS) as TaxCode[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TAX_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EField>
      </AdditionalDetails>
    </>
  )
}

/* ---------------- 4 · Payment ---------------- */

export function PaymentStep({ onAdd }: { onAdd: () => void }) {
  const { draft, errors, patch } = useD()
  const methods = useLedger((s) => s.payoutMethods)
  const toggle = (id: string) => patch((d) => ({ payoutMethodIds: d.payoutMethodIds.includes(id) ? d.payoutMethodIds.filter((x) => x !== id) : [...d.payoutMethodIds, id] }))
  const selected = methods.filter((m) => draft.payoutMethodIds.includes(m.id))
  const Icon = (m: PayoutMethod) => (m.type === "bank" ? Landmark : m.type === "momo" ? Smartphone : Bitcoin)
  return (
    <>
      <EField id="payment" label="Payout methods" error={errors["payment"]}>
        <Combobox
          id="payment"
          values={draft.payoutMethodIds}
          onSelect={toggle}
          options={methods.map((m) => {
            const I = Icon(m)
            return { value: m.id, label: methodLabel(m), hint: methodHint(m), icon: <I className="size-4 text-muted-foreground" /> }
          })}
          renderValue={selected.length ? <span className="text-foreground">{selected.length === 1 ? methodLabel(selected[0]) : `${selected.length} methods selected`}</span> : undefined}
          placeholder="Search or add…"
          searchPlaceholder="Search or add…"
          groupLabel="Saved methods"
          addLabel={() => "Add payout method"}
          onAdd={onAdd}
          error={errors["payment"]}
        />
      </EField>
      {selected.length > 0 && (
        <ul className="divide-y rounded-lg ring-1 ring-input ring-inset">
          {selected.map((m) => {
            const I = Icon(m)
            return (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <I className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{methodLabel(m)}</p>
                  <p className="truncate text-xs text-muted-foreground">{methodHint(m)}</p>
                </div>
                <button type="button" onClick={() => toggle(m.id)} aria-label={`Remove ${methodLabel(m)}`} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="size-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Your customer sees these as the ways to pay, under “Choose how you&apos;d like to pay”.</p>
    </>
  )
}

/** Replaces the step body in place — not a second modal. */
export function AddPayoutView({ onCancel, onAdded }: { onCancel: () => void; onAdded: (id: string) => void }) {
  const addPayoutMethod = useLedger((s) => s.addPayoutMethod)
  const [type, setType] = React.useState<"bank" | "momo" | "crypto">("bank")
  const [country, setCountry] = React.useState("GH")
  const cfg = BANK_COUNTRIES[country]
  const [currency, setCurrency] = React.useState<Currency>(cfg.currencies[0])
  const rails = Object.keys(cfg.rails) as Rail[]
  const [rail, setRail] = React.useState<Rail>(rails[0])
  const [fields, setFields] = React.useState<Record<string, string>>({})
  const [nickname, setNickname] = React.useState("")
  const [holder, setHolder] = React.useState("")
  const [momo, setMomo] = React.useState({ network: "MTN", number: "", name: "" })
  const [crypto, setCrypto] = React.useState({ name: "", address: "" })

  const activeRail = cfg.rails[rail] ? rail : rails[0]
  const bankFields = cfg.rails[activeRail] ?? []
  const valid =
    type === "bank"
      ? bankFields.every((f) => (fields[f.key] ?? "").trim()) && holder.trim().length > 1
      : type === "momo"
        ? momo.number.replace(/\D/g, "").length >= 10 && momo.name.trim().length > 1
        : crypto.name.trim().length > 0 && crypto.address.trim().length >= 20

  const add = () => {
    const id = `pm-${Date.now().toString(36)}`
    const m: PayoutMethod =
      type === "bank"
        ? { id, type: "bank", nickname: nickname.trim() || undefined, country, currency, rail: activeRail, fields: { ...fields, accountName: holder.trim() } }
        : type === "momo"
          ? { id, type: "momo", nickname: nickname.trim() || undefined, network: momo.network, number: momo.number.trim(), name: momo.name.trim() }
          : { id, type: "crypto", name: crypto.name.trim(), address: crypto.address.trim(), network: "USDC" }
    addPayoutMethod(m)
    toast.success("Payout method added")
    onAdded(id)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <button type="button" onClick={onCancel} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Payment details
        </button>
        <h3 className="font-sans text-xl font-medium tracking-normal text-foreground">Add a payout method</h3>
      </div>
      <OptionCards
        label="Payout type"
        value={type}
        onValueChange={(v) => setType(v as typeof type)}
        options={[
          { value: "bank", label: "Bank account", icon: <Landmark />, tint: "text-brand" },
          { value: "momo", label: "Mobile money", icon: <Smartphone />, tint: "text-warning" },
          { value: "crypto", label: "Crypto wallet", icon: <Bitcoin />, tint: "text-success" },
        ]}
      />

      {type === "bank" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <EField id="pm-country" label="Country">
              <Select
                value={country}
                onValueChange={(c) => {
                  setCountry(c)
                  setCurrency(BANK_COUNTRIES[c].currencies[0])
                  setRail(Object.keys(BANK_COUNTRIES[c].rails)[0] as Rail)
                  setFields({})
                }}
              >
                <SelectTrigger id="pm-country" className={selectCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BANK_COUNTRIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.flag} {v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </EField>
            <EField id="pm-currency" label="Currency">
              <Select value={currency} onValueChange={(c) => setCurrency(c as Currency)}>
                <SelectTrigger id="pm-currency" className={selectCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cfg.currencies.map((c) => (
                    <SelectItem key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </EField>
          </div>
          <div className="flex flex-col gap-2">
            <div role="radiogroup" aria-label="Payment rail" className="flex rounded-full bg-muted p-1">
              {rails.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={activeRail === r}
                  onClick={() => { setRail(r); setFields({}) }}
                  className={cn("h-8 flex-1 rounded-full text-sm font-medium text-muted-foreground transition-all duration-300", activeRail === r && "bg-card text-foreground ring-1 ring-input")}
                >
                  {RAIL_LABELS[r]}
                </button>
              ))}
            </div>
            {rails.length === 1 && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="size-3.5" />
                Additional payment options not supported for this method
              </p>
            )}
          </div>
          {bankFields.map((f) => (
            <EField key={f.key} id={`pm-${f.key}`} label={f.label}>
              <TextInput id={`pm-${f.key}`} placeholder={f.placeholder} value={fields[f.key] ?? ""} onChange={(e) => setFields((x) => ({ ...x, [f.key]: e.target.value }))} />
            </EField>
          ))}
          <EField id="pm-holder" label="Account holder name">
            <TextInput id="pm-holder" placeholder="Kumasi Traders Ltd" value={holder} onChange={(e) => setHolder(e.target.value)} />
          </EField>
          <EField id="pm-nickname" label="Nickname">
            <TextInput id="pm-nickname" placeholder="e.g, Business checking" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </EField>
        </>
      )}

      {type === "momo" && (
        <>
          <EField id="pm-network" label="Network">
            <Select value={momo.network} onValueChange={(network) => setMomo((m) => ({ ...m, network }))}>
              <SelectTrigger id="pm-network" className={selectCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                {["MTN", "Telecel", "AirtelTigo"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </EField>
          <EField id="pm-number" label="Wallet number">
            <TextInput id="pm-number" inputMode="tel" placeholder="024 000 0000" value={momo.number} onChange={(e) => setMomo((m) => ({ ...m, number: e.target.value }))} />
          </EField>
          <EField id="pm-momo-name" label="Registered name">
            <TextInput id="pm-momo-name" placeholder="Kumasi Traders Ltd" value={momo.name} onChange={(e) => setMomo((m) => ({ ...m, name: e.target.value }))} />
          </EField>
          <EField id="pm-nickname" label="Nickname">
            <TextInput id="pm-nickname" placeholder="e.g, Shop wallet" value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </EField>
        </>
      )}

      {type === "crypto" && (
        <>
          <EField id="pm-crypto-name" label="Name">
            <TextInput id="pm-crypto-name" placeholder="e.g, Treasury wallet" value={crypto.name} onChange={(e) => setCrypto((c) => ({ ...c, name: e.target.value }))} />
          </EField>
          <EField
            id="pm-crypto-address"
            label="Wallet address"
            action={
              <button type="button" className="text-xs font-medium text-brand underline-offset-4 hover:underline" onClick={() => toast("Wallet connection is mocked in the prototype")}>
                Connect
              </button>
            }
          >
            <TextInput id="pm-crypto-address" placeholder="0x…" value={crypto.address} onChange={(e) => setCrypto((c) => ({ ...c, address: e.target.value }))} />
          </EField>
        </>
      )}

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button disabled={!valid} onClick={add}>Add</Button>
      </div>
    </div>
  )
}

/* ---------------- 5 · Terms ---------------- */

export function TermsStep() {
  const { draft, errors, patch } = useD()
  const accounts = useLedger((s) => s.accounts)
  const presets = [7, 14, 30]
  const activePreset = presets.find((n) => addDays(draft.issueDate, n) === draft.dueDate)
  const lines = invoiceJournalLines({ lines: docLines(draft), rate: RATES[draft.currency], id: draft.number })
  return (
    <>
      <EField id="inv-number" label="Invoice number" error={errors["inv-number"]}>
        <TextInput id="inv-number" error={errors["inv-number"]} className="font-mono" value={draft.number} onChange={(e) => patch(() => ({ number: e.target.value.toUpperCase() }))} />
      </EField>
      <EField id="inv-issue" label="Issue date" error={errors["inv-issue"]}>
        <TextInput
          id="inv-issue"
          type="date"
          error={errors["inv-issue"]}
          value={draft.issueDate}
          onChange={(e) => {
            const issueDate = e.target.value
            // Keep the chosen Net preset when the issue date moves.
            patch((d) => ({ issueDate, dueDate: activePreset && issueDate ? addDays(issueDate, activePreset) : d.dueDate }))
          }}
        />
      </EField>
      <EField id="inv-due" label="Due date" error={errors["inv-due"]}>
        <div className="flex flex-wrap gap-2">
          {presets.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={activePreset === n}
              onClick={() => patch((d) => ({ dueDate: addDays(d.issueDate, n) }))}
              className={cn("h-9 rounded-lg px-3 text-sm font-medium ring-1 ring-input ring-inset transition-all duration-200 hover:bg-muted/60", activePreset === n ? "text-foreground ring-brand" : "text-foreground/70")}
            >
              Net {n}
            </button>
          ))}
          <TextInput id="inv-due" type="date" error={errors["inv-due"]} className="w-44 flex-none" value={draft.dueDate} onChange={(e) => patch(() => ({ dueDate: e.target.value }))} />
        </div>
      </EField>
      <AdditionalDetails stepKey="terms" label="Accounting">
        <EField id="inv-branch" label="Branch">
          <Select value={draft.branch} onValueChange={(v) => patch(() => ({ branch: v as BranchId }))}>
            <SelectTrigger id="inv-branch" className={selectCls}><SelectValue /></SelectTrigger>
            <SelectContent>
              {BRANCHES.slice(1).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </EField>
        <EField id="inv-revenue" label="Revenue account">
          <AccountPicker id="inv-revenue" types={["income"]} value={draft.revenueAccount} onChange={(v) => patch(() => ({ revenueAccount: v }))} className="h-10" />
        </EField>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">What this posts</p>
          <JournalLines lines={lines.map((l) => ({ ...l, accountName: accounts.find((a) => a.code === l.accountCode)?.name ?? l.accountCode }))} />
          {draft.currency !== "GHS" && <p className="text-xs text-muted-foreground">Posted in GH₵ at {RATES[draft.currency]} per {draft.currency}.</p>}
        </div>
      </AdditionalDetails>
    </>
  )
}

