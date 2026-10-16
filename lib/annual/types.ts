/**
 * The annual report: an ordered list of sections, a theme, and a sign-off
 * chain. Narrative sections hold text the company writes; financial
 * sections hold no figures of their own — they're always built from the
 * books (lib/annual/figures.ts), so they can't drift from the ledger.
 */

export type Part =
  | "Opening"
  | "Notices"
  | "Who we are"
  | "Performance"
  | "Governance"
  | "Financial statements"
  | "Shareholder information"

export const PARTS: Part[] = ["Opening", "Notices", "Who we are", "Performance", "Governance", "Financial statements", "Shareholder information"]

export type Person = { id: string; name: string; role: string; appointed?: string; qualifications?: string; bio: string; photo?: string }
export type Resolution = { id: string; kind: "ordinary" | "special"; text: string }

/** What each section type stores. Body text: blank line = new paragraph, "## " = subheading. */
export type SectionData = {
  cover: { title: string; subtitle: string }
  contents: Record<string, never>
  about: { body: string }
  "agm-notice": { agmNumber: string; date: string; time: string; venue: string; resolutions: Resolution[]; body: string }
  "proxy-form": { returnBy: string }
  dividend: { perShare: number; exDate: string; qualifyingDate: string; paymentDate: string; body: string }
  "who-we-are": { intro: string; vision: string; mission: string; values: string[] }
  highlights: { items: { id: string; value: string; unit: string; caption: string }[] }
  salient: { intro: string }
  chairman: { name: string; role: string; body: string; photo?: string }
  ceo: { name: string; role: string; body: string; photo?: string }
  cfo: { name: string; role: string; body: string; photo?: string }
  board: { intro: string; people: Person[] }
  management: { intro: string; people: Person[] }
  governance: { body: string }
  "directors-report": { body: string }
  committees: { items: { id: string; name: string; chair: string; body: string }[] }
  auditor: { firm: string; partner: string; licence: string; signedOn: string; body: string; fileName?: string; fileUrl?: string }
  sci: Record<string, never>
  sofp: Record<string, never>
  soce: Record<string, never>
  socf: Record<string, never>
  notes: { policies: string }
  shareholders: { intro: string; holders: { id: string; name: string; shares: number }[] }
  "five-year": Record<string, never>
  administration: {
    registeredOffice: string
    registrationNumber: string
    tin: string
    secretary: string
    auditors: string
    bankers: string[]
    solicitors: string
  }
}

export type SectionType = keyof SectionData

export type Section<T extends SectionType = SectionType> = {
  id: string
  type: T
  title: string
  part: Part
  enabled: boolean
  data: SectionData[T]
}

/** Section types whose content is generated entirely from the books. */
export const FROM_THE_BOOKS: SectionType[] = ["salient", "sci", "sofp", "soce", "socf", "five-year", "contents"]

export type ThemePreset = "crimson" | "gold" | "emerald" | "navy"
export type Theme = {
  preset: ThemePreset
  /** Main brand colour: section tabs, highlighted year columns, big numbers. */
  primary: string
  /** Dark partner colour for text blocks and the second chart series. */
  ink: string
  /** Light tint behind highlighted columns. */
  tint: string
  /** Text on the primary colour. */
  onPrimary: string
  /** Decoration on the cover and section openers. */
  pattern: "adinkra" | "kente" | "lines"
  /** Optional uploaded photo for the cover (object URL). */
  coverPhoto?: string
}

export const THEMES: Record<ThemePreset, Omit<Theme, "pattern" | "coverPhoto">> = {
  crimson: { preset: "crimson", primary: "#AD0E36", ink: "#1E1E1E", tint: "#F8E6EB", onPrimary: "#FFFFFF" },
  gold: { preset: "gold", primary: "#F2C200", ink: "#111111", tint: "#FFF6CC", onPrimary: "#111111" },
  emerald: { preset: "emerald", primary: "#0F7B5F", ink: "#0E2A22", tint: "#E1F2EC", onPrimary: "#FFFFFF" },
  navy: { preset: "navy", primary: "#1F3A8A", ink: "#0F172A", tint: "#E5EAF7", onPrimary: "#FFFFFF" },
}

export type SignRole = "preparer" | "reviewer" | "director"
export type SignOff = { role: SignRole; userId?: string; at?: string }

export type ReportStatus = "draft" | "in_review" | "approved" | "published"

export type AnnualReport = {
  id: string
  /** The template it was created from. */
  templateId?: string
  year: number
  companyId: string
  status: ReportStatus
  sections: Section[]
  theme: Theme
  signoffs: SignOff[]
  updatedAt: string
  publishedAt?: string
}
