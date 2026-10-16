"use client"

import { useLedger } from "@/lib/ledger"
import { TODAY } from "@/lib/dates"
import type { Journal } from "@/lib/types"

const nextId = (prefix: string, ids: string[], width = 4) => {
  const max = ids.reduce((m, id) => Math.max(m, Number(id.replace(/\D/g, "").slice(-width)) || 0), 0)
  return `${prefix}${String(max + 1).padStart(width, "0")}`
}

/**
 * Posts a balanced journal straight into the books (transfers, revaluations)
 * and logs it in the audit trail. The ledger has no action for these yet, so
 * this writes through useLedger.setState with the same id scheme.
 */
export function postJournal(input: Omit<Journal, "id" | "createdAt" | "status">, auditAction: string): Journal {
  const s = useLedger.getState()
  const j: Journal = { ...input, id: nextId("JE-2026-", s.journals.map((x) => x.id)), status: "posted", createdAt: TODAY }
  const at = `${TODAY}T${new Date().toTimeString().slice(0, 5)}`
  useLedger.setState({
    journals: [...s.journals, j],
    audit: [
      { id: nextId("AU-", s.audit.map((a) => a.id), 5), at, userId: input.createdBy, action: `${auditAction} ${j.id}`, code: "journal.post", entity: j.id, summary: j.memo },
      ...s.audit,
    ],
  })
  return j
}
