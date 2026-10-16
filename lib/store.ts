"use client"

import { create } from "zustand"
import type { UserId } from "./constants"
import type { NewActionId } from "./actions"

export type OpenForm = { kind: NewActionId; prefill?: Record<string, unknown>; nonce: number } | null

/**
 * UI preferences and session context. Business data (invoices, journals…)
 * gets its own store in stage 2 so creating a record shows up in its list
 * until refresh.
 */
type PrefsState = {
  userId: UserId
  entityId: string
  branchId: string
  /** Shows Dr/Cr columns and account codes by default when on. */
  showAccountingDetail: boolean
  commandOpen: boolean
  /** Lists show as a table or as cards; one choice for every list. */
  tableView: "table" | "cards"
  setTableView: (v: "table" | "cards") => void
  /** The create form currently open, from + New, ⌘K or a page action. */
  form: OpenForm
  openForm: (kind: NewActionId, prefill?: Record<string, unknown>) => void
  closeForm: () => void
  setUser: (id: UserId) => void
  setEntity: (id: string) => void
  setBranch: (id: string) => void
  toggleAccountingDetail: () => void
  setCommandOpen: (open: boolean) => void
}

export const usePrefs = create<PrefsState>((set) => ({
  userId: "ama",
  entityId: "kt",
  branchId: "all",
  showAccountingDetail: false,
  commandOpen: false,
  tableView: "table",
  setTableView: (tableView) => set({ tableView }),
  form: null,
  openForm: (kind, prefill) => set({ form: { kind, prefill, nonce: Date.now() }, commandOpen: false }),
  closeForm: () => set({ form: null }),
  setUser: (userId) => set({ userId }),
  setEntity: (entityId) => set({ entityId }),
  setBranch: (branchId) => set({ branchId }),
  toggleAccountingDetail: () => set((s) => ({ showAccountingDetail: !s.showAccountingDetail })),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}))
