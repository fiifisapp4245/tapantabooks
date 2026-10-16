"use client"

import { create } from "zustand"
import * as seed from "@/lib/mock/seed"
import type { LedgerState } from "@/lib/ledger"
import { TODAY } from "@/lib/dates"
import { annualFigures } from "./figures"
import { defaultReport } from "./defaults"
import type { AnnualReport, Section, SectionData, SectionType, SignRole, Theme } from "./types"
import { THEMES } from "./types"
import { templateById, TEMPLATES } from "./templates"

/** FY2025 is closed, so its figures are fixed: computed once from the seeded books. */
export const FY2025_FIGURES = annualFigures({ accounts: seed.ACCOUNTS, journals: seed.JOURNALS } as unknown as LedgerState)

const now = () => `${TODAY}T${new Date().toTimeString().slice(0, 5)}`

/** One row of the table of contents chosen before the report is created. */
export type TocChoice = { id: string; enabled: boolean; title: string }

/**
 * Every available section in its natural place, switched on when the template
 * includes it — so the contents step can offer them all, already in order.
 */
export function templateToc(templateId: string): TocChoice[] {
  const t = templateById(templateId) ?? TEMPLATES[0]
  return defaultReport(FY2025_FIGURES).sections.map((x) => ({ id: x.id, enabled: t.sections.includes(x.type), title: x.title }))
}

type AnnualState = {
  reports: AnnualReport[]
  /** Create the FY2025 report from a template and the chosen table of contents. Returns its id. */
  createReport: (templateId: string, toc: TocChoice[]) => string
  /** Change the table of contents of an existing report. */
  setToc: (reportId: string, toc: TocChoice[]) => void
  deleteReport: (reportId: string) => void
  updateSection: <T extends SectionType>(reportId: string, sectionId: string, patch: Partial<SectionData[T]>) => void
  renameSection: (reportId: string, sectionId: string, title: string) => void
  toggleSection: (reportId: string, sectionId: string, enabled: boolean) => void
  moveSection: (reportId: string, sectionId: string, dir: -1 | 1) => void
  setTheme: (reportId: string, patch: Partial<Theme>) => void
  /** Sign in order: preparer → reviewer → director. The director's sign-off approves the report. */
  sign: (reportId: string, role: SignRole, userId: string) => void
  /** Clear every sign-off so the report can be edited again. */
  reopen: (reportId: string) => void
  submitForReview: (reportId: string) => void
  publish: (reportId: string) => void
}

const touch = (r: AnnualReport): AnnualReport => ({ ...r, updatedAt: now() })

export const useAnnual = create<AnnualState>((set) => {
  const edit = (reportId: string, fn: (r: AnnualReport) => AnnualReport) =>
    set((s) => ({ reports: s.reports.map((r) => (r.id === reportId ? touch(fn(r)) : r)) }))

  return {
    // No report until the user picks a template.
    reports: [],

    createReport: (templateId, toc) => {
      const t = templateById(templateId) ?? TEMPLATES[0]
      const base = defaultReport(FY2025_FIGURES)
      const report: AnnualReport = {
        ...base,
        id: `ar-${FY2025_FIGURES.year}-${Date.now().toString(36)}`,
        templateId: t.id,
        sections: applyToc(base.sections, toc),
        theme: { ...THEMES[t.preset], pattern: t.pattern },
        updatedAt: now(),
      }
      set((s) => ({ reports: [...s.reports, report] }))
      return report.id
    },

    setToc: (reportId, toc) => edit(reportId, (r) => ({ ...r, sections: applyToc(r.sections, toc) })),

    deleteReport: (reportId) => set((s) => ({ reports: s.reports.filter((r) => r.id !== reportId) })),

    updateSection: (reportId, sectionId, patch) =>
      edit(reportId, (r) => ({ ...r, sections: r.sections.map((x) => (x.id === sectionId ? { ...x, data: { ...x.data, ...patch } } : x)) as AnnualReport["sections"] })),

    renameSection: (reportId, sectionId, title) =>
      edit(reportId, (r) => ({ ...r, sections: r.sections.map((x) => (x.id === sectionId ? { ...x, title } : x)) })),

    toggleSection: (reportId, sectionId, enabled) =>
      edit(reportId, (r) => ({ ...r, sections: r.sections.map((x) => (x.id === sectionId ? { ...x, enabled } : x)) })),

    // Sections only move within their own part, so the report keeps its shape.
    moveSection: (reportId, sectionId, dir) =>
      edit(reportId, (r) => {
        const i = r.sections.findIndex((x) => x.id === sectionId)
        const j = i + dir
        if (j < 0 || j >= r.sections.length || r.sections[j].part !== r.sections[i].part) return r
        const next = [...r.sections]
        ;[next[i], next[j]] = [next[j], next[i]]
        return { ...r, sections: next }
      }),

    setTheme: (reportId, patch) => edit(reportId, (r) => ({ ...r, theme: { ...r.theme, ...patch } })),

    sign: (reportId, role, userId) =>
      edit(reportId, (r) => {
        const signoffs = r.signoffs.map((x) => (x.role === role ? { ...x, userId, at: now() } : x))
        const allSigned = signoffs.every((x) => x.userId)
        return { ...r, signoffs, status: allSigned ? "approved" : "in_review" }
      }),

    reopen: (reportId) => edit(reportId, (r) => ({ ...r, status: "draft", signoffs: r.signoffs.map((x) => ({ role: x.role })), publishedAt: undefined })),

    submitForReview: (reportId) => edit(reportId, (r) => ({ ...r, status: "in_review" })),

    publish: (reportId) => edit(reportId, (r) => ({ ...r, status: "published", publishedAt: now() })),
  }
})

/** Editing is locked once anyone has signed, until the report is reopened. */
export const isLocked = (r: AnnualReport) => r.signoffs.some((x) => x.userId) || r.status === "published"

/** Reorder, rename and switch sections to match a table of contents. */
function applyToc(sections: Section[], toc: TocChoice[]): Section[] {
  const byId = new Map(sections.map((x) => [x.id, x]))
  const ordered = toc.map((c) => byId.get(c.id) && { ...byId.get(c.id)!, enabled: c.enabled, title: c.title.trim() || byId.get(c.id)!.title }).filter(Boolean) as Section[]
  const missing = sections.filter((x) => !toc.some((c) => c.id === x.id)).map((x) => ({ ...x, enabled: false }))
  return [...ordered, ...missing]
}
