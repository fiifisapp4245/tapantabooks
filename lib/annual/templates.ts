/**
 * Annual report templates. A template is a starting structure (which
 * sections, in which order) plus a starting look. Both can be changed after:
 * the table of contents in the next step, the look in the studio's Design.
 */
import type { SectionType, ThemePreset, Theme } from "./types"

export type AnnualTemplate = {
  id: string
  name: string
  /** Who it's for, in a line. */
  audience: string
  description: string
  preset: ThemePreset
  pattern: Theme["pattern"]
  /** Section types included, in order. Anything else starts switched off. */
  sections: SectionType[]
}

export const TEMPLATES: AnnualTemplate[] = [
  {
    id: "listed",
    name: "Listed company",
    audience: "For PLCs and companies with many shareholders",
    description: "The full report: AGM notice and proxy form, leadership statements, governance and committees, audited statements, notes, shareholder information and a five-year summary.",
    preset: "navy",
    pattern: "lines",
    sections: [
      "cover", "contents", "about", "agm-notice", "proxy-form", "dividend",
      "who-we-are", "highlights", "salient", "chairman", "ceo", "cfo",
      "board", "management", "governance", "directors-report", "committees",
      "auditor", "sci", "sofp", "soce", "socf", "notes",
      "shareholders", "five-year", "administration",
    ],
  },
  {
    id: "private",
    name: "Private company",
    audience: "For family businesses and owner-managed companies",
    description: "A shorter report for owners, lenders and partners: who you are, the year's highlights, leadership statements, the directors' report and the audited statements.",
    preset: "crimson",
    pattern: "adinkra",
    sections: [
      "cover", "contents", "about", "who-we-are", "highlights", "salient",
      "chairman", "cfo", "board", "directors-report",
      "auditor", "sci", "sofp", "soce", "socf", "notes", "five-year", "administration",
    ],
  },
  {
    id: "statements",
    name: "Financial statements",
    audience: "For filing with the Registrar and GRA, or for your bank",
    description: "The statutory essentials only: cover, directors' report, the auditor's report, the four statements and the notes.",
    preset: "emerald",
    pattern: "lines",
    sections: ["cover", "contents", "directors-report", "auditor", "sci", "sofp", "soce", "socf", "notes", "administration"],
  },
]

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id)
