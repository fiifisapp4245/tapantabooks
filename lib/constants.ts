/**
 * The one "today" the whole prototype runs on. Every "days ago", overdue and
 * due-soon calculation reads this, never `new Date()`, so numbers agree on
 * every screen no matter when the demo is shown.
 */
export const DEMO_TODAY = new Date("2026-10-05T09:00:00")

export const PRODUCT_NAME = "Tapanta Books"

export const BASE_CURRENCY = "GHS" as const

export const CURRENCIES = ["GHS", "USD", "EUR", "GBP"] as const
export type Currency = (typeof CURRENCIES)[number]

export const BRANCHES = [
  { id: "all", name: "All branches" },
  { id: "adum", name: "Adum – Kumasi (HQ)" },
  { id: "osu", name: "Osu – Accra" },
  { id: "tak", name: "Takoradi" },
] as const

export const USERS = [
  { id: "ama", name: "Ama Mensah", role: "Owner", initials: "AM" },
  { id: "kofi", name: "Kofi Boateng", role: "Senior Accountant", initials: "KB" },
  { id: "efua", name: "Efua Owusu", role: "Accounts Officer", initials: "EO" },
] as const
export type UserId = (typeof USERS)[number]["id"]

export const CURRENT_PERIOD = { label: "October 2026", status: "Open" as const }
