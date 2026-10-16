"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Minus, Plus, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { BRANCHES, USERS, type Currency } from "@/lib/constants"
import { fmtDate } from "@/lib/dates"
import { EXCHANGE_RATES } from "@/lib/mock/seed"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Banner } from "@/components/patterns/banner"
import { Money } from "@/components/patterns/money"
import { Code } from "@/components/patterns/text"
import { COST_CENTRES } from "@/components/forms/money-dialog"
import { SettingsSplit } from "@/components/settings/settings-split"
import { PERMISSIONS, SaveButton, SettingsCard, SettingsField, useCardForm, type Role } from "@/components/settings/settings-bits"

/* ---------------- side menu ---------------- */

const SECTIONS = [
  { id: "personal", label: "Personal" },
  { id: "organisation", label: "Organisation" },
  { id: "controls", label: "Controls" },
  { id: "currencies", label: "Currencies & exchange rates" },
  { id: "users", label: "Users & roles" },
  { id: "custom-fields", label: "Custom fields" },
  { id: "dimensions", label: "Dimensions" },
] as const
type SectionId = (typeof SECTIONS)[number]["id"]

export default function Page() {
  return (
    <React.Suspense>
      <GeneralSettings />
    </React.Suspense>
  )
}

function GeneralSettings() {
  const params = useSearchParams()
  const router = useRouter()
  const raw = params.get("section")
  const section: SectionId = SECTIONS.some((s) => s.id === raw) ? (raw as SectionId) : "personal"
  const go = (id: string) => router.replace(`/settings?section=${id}`, { scroll: false })

  return (
    <SettingsSplit
      title="General"
      description="Your profile, your organisation, the controls on your books, and who can sign in."
      items={SECTIONS}
      value={section}
      onChange={go}
    >
      {section === "personal" && <Personal />}
      {section === "organisation" && <Organisation />}
      {section === "controls" && <Controls />}
      {section === "currencies" && <Currencies />}
      {section === "users" && <Users />}
      {section === "custom-fields" && <CustomFields />}
      {section === "dimensions" && <Dimensions />}
    </SettingsSplit>
  )
}

function SectionHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
    </div>
  )
}

/** Settings only the Owner may change. */
function useOwner() {
  const userId = usePrefs((s) => s.userId)
  return { userId, canEdit: userId === "ama", blocked: userId === "ama" ? null : "Only the Owner can save" }
}

function OwnerBanner() {
  const { canEdit } = useOwner()
  if (canEdit) return null
  return (
    <Banner tone="locked" title="Only the Owner can change these settings">
      You can look around, but saving is off. Switch to Ama Mensah from the user menu to make changes.
    </Banner>
  )
}

/* ---------------- Personal ---------------- */

const REGIONS = {
  "en-GH": { label: "Ghana", text: "Numbers, dates and money follow the standards used in Ghana." },
  "en-GB": { label: "United Kingdom", text: "Numbers, dates and money follow the standards used in the United Kingdom." },
  "en-US": { label: "United States", text: "Numbers, dates and money follow the standards used in the United States." },
} as const
type Region = keyof typeof REGIONS

function Personal() {
  const userId = usePrefs((s) => s.userId)
  const showDetail = usePrefs((s) => s.showAccountingDetail)
  const toggleDetail = usePrefs((s) => s.toggleAccountingDetail)
  const user = USERS.find((u) => u.id === userId)!
  const [first, ...rest] = user.name.split(" ")
  const email = `${first.toLowerCase()}@kumasitraders.com.gh`

  const info = useCardForm({ first, last: rest.join(" ") })
  const infoBlocked = !info.value.first.trim() || !info.value.last.trim() ? "Enter both names" : null

  const fmt = useCardForm({ language: "en", region: "en-GH" as Region, showCodes: showDetail })

  // The preview uses a fixed sample moment so it reads the same for everyone.
  const sample = new Date("2026-10-05T11:33:55Z")
  const loc = fmt.value.region
  const dateLong = new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeStyle: "medium", timeZone: "Africa/Accra" }).format(sample)
  const dateShort = new Intl.DateTimeFormat(loc, { dateStyle: "short", timeZone: "Africa/Accra" }).format(sample)
  const number = new Intl.NumberFormat(loc, { maximumFractionDigits: 2 }).format(834561242.59)
  const percent = new Intl.NumberFormat(loc, { style: "percent", maximumFractionDigits: 2 }).format(0.5976)
  const money = new Intl.NumberFormat(loc, { style: "currency", currency: "GHS" }).format(3456.68)
  const compact = new Intl.NumberFormat(loc, { style: "currency", currency: "GHS", notation: "compact" }).format(23000)

  return (
    <>
      <SectionHeading title="Personal">
        <p>
          Your email is currently <span className="font-medium text-foreground">{email}</span>.
        </p>
        <p>
          Your role is currently <span className="font-medium text-foreground">{user.role}</span>.
        </p>
      </SectionHeading>

      <SettingsCard
        title="Information"
        action={
          <SaveButton
            dirty={info.dirty}
            blocked={infoBlocked}
            onSave={() => {
              info.commit()
              toast.success("Your details are saved")
            }}
          />
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <SettingsField label="First name" htmlFor="p-first" required>
            <Input id="p-first" value={info.value.first} onChange={(e) => info.set("first", e.target.value)} className="h-11" />
          </SettingsField>
          <SettingsField label="Last name" htmlFor="p-last" required>
            <Input id="p-last" value={info.value.last} onChange={(e) => info.set("last", e.target.value)} className="h-11" />
          </SettingsField>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Language and regional format"
        description="Set how Tapanta looks for you. These settings don't change anything for other people."
        action={
          <SaveButton
            dirty={fmt.dirty}
            onSave={() => {
              if (fmt.value.showCodes !== showDetail) toggleDetail()
              fmt.commit()
              toast.success("Your preferences are saved")
            }}
          />
        }
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-6">
            <SettingsField label="Language" htmlFor="p-lang" hint="Only your account uses this language.">
              <Select value={fmt.value.language} onValueChange={(v) => fmt.set("language", v)}>
                <SelectTrigger id="p-lang" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </SettingsField>
            <SettingsField label="Regional format" htmlFor="p-region" hint={REGIONS[fmt.value.region].text}>
              <Select value={fmt.value.region} onValueChange={(v) => fmt.set("region", v as Region)}>
                <SelectTrigger id="p-region" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(REGIONS) as Region[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {REGIONS[r].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsField>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={fmt.value.showCodes} onCheckedChange={(v) => fmt.set("showCodes", !!v)} className="mt-0.5" />
              <span>
                <span className="font-medium">Show accounting detail</span>
                <span className="block text-xs text-muted-foreground">Debit and credit columns and account codes appear by default. Recommended for accountants.</span>
              </span>
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Preview</p>
            <dl className="flex-1 space-y-5 rounded-lg bg-muted/60 p-5 text-sm">
              <div>
                <dt className="text-muted-foreground">Date, time and timezone</dt>
                <dd className="mt-1 font-mono text-[13px]">{dateLong} GMT</dd>
                <dd className="font-mono text-[13px]">{dateShort}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Number, percentage and currency</dt>
                <dd className="mt-1 font-mono text-[13px]">{number}</dd>
                <dd className="font-mono text-[13px]">{percent}</dd>
                <dd className="font-mono text-[13px]">{money}</dd>
                <dd className="font-mono text-[13px]">{compact}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Account names</dt>
                <dd className="mt-1 font-mono text-[13px]">{fmt.value.showCodes ? "1100 · Who owes you" : "Who owes you"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </SettingsCard>
    </>
  )
}

/* ---------------- Organisation ---------------- */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function Organisation() {
  const settings = useLedger((s) => s.settings)
  const updateSettings = useLedger((s) => s.updateSettings)
  const { userId, blocked } = useOwner()
  const details = useCardForm({
    orgName: settings.orgName,
    tradingName: "Kumasi Traders",
    tin: "C0004417285",
    vatNumber: "V0004417285",
    address: "14 Prempeh II Street, Adum, Kumasi",
    phone: "+233 32 202 4471",
  })
  const year = useCardForm({ yearStart: "January" })
  const d = details.value
  return (
    <>
      <SectionHeading title="Organisation">Shown on invoices, statements and reports.</SectionHeading>
      <OwnerBanner />
      <SettingsCard
        title="Company details"
        action={
          <SaveButton
            dirty={details.dirty}
            blocked={blocked ?? (!d.orgName.trim() ? "Enter the legal name" : null)}
            onSave={() => {
              if (d.orgName !== details.saved.orgName) updateSettings({ orgName: d.orgName }, userId)
              details.commit()
              toast.success("Company details saved")
            }}
          />
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <SettingsField label="Legal name" htmlFor="o-name" required>
            <Input id="o-name" value={d.orgName} onChange={(e) => details.set("orgName", e.target.value)} className="h-11" />
          </SettingsField>
          <SettingsField label="Trading name" htmlFor="o-trading" hint="What customers know you as, if different.">
            <Input id="o-trading" value={d.tradingName} onChange={(e) => details.set("tradingName", e.target.value)} className="h-11" />
          </SettingsField>
          <SettingsField label="Taxpayer ID (TIN)" htmlFor="o-tin">
            <Input id="o-tin" value={d.tin} onChange={(e) => details.set("tin", e.target.value)} className="h-11 font-mono" />
          </SettingsField>
          <SettingsField label="VAT registration number" htmlFor="o-vat">
            <Input id="o-vat" value={d.vatNumber} onChange={(e) => details.set("vatNumber", e.target.value)} className="h-11 font-mono" />
          </SettingsField>
          <SettingsField label="Address" htmlFor="o-address">
            <Input id="o-address" value={d.address} onChange={(e) => details.set("address", e.target.value)} className="h-11" />
          </SettingsField>
          <SettingsField label="Phone" htmlFor="o-phone">
            <Input id="o-phone" value={d.phone} onChange={(e) => details.set("phone", e.target.value)} className="h-11" />
          </SettingsField>
        </div>
      </SettingsCard>
      <SettingsCard
        title="Financial year"
        description="Profit this year and Year to date count from here."
        action={<SaveButton dirty={year.dirty} blocked={blocked} onSave={() => { year.commit(); toast.success("Financial year saved") }} />}
      >
        <SettingsField label="Financial year starts in" htmlFor="o-year" className="sm:max-w-xs">
          <Select value={year.value.yearStart} onValueChange={(v) => year.set("yearStart", v)}>
            <SelectTrigger id="o-year" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsField>
      </SettingsCard>
    </>
  )
}

/* ---------------- Controls ---------------- */

function Controls() {
  const settings = useLedger((s) => s.settings)
  const updateSettings = useLedger((s) => s.updateSettings)
  const { userId, blocked } = useOwner()
  const threshold = useCardForm({ amount: settings.approvalThreshold })
  const lock = useCardForm({ date: settings.periodLockDate })
  return (
    <>
      <SectionHeading title="Controls">Checks that stop mistakes reaching your books.</SectionHeading>
      <OwnerBanner />
      <SettingsCard
        title="Approval threshold"
        description={
          <>
            Journals over this amount need a second person to approve them before they post. Now <Money amount={threshold.saved.amount} size="sm" />.
          </>
        }
        action={
          <SaveButton
            dirty={threshold.dirty}
            blocked={blocked ?? (!(threshold.value.amount > 0) ? "Enter an amount above zero" : null)}
            onSave={() => {
              updateSettings({ approvalThreshold: threshold.value.amount }, userId)
              threshold.commit()
              toast.success("Approval threshold saved")
            }}
          />
        }
      >
        <SettingsField label="Amount" htmlFor="c-threshold" className="sm:max-w-xs">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">GH₵</span>
            <Input
              id="c-threshold"
              type="number"
              min={0}
              step={1000}
              value={Number.isFinite(threshold.value.amount) ? threshold.value.amount : ""}
              onChange={(e) => threshold.set("amount", e.target.value === "" ? NaN : Number(e.target.value))}
              className="h-11 pl-12 text-right tabular"
            />
          </div>
        </SettingsField>
      </SettingsCard>
      <SettingsCard
        title="Period locks"
        description={<>No one can post, edit or delete anything dated on or before this date. Locked up to {fmtDate(lock.saved.date)}. Period close shows it read-only.</>}
        action={
          <SaveButton
            dirty={lock.dirty}
            blocked={blocked ?? (!lock.value.date ? "Pick a lock date" : null)}
            onSave={() => {
              updateSettings({ periodLockDate: lock.value.date }, userId)
              lock.commit()
              toast.success("Period lock saved")
            }}
          />
        }
      >
        <SettingsField label="Lock everything up to" htmlFor="c-lock" className="sm:max-w-xs">
          <Input id="c-lock" type="date" value={lock.value.date} onChange={(e) => lock.set("date", e.target.value)} className="h-11" />
        </SettingsField>
      </SettingsCard>
    </>
  )
}

/* ---------------- Currencies ---------------- */

const CURRENCY_NAMES: Record<Currency, string> = { USD: "US dollar", EUR: "Euro", GBP: "Pound sterling", GHS: "Ghana cedi" }

function Currencies() {
  const { blocked } = useOwner()
  const rates = useCardForm(Object.fromEntries(EXCHANGE_RATES.map((r) => [r.currency, r.rate])) as Record<string, number>)
  const invalid = Object.values(rates.value).some((r) => !(r > 0)) ? "Every rate must be above zero" : null
  return (
    <>
      <SectionHeading title="Currencies & exchange rates">Exchange rates live here only. Invoices, bills and the month-end revaluation read them from here.</SectionHeading>
      <OwnerBanner />
      <SettingsCard title="Base currency" description="Your books and reports are kept in this currency. It can't be changed once you've posted.">
        <p className="text-sm font-medium">Ghana cedi (GH₵) · GHS</p>
      </SettingsCard>
      <SettingsCard
        title="Exchange rates"
        description="How many cedis one unit of each currency is worth."
        action={<SaveButton dirty={rates.dirty} blocked={blocked ?? invalid} onSave={() => { rates.commit(); toast.success("Exchange rates saved") }} />}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 pr-4 text-left font-medium">Currency</th>
                <th className="py-2 pr-4 text-left font-medium">1 unit in GH₵</th>
                <th className="py-2 pr-4 text-left font-medium">Source</th>
                <th className="py-2 text-left font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {EXCHANGE_RATES.map((r) => (
                <tr key={r.currency}>
                  <td className="py-2.5 pr-4">
                    <span className="font-medium">{r.currency}</span> <span className="text-muted-foreground">{CURRENCY_NAMES[r.currency]}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <Input
                      type="number"
                      step="0.0001"
                      min={0}
                      aria-label={`${r.currency} rate`}
                      value={Number.isFinite(rates.value[r.currency]) ? rates.value[r.currency] : ""}
                      onChange={(e) => rates.setValue((x) => ({ ...x, [r.currency]: e.target.value === "" ? NaN : Number(e.target.value) }))}
                      className="w-36 text-right tabular"
                    />
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{r.source}</td>
                  <td className="py-2.5 text-muted-foreground">{fmtDate(r.updated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsCard>
    </>
  )
}

/* ---------------- Users & roles ---------------- */

function Users() {
  const { canEdit } = useOwner()
  return (
    <>
      <SectionHeading title="Users & roles">Who can sign in to Kumasi Traders Ltd, and what each role can do.</SectionHeading>
      <SettingsCard
        title="Team"
        action={
          <Button variant="outline" disabled={!canEdit} onClick={() => toast("Inviting a user is mocked in the prototype")}>
            <UserPlus />
            Invite
          </Button>
        }
      >
        <ul className="-my-3 divide-y">
          {USERS.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">{u.initials}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">{u.name.split(" ")[0].toLowerCase()}@kumasitraders.com.gh</p>
              </div>
              <span className="text-sm">{u.role}</span>
            </li>
          ))}
        </ul>
      </SettingsCard>
      <SettingsCard title="What each role can do" description="Role names match the team list exactly.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 pr-4 text-left font-medium">Permission</th>
                {USERS.map((u) => (
                  <th key={u.role} className="w-36 py-2 text-center font-medium">
                    {u.role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {PERMISSIONS.map((p) => (
                <tr key={p.label}>
                  <td className="py-2.5 pr-4">{p.label}</td>
                  {USERS.map((u) => (
                    <td key={u.role} className="py-2.5 text-center">
                      {p.roles.includes(u.role as Role) ? (
                        <Check className="mx-auto size-4 text-success" aria-label="Allowed" />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="Not allowed" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsCard>
    </>
  )
}

/* ---------------- Custom fields ---------------- */

const CUSTOM_FIELDS = [
  { id: "cf-route", name: "Delivery route", appliesTo: "Invoices", type: "Choice: Local, Export (overseas)" },
  { id: "cf-driver", name: "Driver", appliesTo: "Invoices", type: "Text" },
  { id: "cf-po", name: "Purchase order number", appliesTo: "Bills", type: "Text" },
  { id: "cf-loan", name: "Loan ID", appliesTo: "Journals", type: "Text" },
]

function CustomFields() {
  const { blocked, canEdit } = useOwner()
  const fields = useCardForm(Object.fromEntries(CUSTOM_FIELDS.map((f) => [f.id, f.id !== "cf-loan"])) as Record<string, boolean>)
  return (
    <>
      <SectionHeading title="Custom fields">Extra details you want to capture on documents.</SectionHeading>
      <OwnerBanner />
      <SettingsCard
        title="Fields"
        description="Turn a field off to hide it from forms. Values already captured are kept."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={!canEdit} onClick={() => toast("Adding a custom field is mocked in the prototype")}>
              <Plus />
              Add field
            </Button>
            <SaveButton dirty={fields.dirty} blocked={blocked} onSave={() => { fields.commit(); toast.success("Custom fields saved") }} />
          </div>
        }
      >
        <ul className="-my-3 divide-y">
          {CUSTOM_FIELDS.map((f) => (
            <li key={f.id} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <label htmlFor={f.id} className="text-sm font-medium">
                  {f.name}
                </label>
                <p className="text-xs text-muted-foreground">
                  {f.appliesTo} · {f.type}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{fields.value[f.id] ? "Shown" : "Hidden"}</span>
              <Switch id={f.id} checked={fields.value[f.id]} onCheckedChange={(v) => fields.setValue((x) => ({ ...x, [f.id]: v }))} />
            </li>
          ))}
        </ul>
      </SettingsCard>
    </>
  )
}

/* ---------------- Dimensions ---------------- */

function Dimensions() {
  return (
    <>
      <SectionHeading title="Dimensions">Ways to slice your reports beyond accounts.</SectionHeading>
      <SettingsCard title="Branches" description="Every document and journal belongs to one branch, so you can report by branch.">
        <ul className="-my-3 divide-y">
          {BRANCHES.filter((b) => b.id !== "all").map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <span>{b.name}</span>
              <Code>{b.id.toUpperCase()}</Code>
            </li>
          ))}
        </ul>
      </SettingsCard>
      <SettingsCard title="Cost centres" description="An optional tag on journal lines, for splitting costs inside a branch.">
        <ul className="-my-3 divide-y">
          {COST_CENTRES.map((c) => (
            <li key={c} className="py-3 text-sm">
              {c}
            </li>
          ))}
        </ul>
      </SettingsCard>
    </>
  )
}
