"use client"

import { BRANCHES, USERS } from "@/lib/constants"
import { TODAY } from "@/lib/dates"
import type { AuditEvent } from "@/lib/types"

/** Next id after the highest existing one: BILL-0078, JE-2026-0355, PAY-0102. */
export function nextId(prefix: string, ids: string[], width = 4) {
  const max = ids.reduce((m, id) => Math.max(m, Number(id.replace(/\D/g, "").slice(-width)) || 0), 0)
  return `${prefix}${String(max + 1).padStart(width, "0")}`
}

export const nextJournalId = (ids: string[]) => nextId("JE-2026-", ids)

export const branchName = (id?: string) => BRANCHES.find((b) => b.id === id)?.name ?? "—"

export const branchOptions = BRANCHES.slice(1).map((b) => ({ value: b.id as string, label: b.name as string }))

export const userName = (id?: string) => (id === "system" ? "System (integration)" : USERS.find((u) => u.id === id)?.name ?? "—")

/** An audit-trail row, shaped like the ones the ledger store writes. */
export function auditEvent(existing: AuditEvent[], userId: string, action: string, code: string, entity: string, summary: string): AuditEvent {
  return {
    id: nextId("AU-", existing.map((a) => a.id), 5),
    at: `${TODAY}T${new Date().toTimeString().slice(0, 5)}`,
    userId,
    action,
    code,
    entity,
    summary,
  }
}

export const r2 = (n: number) => Math.round(n * 100) / 100
