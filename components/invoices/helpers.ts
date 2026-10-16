import { BRANCHES } from "@/lib/constants"
import { relative } from "@/lib/dates"
import type { Status } from "@/components/patterns/status-badge"

export const branchName = (id: string) => BRANCHES.find((b) => b.id === id)?.name ?? id

export const isOpenStatus = (s: Status) => s === "unpaid" || s === "part_paid" || s === "overdue"

/** "in 4 days", "today" or "12 days overdue" — only for items still waiting to be paid. */
export function dueHint(r: { status: Status; daysOverdue: number; dueDate: string }) {
  if (!isOpenStatus(r.status)) return undefined
  if (r.status === "overdue") return `${r.daysOverdue} ${r.daysOverdue === 1 ? "day" : "days"} overdue`
  return relative(r.dueDate)
}

export const PAYMENT_DETAILS = {
  momo: { label: "MTN MoMo merchant", value: "024 555 0118", name: "Kumasi Traders Ltd" },
  bank: { label: "GCB Bank", value: "1021 4471 0013", branch: "Adum branch" },
}

/** A pretend pay link for the prototype. */
export const paymentLink = (invoiceId: string) => `https://pay.tapanta.app/kumasi-traders/${invoiceId.toLowerCase()}`
