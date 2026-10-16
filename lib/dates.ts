import { DEMO_TODAY } from "./constants"
import type { ISODate } from "./types"

export const TODAY: ISODate = "2026-10-05"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function parse(iso: ISODate) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}

export function addDays(iso: ISODate, days: number): ISODate {
  return new Date(parse(iso) + days * 86400000).toISOString().slice(0, 10)
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: ISODate, b: ISODate) {
  return Math.round((parse(b) - parse(a)) / 86400000)
}

/** "5 Oct 2026" */
export function fmtDate(iso?: ISODate) {
  if (!iso) return ""
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** "5 Oct" */
export function fmtShort(iso: ISODate) {
  const [, m, d] = iso.slice(0, 10).split("-").map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

export function monthKey(iso: ISODate) {
  return iso.slice(0, 7)
}

/** "2026-09" → "Sep" or "September 2026" */
export function monthLabel(key: string, long = false) {
  const [y, m] = key.split("-").map(Number)
  return long ? `${MONTHS_LONG[m - 1]} ${y}` : MONTHS[m - 1]
}

export function endOfMonth(key: string): ISODate {
  const [y, m] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

/** "10 days ago", "in 3 days", "today" — always from DEMO_TODAY. */
export function relative(iso: ISODate) {
  const d = daysBetween(TODAY, iso.slice(0, 10))
  if (d === 0) return "today"
  if (d === -1) return "yesterday"
  if (d === 1) return "tomorrow"
  return d < 0 ? `${-d} days ago` : `in ${d} days`
}

/** Datetime "2026-10-04T14:20" → "4 Oct, 14:20" */
export function fmtDateTime(iso: string) {
  return `${fmtShort(iso)}, ${iso.slice(11, 16)}`
}

export { DEMO_TODAY }
