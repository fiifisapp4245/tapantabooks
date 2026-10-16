"use client"

import * as React from "react"
import { BookCheck, FileText, ImagePlus, Plus, RefreshCcw, Trash2, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useAnnual } from "@/lib/annual/store"
import { draftCfoStatement, draftDirectorsReport } from "@/lib/annual/defaults"
import type { AnnualFigures } from "@/lib/annual/figures"
import { FROM_THE_BOOKS, type AnnualReport, type Person, type Section, type SectionData, type SectionType } from "@/lib/annual/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Field } from "@/components/patterns/form-bits"
import { Money } from "@/components/patterns/money"
import { newId, pickFile } from "./shared"

const BODY_HINT = 'Leave a blank line between paragraphs. Start a line with "## " to make it a subheading.'

type EditorProps<T extends SectionType> = {
  section: Section<T>
  data: SectionData[T]
  set: (patch: Partial<SectionData[T]>) => void
  figures: AnnualFigures
  report: AnnualReport
}

/* ---------------- small building blocks ---------------- */

function Text({ label, value, onChange, hint, placeholder }: { label: string; value: string; onChange: (v: string) => void; hint?: React.ReactNode; placeholder?: string }) {
  const id = React.useId()
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <Input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}

function Body({ label = "Text", value, onChange, rows = 14, hint = BODY_HINT }: { label?: string; value: string; onChange: (v: string) => void; rows?: number; hint?: React.ReactNode }) {
  const id = React.useId()
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <Textarea id={id} value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className="min-h-0 font-sans text-[13px] leading-relaxed" />
    </Field>
  )
}

/** One value per line, e.g. company values or bankers. */
function Lines({ label, value, onChange, hint = "One per line." }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string }) {
  const id = React.useId()
  // Keep the raw text while typing so blank lines don't vanish under the cursor.
  const [raw, setRaw] = React.useState(value.join("\n"))
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <Textarea
        id={id}
        value={raw}
        rows={Math.max(3, value.length + 1)}
        onChange={(e) => {
          setRaw(e.target.value)
          onChange(e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))
        }}
        className="min-h-0 text-[13px]"
      />
    </Field>
  )
}

function Photo({ label = "Photo", photo, onChange }: { label?: string; photo?: string; onChange: (url?: string) => void }) {
  return (
    <Field label={label} hint="A head-and-shoulders photo works best. Without one, the page shows initials.">
      <div className="flex items-center gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => pickFile("image/*", (_, url) => onChange(url))}>
          <Upload />
          {photo ? "Replace" : "Upload"}
        </Button>
        {photo && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Remove
          </Button>
        )}
      </div>
    </Field>
  )
}

/** A list of items, each with its own fields, separated by lines in one box. */
function ListEditor<T extends { id: string }>({
  label,
  items,
  onChange,
  make,
  addLabel,
  itemLabel,
  render,
}: {
  label: string
  items: T[]
  onChange: (items: T[]) => void
  make: () => T
  addLabel: string
  itemLabel: (item: T, i: number) => string
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode
}) {
  const update = (id: string, patch: Partial<T>) => onChange(items.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium">{label}</p>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      {items.length > 0 && (
        <ol className="divide-y rounded-lg border">
          {items.map((item, i) => (
            <li key={item.id} className="flex flex-col gap-3 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-muted-foreground">{itemLabel(item, i)}</span>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${itemLabel(item, i)}`} onClick={() => onChange(items.filter((x) => x.id !== item.id))}>
                  <Trash2 />
                </Button>
              </div>
              {render(item, (patch) => update(item.id, patch))}
            </li>
          ))}
        </ol>
      )}
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => onChange([...items, make()])}>
        <Plus />
        {addLabel}
      </Button>
    </div>
  )
}

/* ---------------- editors by type ---------------- */

function Statement({ section, data, set, figures }: EditorProps<"chairman" | "ceo" | "cfo">) {
  const [asking, setAsking] = React.useState(false)
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Text label="Name" value={data.name} onChange={(name) => set({ name })} />
        <Text label="Role" value={data.role} onChange={(role) => set({ role })} />
      </div>
      <Photo photo={data.photo} onChange={(photo) => set({ photo })} />
      {section.type === "cfo" && <RedraftRow onClick={() => setAsking(true)} />}
      <Body value={data.body} onChange={(body) => set({ body })} rows={18} />
      <RedraftConfirm open={asking} onOpenChange={setAsking} onConfirm={() => set({ body: draftCfoStatement(figures) })} />
    </>
  )
}

function RedraftRow({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-y py-3">
      <p className="text-xs text-muted-foreground">Figures changed? Write this again from the year&apos;s numbers.</p>
      <Button type="button" variant="outline" size="sm" onClick={onClick}>
        <RefreshCcw />
        Redraft from the numbers
      </Button>
    </div>
  )
}

function RedraftConfirm({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Replace the text with a new draft?</AlertDialogTitle>
          <AlertDialogDescription>We&apos;ll write it again from the 2025 figures. Anything you changed by hand in this section will be lost.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep my text</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm()
              toast.success("Redrafted from the numbers")
            }}
          >
            Replace text
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DirectorsReport({ data, set, figures }: EditorProps<"directors-report">) {
  const [asking, setAsking] = React.useState(false)
  return (
    <>
      <RedraftRow onClick={() => setAsking(true)} />
      <Body value={data.body} onChange={(body) => set({ body })} rows={22} />
      <RedraftConfirm open={asking} onOpenChange={setAsking} onConfirm={() => set({ body: draftDirectorsReport(figures) })} />
    </>
  )
}

function People({ data, set, section }: EditorProps<"board" | "management">) {
  const board = section.type === "board"
  return (
    <>
      <Body label="Introduction" value={data.intro} onChange={(intro) => set({ intro })} rows={3} hint={undefined} />
      <ListEditor<Person>
        label={board ? "Directors" : "Team members"}
        items={data.people}
        onChange={(people) => set({ people })}
        make={() => ({ id: newId("p"), name: "", role: "", bio: "" })}
        addLabel={board ? "Add a director" : "Add a person"}
        itemLabel={(p, i) => p.name || `Person ${i + 1}`}
        render={(p, up) => (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Text label="Name" value={p.name} onChange={(name) => up({ name })} />
              <Text label="Role" value={p.role} onChange={(role) => up({ role })} />
            </div>
            {board && (
              <div className="grid grid-cols-2 gap-3">
                <Text label="Appointed" value={p.appointed ?? ""} placeholder="March 2023" onChange={(appointed) => up({ appointed })} />
                <Text label="Qualifications" value={p.qualifications ?? ""} onChange={(qualifications) => up({ qualifications })} />
              </div>
            )}
            <Body label="Short bio" value={p.bio} onChange={(bio) => up({ bio })} rows={3} hint={undefined} />
            <Photo photo={p.photo} onChange={(photo) => up({ photo })} />
          </>
        )}
      />
    </>
  )
}

function AgmNotice({ data, set }: EditorProps<"agm-notice">) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Text label="Which meeting" value={data.agmNumber} placeholder="Third" onChange={(agmNumber) => set({ agmNumber })} />
        <Text label="Time" value={data.time} onChange={(time) => set({ time })} />
      </div>
      <Text label="Date" value={data.date} onChange={(date) => set({ date })} />
      <Text label="Venue" value={data.venue} onChange={(venue) => set({ venue })} />
      <Body label="Opening paragraph" value={data.body} onChange={(body) => set({ body })} rows={4} />
      <ListEditor
        label="Resolutions"
        items={data.resolutions}
        onChange={(resolutions) => set({ resolutions })}
        make={() => ({ id: newId("r"), kind: "ordinary" as const, text: "" })}
        addLabel="Add a resolution"
        itemLabel={(r, i) => `Resolution ${i + 1}`}
        render={(r, up) => (
          <>
            <Field label="Kind" hint="Special resolutions need a 75% majority.">
              <Select value={r.kind} onValueChange={(kind) => up({ kind: kind as "ordinary" | "special" })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordinary">Ordinary</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Body label="Wording" value={r.text} onChange={(text) => up({ text })} rows={3} hint={undefined} />
          </>
        )}
      />
    </>
  )
}

function Dividend({ data, set, figures }: EditorProps<"dividend">) {
  const id = React.useId()
  return (
    <>
      <Field
        label="Final dividend per share (GH₵)"
        htmlFor={id}
        hint={
          <>
            {figures.sharesInIssue.toLocaleString("en-GB")} shares in issue, so the total is <Money amount={data.perShare * figures.sharesInIssue} size="sm" />.
          </>
        }
      >
        <Input id={id} type="number" step="0.01" min="0" value={data.perShare} onChange={(e) => set({ perShare: Number(e.target.value) || 0 })} className="w-40 tabular" />
      </Field>
      <Text label="Last day to buy with the dividend (ex-dividend date)" value={data.exDate} onChange={(exDate) => set({ exDate })} />
      <Text label="Qualifying date" value={data.qualifyingDate} onChange={(qualifyingDate) => set({ qualifyingDate })} />
      <Text label="Payment date" value={data.paymentDate} onChange={(paymentDate) => set({ paymentDate })} />
      <Body value={data.body} onChange={(body) => set({ body })} rows={6} />
    </>
  )
}

function Auditor({ data, set }: EditorProps<"auditor">) {
  return (
    <>
      <Text label="Audit firm" value={data.firm} onChange={(firm) => set({ firm })} />
      <div className="grid grid-cols-2 gap-3">
        <Text label="Engagement partner" value={data.partner} onChange={(partner) => set({ partner })} />
        <Text label="Licence number" value={data.licence} onChange={(licence) => set({ licence })} />
      </div>
      <Text label="Signed on" value={data.signedOn} onChange={(signedOn) => set({ signedOn })} />
      <Field label="Signed report (PDF)" hint="Attach the copy your auditor signed. The text below is what prints in the report.">
        {data.fileName ? (
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <a href={data.fileUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline">
              {data.fileName}
            </a>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove the PDF" onClick={() => set({ fileName: undefined, fileUrl: undefined })}>
              <X />
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => pickFile("application/pdf", (f, url) => set({ fileName: f.name, fileUrl: url }))}>
            <Upload />
            Upload PDF
          </Button>
        )}
      </Field>
      <Body label="Opinion and report" value={data.body} onChange={(body) => set({ body })} rows={18} />
    </>
  )
}

function Shareholders({ data, set, figures }: EditorProps<"shareholders">) {
  const listed = data.holders.reduce((t, h) => t + (h.shares || 0), 0)
  const fmt = (n: number) => n.toLocaleString("en-GB")
  return (
    <>
      <Body label="Introduction" value={data.intro} onChange={(intro) => set({ intro })} rows={3} hint={undefined} />
      <ListEditor
        label="Shareholders"
        items={data.holders}
        onChange={(holders) => set({ holders })}
        make={() => ({ id: newId("s"), name: "", shares: 0 })}
        addLabel="Add a shareholder"
        itemLabel={(h, i) => h.name || `Shareholder ${i + 1}`}
        render={(h, up) => (
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <Text label="Name" value={h.name} onChange={(name) => up({ name })} />
            <Field label="Shares">
              <Input type="number" min="0" value={h.shares} onChange={(e) => up({ shares: Number(e.target.value) || 0 })} className="tabular" />
            </Field>
          </div>
        )}
      />
      <p className={cn("text-xs", listed === figures.sharesInIssue ? "text-muted-foreground" : "text-warning")}>
        {fmt(listed)} of {fmt(figures.sharesInIssue)} shares in issue listed
        {listed !== figures.sharesInIssue && ". The table on the page won't add up to the shares in issue."}
      </p>
    </>
  )
}

function Administration({ data, set }: EditorProps<"administration">) {
  return (
    <>
      <Body label="Registered office" value={data.registeredOffice} onChange={(registeredOffice) => set({ registeredOffice })} rows={3} hint={undefined} />
      <div className="grid grid-cols-2 gap-3">
        <Text label="Registration number" value={data.registrationNumber} onChange={(registrationNumber) => set({ registrationNumber })} />
        <Text label="TIN" value={data.tin} onChange={(tin) => set({ tin })} />
      </div>
      <Text label="Company secretary" value={data.secretary} onChange={(secretary) => set({ secretary })} />
      <Text label="Auditors" value={data.auditors} onChange={(auditors) => set({ auditors })} />
      <Lines label="Bankers" value={data.bankers} onChange={(bankers) => set({ bankers })} />
      <Text label="Solicitors" value={data.solicitors} onChange={(solicitors) => set({ solicitors })} />
    </>
  )
}

/* ---------------- from the books ---------------- */

function FigureRows({ rows }: { rows: { label: string; amount: number; decimals?: boolean }[] }) {
  return (
    <dl className="divide-y rounded-lg border">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3 px-3 py-2.5">
          <dt className="text-sm text-muted-foreground">{r.label}</dt>
          <dd>
            <Money amount={r.amount} whole={!r.decimals} negativeHint="Money out, or a reduction" />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function keyFigures(type: SectionType, f: AnnualFigures): { label: string; amount: number; decimals?: boolean }[] {
  const { cur } = f.pl
  switch (type) {
    case "sci":
      return [
        { label: "Revenue", amount: cur.revenue },
        { label: "Profit before tax", amount: cur.profitBeforeTax },
        { label: "Profit for the year", amount: cur.profitForYear },
        { label: "Earnings per share", amount: cur.eps, decimals: true },
      ]
    case "sofp":
      return [
        { label: "Total assets", amount: f.bs.cur.totalAssets },
        { label: "Total liabilities", amount: f.bs.cur.totalLiabilities },
        { label: "Total equity", amount: f.bs.cur.totalEquity },
        { label: "Cash and cash equivalents", amount: f.bs.cur.cash },
      ]
    case "soce":
      return [
        { label: `Retained earnings at 1 Jan ${f.year}`, amount: f.bs.prev.retained },
        { label: "Profit for the year", amount: cur.profitForYear },
        { label: "Dividends paid", amount: -f.dividends.paid2025 },
        { label: `Retained earnings at 31 Dec ${f.year}`, amount: f.bs.cur.retained },
      ]
    case "socf":
      return [
        { label: "Net cash from operations", amount: f.cashflow.netOperating },
        { label: "Net cash used in investing", amount: f.cashflow.netInvesting },
        { label: "Net cash used in financing", amount: f.cashflow.netFinancing },
        { label: `Cash at 31 Dec ${f.year}`, amount: f.cashflow.closingCash },
      ]
    case "five-year":
      return f.history.map((h) => ({ label: `Revenue ${h.year}`, amount: h.revenue }))
    case "salient":
      return f.salient.filter((s) => ["revenue", "profitForYear", "cash"].includes(s.key)).map((s) => ({ label: s.label, amount: s.values[2] }))
    case "notes":
      return [
        { label: "Property, plant and equipment", amount: f.bs.cur.ppe },
        { label: "Borrowings", amount: f.bs.cur.totalLiabilities },
      ]
    default:
      return []
  }
}

function FromTheBooks({ section, figures, children, pageCount }: { section: Section; figures: AnnualFigures; children?: React.ReactNode; pageCount: number }) {
  const passed = figures.checks.filter((c) => c.ok).length
  const rows = keyFigures(section.type, figures)
  return (
    <>
      <div className="flex gap-3 rounded-lg bg-muted/60 p-3">
        <BookCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1 text-sm">
          <p className="font-medium">Built from your books</p>
          <p className="text-muted-foreground">
            {section.type === "contents"
              ? `The contents list every section you include, with the page it starts on. It updates on its own as you add, remove or reorder sections. The report is ${pageCount} pages now.`
              : "Every figure here comes straight from the closed 2025 ledger, so it can't be typed over or drift from the accounts. To change a number, correct the books."}
          </p>
        </div>
      </div>
      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium">Key figures</p>
          <FigureRows rows={rows} />
        </div>
      )}
      {section.type !== "contents" && (
        <p className={cn("text-xs", passed === figures.checks.length ? "text-success" : "text-warning")}>
          Checks passed {passed} of {figures.checks.length}. See the Review stage for each one.
        </p>
      )}
      {children}
    </>
  )
}

/* ---------------- the editor ---------------- */

export function SectionEditor({ report, section, figures, pageCount }: { report: AnnualReport; section: Section; figures: AnnualFigures; pageCount: number }) {
  const updateSection = useAnnual((s) => s.updateSection)
  const renameSection = useAnnual((s) => s.renameSection)
  const set = (patch: object) => updateSection(report.id, section.id, patch)
  // Every editor gets the same props; each one reads its own type's data.
  const props = { section, data: section.data, set, figures, report } as never
  const d = section.data as Record<string, never>

  const body = (() => {
    switch (section.type) {
      case "cover":
        return (
          <>
            <Text label="Title" value={d.title} onChange={(title) => set({ title })} />
            <Text label="Subtitle" value={d.subtitle} onChange={(subtitle) => set({ subtitle })} />
            <p className="text-xs text-muted-foreground">The cover colour, pattern and photo are set in the Design stage.</p>
          </>
        )
      case "about":
      case "governance":
        return <Body value={d.body} onChange={(body) => set({ body })} rows={20} />
      case "agm-notice":
        return <AgmNotice {...(props as EditorProps<"agm-notice">)} />
      case "proxy-form":
        return (
          <>
            <Text label="Return completed forms by" value={d.returnBy} onChange={(returnBy) => set({ returnBy })} />
            <p className="text-xs text-muted-foreground">The rest of the form fills in from the AGM notice and the resolutions.</p>
          </>
        )
      case "dividend":
        return <Dividend {...(props as EditorProps<"dividend">)} />
      case "who-we-are":
        return (
          <>
            <Body label="Introduction" value={d.intro} onChange={(intro) => set({ intro })} rows={5} />
            <Body label="Vision" value={d.vision} onChange={(vision) => set({ vision })} rows={2} hint={undefined} />
            <Body label="Mission" value={d.mission} onChange={(mission) => set({ mission })} rows={2} hint={undefined} />
            <Lines label="Values" value={d.values} onChange={(values) => set({ values })} hint="One value per line." />
          </>
        )
      case "highlights":
        return (
          <ListEditor<SectionData["highlights"]["items"][number]>
            label="Highlights"
            items={d.items}
            onChange={(items) => set({ items })}
            make={() => ({ id: newId("h"), value: "", unit: "", caption: "" })}
            addLabel="Add a highlight"
            itemLabel={(h, i) => (h.value ? `${h.value} ${h.unit}` : `Highlight ${i + 1}`)}
            render={(h, up) => (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Text label="Big number" value={h.value} placeholder="12,400" onChange={(value) => up({ value })} />
                  <Text label="Unit" value={h.unit} placeholder="deliveries" onChange={(unit) => up({ unit })} />
                </div>
                <Text label="Caption" value={h.caption} onChange={(caption) => up({ caption })} />
              </>
            )}
          />
        )
      case "chairman":
      case "ceo":
      case "cfo":
        return <Statement {...(props as EditorProps<"chairman">)} />
      case "board":
      case "management":
        return <People {...(props as EditorProps<"board">)} />
      case "directors-report":
        return <DirectorsReport {...(props as EditorProps<"directors-report">)} />
      case "committees":
        return (
          <ListEditor<SectionData["committees"]["items"][number]>
            label="Committees"
            items={d.items}
            onChange={(items) => set({ items })}
            make={() => ({ id: newId("c"), name: "", chair: "", body: "" })}
            addLabel="Add a committee"
            itemLabel={(c, i) => c.name || `Committee ${i + 1}`}
            render={(c, up) => (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Text label="Name" value={c.name} onChange={(name) => up({ name })} />
                  <Text label="Chair" value={c.chair} onChange={(chair) => up({ chair })} />
                </div>
                <Body label="Report" value={c.body} onChange={(body) => up({ body })} rows={5} />
              </>
            )}
          />
        )
      case "auditor":
        return <Auditor {...(props as EditorProps<"auditor">)} />
      case "notes":
        return (
          <FromTheBooks section={section} figures={figures} pageCount={pageCount}>
            <Body label="Accounting policies" value={d.policies} onChange={(policies) => set({ policies })} rows={16} hint={`Only the policies are written by you; the numbered notes come from the books. ${BODY_HINT}`} />
          </FromTheBooks>
        )
      case "salient":
        return (
          <FromTheBooks section={section} figures={figures} pageCount={pageCount}>
            <Body label="Introduction" value={d.intro} onChange={(intro) => set({ intro })} rows={3} hint={undefined} />
          </FromTheBooks>
        )
      case "shareholders":
        return <Shareholders {...(props as EditorProps<"shareholders">)} />
      case "administration":
        return <Administration {...(props as EditorProps<"administration">)} />
      default:
        return <FromTheBooks section={section} figures={figures} pageCount={pageCount} />
    }
  })()

  const fromBooks = FROM_THE_BOOKS.includes(section.type)
  return (
    <div className="flex flex-col gap-5">
      {!fromBooks && (
        <Text label="Section title" value={section.title} onChange={(t) => renameSection(report.id, section.id, t)} hint="Shown on the page and in the contents." />
      )}
      {body}
    </div>
  )
}
