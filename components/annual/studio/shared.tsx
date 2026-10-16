"use client"

import * as React from "react"
import { useLedger } from "@/lib/ledger"
import { USERS, type UserId } from "@/lib/constants"
import { fmtDate } from "@/lib/dates"
import { FY2025_FIGURES, useAnnual } from "@/lib/annual/store"
import type { AnnualReport, ReportStatus, SectionType, SignRole } from "@/lib/annual/types"
import type { AnnualFigures } from "@/lib/annual/figures"
import type { Company } from "@/lib/types"
import { StatusBadge, type Status } from "@/components/patterns/status-badge"

/** The company a report belongs to (falls back to the first company). */
export function useCompany(companyId = "kt"): Company {
  const companies = useLedger((s) => s.companies)
  return React.useMemo(() => companies.find((c) => c.id === companyId) ?? companies[0], [companies, companyId])
}

/** A report by id, its figures and its company. `report` is undefined when the id isn't found. */
export function useStudioReport(id: string | null): { report?: AnnualReport; figures: AnnualFigures; company: Company } {
  const report = useAnnual((s) => s.reports.find((r) => r.id === id))
  const company = useCompany(report?.companyId)
  return { report, figures: FY2025_FIGURES, company }
}

const STATUS: Record<ReportStatus, Status> = { draft: "draft", in_review: "in_review", approved: "approved", published: "published" }

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <StatusBadge status={STATUS[status]} />
}

export const userName = (id?: string) => USERS.find((u) => u.id === id)?.name ?? id ?? ""

/** "2026-10-05T09:00" → "5 Oct 2026, 09:00" */
export function fmtStamp(at?: string) {
  if (!at) return ""
  const time = at.slice(11, 16)
  return time ? `${fmtDate(at.slice(0, 10))}, ${time}` : fmtDate(at.slice(0, 10))
}

/** Who may sign at each step of the chain. */
export const SIGN_STEPS: { role: SignRole; label: string; who: string; can: UserId[] }[] = [
  { role: "preparer", label: "Preparer", who: "Anyone on the team", can: ["ama", "kofi", "efua"] },
  { role: "reviewer", label: "Reviewer", who: "Kofi Boateng or Ama Mensah", can: ["kofi", "ama"] },
  { role: "director", label: "Director", who: "Ama Mensah", can: ["ama"] },
]

/** Narrative sections whose main text is empty, so the review can flag them. */
export function emptyFields(type: SectionType, data: Record<string, unknown>): string[] {
  const blank = (k: string) => typeof data[k] === "string" && !(data[k] as string).trim()
  const textKeys: Partial<Record<SectionType, string[]>> = {
    cover: ["title"],
    about: ["body"],
    "agm-notice": ["body", "date", "venue"],
    dividend: ["body"],
    "who-we-are": ["intro", "vision", "mission"],
    chairman: ["name", "body"],
    ceo: ["name", "body"],
    cfo: ["name", "body"],
    governance: ["body"],
    "directors-report": ["body"],
    auditor: ["firm", "body"],
    notes: ["policies"],
  }
  const out = (textKeys[type] ?? []).filter(blank)
  const listKeys: Partial<Record<SectionType, string>> = {
    "agm-notice": "resolutions",
    board: "people",
    management: "people",
    committees: "items",
    highlights: "items",
    shareholders: "holders",
  }
  const lk = listKeys[type]
  if (lk && Array.isArray(data[lk]) && (data[lk] as unknown[]).length === 0) out.push(lk)
  return out
}

/** Read an uploaded file as an object URL. */
export function pickFile(accept: string, onPick: (file: File, url: string) => void) {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = accept
  input.onchange = () => {
    const f = input.files?.[0]
    if (f) onPick(f, URL.createObjectURL(f))
  }
  input.click()
}

export const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`
