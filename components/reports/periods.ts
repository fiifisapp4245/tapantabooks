import type { LedgerState } from "@/lib/ledger"
import { addDays, endOfMonth, fmtDate, monthLabel, TODAY } from "@/lib/dates"
import { ledgerLines } from "@/lib/selectors"

/**
 * Report period presets mapped to date ranges, all relative to DEMO_TODAY
 * (5 Oct 2026). The books start on 1 Jan 2026, so "Last year" is empty.
 */
export type DateRange = { from: string; to: string }

/** Whole-period unit each preset steps back by when comparing. */
type Unit = "month" | "quarter" | "year"

const YEAR = TODAY.slice(0, 4)
const MONTH = TODAY.slice(0, 7)

function shiftMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}

function monthRange(month: string): DateRange {
  return { from: `${month}-01`, to: endOfMonth(month) }
}

function quarterStart(month: string) {
  const [y, m] = month.split("-").map(Number)
  return `${y}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, "0")}`
}

function quarterRange(startMonth: string): DateRange {
  return { from: `${startMonth}-01`, to: endOfMonth(shiftMonths(startMonth, 2)) }
}

const shiftYear = (iso: string, n: number) => `${Number(iso.slice(0, 4)) + n}${iso.slice(4)}`

/** Any posted activity in the range, not counting starting balances. */
export function hasData(s: LedgerState, r: DateRange, branch?: string) {
  return ledgerLines(s, { from: r.from, to: r.to, branch }).some((l) => l.journal.source !== "opening")
}

/** The range a preset covers. */
export function presetRange(s: LedgerState, preset: string, branch?: string): { range: DateRange; unit: Unit } {
  switch (preset) {
    case "this-month":
      return { range: { from: `${MONTH}-01`, to: TODAY }, unit: "month" }
    case "last-month":
      return { range: monthRange(shiftMonths(MONTH, -1)), unit: "month" }
    case "this-quarter": {
      const q = quarterStart(MONTH)
      const current = { from: `${q}-01`, to: TODAY }
      // Q4 has barely started; when it has nothing yet, show the last full quarter.
      if (hasData(s, current, branch)) return { range: current, unit: "quarter" }
      return { range: quarterRange(shiftMonths(q, -3)), unit: "quarter" }
    }
    case "last-year":
      return { range: { from: `${Number(YEAR) - 1}-01-01`, to: `${Number(YEAR) - 1}-12-31` }, unit: "year" }
    case "ytd":
    default:
      return { range: { from: `${YEAR}-01-01`, to: TODAY }, unit: "year" }
  }
}

/** One step back: the whole previous month, quarter or year (same span for year-to-date). */
function stepBack(r: DateRange, unit: Unit): DateRange {
  if (unit === "month") return monthRange(shiftMonths(r.from.slice(0, 7), -1))
  if (unit === "quarter") return quarterRange(shiftMonths(r.from.slice(0, 7), -3))
  return { from: shiftYear(r.from, -1), to: shiftYear(r.to, -1) }
}

/**
 * The comparison range. "Previous period" walks back to the last period
 * that actually has data, so the column is never a row of zeros.
 * Returns null when there's nothing earlier to compare with.
 */
export function compareRange(s: LedgerState, preset: string, compare: string, branch?: string): DateRange | null {
  if (compare === "none") return null
  const { range, unit } = presetRange(s, preset, branch)
  if (compare === "last-year") {
    const r = { from: shiftYear(range.from, -1), to: shiftYear(range.to, -1) }
    return hasData(s, r, branch) ? r : null
  }
  let r = range
  for (let i = 0; i < 12; i++) {
    r = stepBack(r, unit)
    if (r.to < "2025-01-01") return null // history goes back to 1 Jan 2025 (QuickBooks)
    if (hasData(s, r, branch)) return r
  }
  return null
}

/** "September 2026", "1 Jan – 5 Oct 2026", "Q3 2026". */
export function rangeLabel(r: DateRange) {
  const [fy, fm, fd] = r.from.split("-")
  const wholeMonth = fd === "01" && r.to === endOfMonth(r.from.slice(0, 7))
  if (wholeMonth) return monthLabel(`${fy}-${fm}`, true)
  if (r.from.slice(5) === "01-01" && r.to.slice(5) === "12-31" && r.from.slice(0, 4) === r.to.slice(0, 4)) return `Year ${fy}`
  const sameYear = r.from.slice(0, 4) === r.to.slice(0, 4)
  const start = sameYear ? fmtDate(r.from).replace(/ \d{4}$/, "") : fmtDate(r.from)
  return `${start} – ${fmtDate(r.to)}`
}

export const dayBefore = (iso: string) => addDays(iso, -1)
