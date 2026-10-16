"use client"

import * as React from "react"
import { Plus, Scale, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { BRANCHES } from "@/lib/constants"
import { fmtDate, TODAY } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import type { BranchId, JournalLine } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AccountPicker } from "@/components/patterns/pickers"
import { Field, SubmitReason, useDiscardGuard } from "@/components/patterns/form-bits"
import { Money } from "@/components/patterns/money"
import { Term } from "@/components/patterns/text"
import { COST_CENTRES } from "@/components/forms/money-dialog"

type Row = { key: number; accountCode: string; description: string; costCentre: string; debit: string; credit: string }

const NONE = "none"
const r2 = (n: number) => Math.round(n * 100) / 100
const num = (v: string) => Number(v) || 0
const blank = (key: number): Row => ({ key, accountCode: "", description: "", costCentre: NONE, debit: "", credit: "" })
const fmtAmount = (n: number) => (n ? r2(n).toFixed(2) : "")

/**
 * Journal entry: date, reference, memo, branch, then a lines grid. Tab moves
 * across cells; Enter in a row's last cell adds a line and focuses its account.
 */
export function JournalDialog({ open, onClose, prefill }: { open: boolean; onClose: () => void; prefill?: Record<string, unknown> }) {
  const userId = usePrefs((s) => s.userId)
  const saveJournal = useLedger((s) => s.saveJournal)
  const threshold = useLedger((s) => s.settings.approvalThreshold)
  const lockDate = useLedger((s) => s.settings.periodLockDate)

  const initial = React.useMemo(() => {
    const pre = Array.isArray(prefill?.lines) ? (prefill.lines as JournalLine[]) : []
    const rows: Row[] = pre.map((l, i) => ({
      key: i + 1,
      accountCode: l.accountCode,
      description: l.description ?? "",
      costCentre: l.costCentre ?? NONE,
      debit: fmtAmount(l.debit),
      credit: fmtAmount(l.credit),
    }))
    while (rows.length < 2) rows.push(blank(rows.length + 1))
    return {
      date: typeof prefill?.date === "string" ? prefill.date : TODAY,
      reference: typeof prefill?.reference === "string" ? prefill.reference : "",
      memo: typeof prefill?.memo === "string" ? prefill.memo : "",
      branch: (typeof prefill?.branch === "string" ? prefill.branch : "adum") as BranchId,
      rows,
    }
  }, [prefill])
  const [f, setF] = React.useState(initial)
  const dirty = JSON.stringify(f) !== JSON.stringify(initial)
  const guard = useDiscardGuard(dirty, onClose)

  // After adding a line from the keyboard, move focus to its account picker.
  const focusKey = React.useRef<number | null>(null)
  const setFocusKey = (key: number) => {
    focusKey.current = key
    // An existing row is already rendered; a new one is focused after the next render.
    document.getElementById(`je-acc-${key}`)?.focus()
  }
  React.useEffect(() => {
    if (focusKey.current == null) return
    const el = document.getElementById(`je-acc-${focusKey.current}`)
    if (el) {
      el.focus()
      focusKey.current = null
    }
  })

  const setRow = (key: number, patch: Partial<Row>) => setF((x) => ({ ...x, rows: x.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }))
  const addRow = (focus = false) => {
    const key = Math.max(0, ...f.rows.map((r) => r.key)) + 1
    setF((x) => ({ ...x, rows: [...x.rows, blank(key)] }))
    if (focus) setFocusKey(key)
  }
  const removeRow = (key: number) => setF((x) => ({ ...x, rows: x.rows.filter((r) => r.key !== key) }))
  const onAmount = (key: number, side: "debit" | "credit", raw: string) => {
    const v = raw.replace(/[^0-9.]/g, "")
    // A line is either a debit or a credit: typing in one clears the other.
    const other = side === "debit" ? "credit" : "debit"
    setRow(key, v ? { [side]: v, [other]: "" } : { [side]: v })
  }
  const onLastCellKey = (e: React.KeyboardEvent, key: number) => {
    if (e.key !== "Enter") return
    e.preventDefault()
    const idx = f.rows.findIndex((r) => r.key === key)
    if (idx === f.rows.length - 1) addRow(true)
    else setFocusKey(f.rows[idx + 1].key)
  }

  const dr = r2(f.rows.reduce((t, r) => t + num(r.debit), 0))
  const cr = r2(f.rows.reduce((t, r) => t + num(r.credit), 0))
  const diff = r2(dr - cr)
  const balanced = Math.abs(diff) < 0.005 && dr > 0
  const used = f.rows.filter((r) => r.accountCode || num(r.debit) || num(r.credit) || r.description.trim())
  const withAccounts = used.filter((r) => r.accountCode)
  const overThreshold = dr > threshold

  // The last line that has an account, else the last line in the grid.
  const balanceTarget = [...f.rows].reverse().find((r) => r.accountCode) ?? f.rows[f.rows.length - 1]
  const balanceWithLast = () => {
    if (!balanceTarget) return
    const others = f.rows.filter((r) => r.key !== balanceTarget.key).reduce((t, r) => t + num(r.debit) - num(r.credit), 0)
    const need = r2(-others)
    setRow(balanceTarget.key, need >= 0 ? { debit: fmtAmount(need), credit: "" } : { debit: "", credit: fmtAmount(-need) })
  }

  const reason = !f.memo.trim()
    ? "Add a memo"
    : !f.date
      ? "Choose a date"
      : f.date <= lockDate
        ? `${fmtDate(lockDate)} and earlier are locked`
        : used.some((r) => !r.accountCode)
          ? "Choose an account on every line"
          : used.some((r) => !num(r.debit) && !num(r.credit))
            ? "Enter a debit or credit on every line"
            : withAccounts.length < 2
              ? "Add at least two lines with accounts"
              : !balanced
                ? dr === 0
                  ? "Enter the amounts"
                  : `Out by ${formatMoney(Math.abs(diff))}`
                : null
  const draftReason = !dirty ? "Nothing entered yet" : null

  const save = (mode: "draft" | "post") => {
    const lines: JournalLine[] = withAccounts.map((r) => ({
      accountCode: r.accountCode,
      description: r.description.trim() || undefined,
      debit: r2(num(r.debit)),
      credit: r2(num(r.credit)),
      costCentre: r.costCentre === NONE ? undefined : r.costCentre,
    }))
    const j = saveJournal({ date: f.date, reference: f.reference.trim() || undefined, memo: f.memo.trim() || "Draft journal", branch: f.branch, lines }, mode, userId)
    if (j.status === "draft") toast.success(`Draft ${j.id} saved`, { description: "Nothing posts to the books until it's posted." })
    else if (j.status === "awaiting_approval")
      toast.success(`${j.id} submitted for approval`, { description: `Over the ${formatMoney(threshold, "GHS", { whole: true })} threshold, so a second person must approve it.` })
    else toast.success(`${j.id} posted`, { description: `${formatMoney(dr)} entered in the books.` })
    onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && guard.request()}>
        <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="font-heading text-xl">New journal entry</DialogTitle>
            <DialogDescription>
              Move amounts between accounts by hand. <Term term="Debits must equal credits">Both sides must match</Term> before it can post.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Date" htmlFor="je-date">
                <Input id="je-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="bg-card" />
              </Field>
              <Field label="Reference" htmlFor="je-ref">
                <Input id="je-ref" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="Optional" className="bg-card" />
              </Field>
              <Field label="Branch">
                <Select value={f.branch} onValueChange={(v) => setF({ ...f, branch: v as BranchId })}>
                  <SelectTrigger className="w-full bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BRANCHES.slice(1).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Memo" htmlFor="je-memo" className="sm:col-span-2 lg:col-span-4">
                <Input id="je-memo" autoFocus value={f.memo} onChange={(e) => setF({ ...f, memo: e.target.value })} placeholder="What this entry is for, e.g. Accrue September electricity" className="bg-card" />
              </Field>
            </div>

            <div className="space-y-2">
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                      <th className="h-9 w-[260px] px-3 text-left font-medium">Account</th>
                      <th className="h-9 px-3 text-left font-medium">Description</th>
                      <th className="h-9 w-[150px] px-3 text-left font-medium">Cost centre</th>
                      <th className="h-9 w-[130px] px-3 text-right font-medium"><Term term="Debit">Debit</Term></th>
                      <th className="h-9 w-[130px] px-3 text-right font-medium"><Term term="Credit">Credit</Term></th>
                      <th className="h-9 w-11" aria-label="Remove" />
                    </tr>
                  </thead>
                  <tbody>
                    {f.rows.map((r, i) => (
                      <tr key={r.key} className="border-b last:border-b-0">
                        <td className="px-2 py-2">
                          <AccountPicker id={`je-acc-${r.key}`} value={r.accountCode} onChange={(v) => setRow(r.key, { accountCode: v })} placeholder="Choose" />
                        </td>
                        <td className="px-2 py-2">
                          <Input aria-label={`Line ${i + 1} description`} value={r.description} onChange={(e) => setRow(r.key, { description: e.target.value })} placeholder="Optional" className="bg-card" />
                        </td>
                        <td className="px-2 py-2">
                          <Select value={r.costCentre} onValueChange={(v) => setRow(r.key, { costCentre: v })}>
                            <SelectTrigger className="w-full bg-card" aria-label={`Line ${i + 1} cost centre`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>None</SelectItem>
                              {COST_CENTRES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-2">
                          <Input aria-label={`Line ${i + 1} debit`} inputMode="decimal" value={r.debit} onChange={(e) => onAmount(r.key, "debit", e.target.value)} onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} placeholder="0.00" className="bg-card text-right tabular" />
                        </td>
                        <td className="px-2 py-2">
                          <Input aria-label={`Line ${i + 1} credit`} inputMode="decimal" value={r.credit} onChange={(e) => onAmount(r.key, "credit", e.target.value)} onKeyDown={(e) => onLastCellKey(e, r.key)} placeholder="0.00" className="bg-card text-right tabular" />
                        </td>
                        <td className="px-1 py-2">
                          <Button variant="ghost" size="icon" tabIndex={-1} aria-label={`Remove line ${i + 1}`} disabled={f.rows.length <= 2} onClick={() => removeRow(r.key)}>
                            <Trash2 />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" className="bg-card" onClick={() => addRow(true)}>
                  <Plus />
                  Add line
                </Button>
                <span className="text-xs text-muted-foreground">Tip: press Enter in the Credit cell to add a line.</span>
              </div>
            </div>
          </div>

          {/* Sticky footer: totals, live balance, actions. */}
          <div className="space-y-3 rounded-b-xl border-t bg-muted/50 px-6 py-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                {balanced ? (
                  <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-success-soft px-2.5 text-xs font-medium text-success">
                    <span className="size-1.5 rounded-full bg-success" aria-hidden />
                    Balanced
                  </span>
                ) : (
                  <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium", dr || cr ? "bg-warning-soft text-warning" : "bg-neutral-soft text-muted-foreground")}>
                    <span className={cn("size-1.5 rounded-full", dr || cr ? "bg-warning" : "bg-muted-foreground/60")} aria-hidden />
                    {dr || cr ? `Out by ${formatMoney(Math.abs(diff))}` : "No amounts yet"}
                  </span>
                )}
                {!balanced && Math.abs(diff) >= 0.005 && (
                  <Button variant="ghost" size="sm" onClick={balanceWithLast}>
                    <Scale />
                    Balance with last line
                  </Button>
                )}
              </div>
              <dl className="ml-auto flex items-center gap-5 text-sm">
                <div className="flex items-baseline gap-2">
                  <dt className="text-muted-foreground">Debits</dt>
                  <dd><Money amount={dr} /></dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="text-muted-foreground">Credits</dt>
                  <dd><Money amount={cr} /></dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SubmitReason reason={reason ?? (overThreshold ? `Over the ${formatMoney(threshold, "GHS", { whole: true })} approval threshold` : null)} />
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={guard.request}>Cancel</Button>
                <Button variant="outline" disabled={!!draftReason} onClick={() => save("draft")}>Save draft</Button>
                <Button disabled={!!reason} onClick={() => save("post")}>{overThreshold ? "Submit for approval" : "Post entry"}</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {guard.dialog}
    </>
  )
}
