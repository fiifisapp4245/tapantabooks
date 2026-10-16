import type { Currency } from "@/lib/constants"
import type { PayoutMethod } from "@/lib/types"

export type Rail = "local" | "swift" | "iban"
export type BankField = { key: string; label: string; placeholder?: string }

/** Which rails each country supports, and the fields each rail needs. */
export const BANK_COUNTRIES: Record<string, { name: string; flag: string; currencies: Currency[]; rails: Partial<Record<Rail, BankField[]>> }> = {
  GH: {
    name: "Ghana",
    flag: "🇬🇭",
    currencies: ["GHS", "USD"],
    rails: {
      local: [
        { key: "bankName", label: "Bank name", placeholder: "e.g. GCB Bank" },
        { key: "branch", label: "Branch", placeholder: "e.g. Adum" },
        { key: "accountNumber", label: "Account number" },
      ],
      swift: [
        { key: "swift", label: "SWIFT/BIC code", placeholder: "e.g. GHCBGHAC" },
        { key: "accountNumber", label: "Account number" },
      ],
    },
  },
  NG: {
    name: "Nigeria",
    flag: "🇳🇬",
    currencies: ["USD"],
    rails: { swift: [{ key: "swift", label: "SWIFT/BIC code" }, { key: "accountNumber", label: "Account number" }] },
  },
  GB: {
    name: "United Kingdom",
    flag: "🇬🇧",
    currencies: ["GBP"],
    rails: {
      local: [{ key: "sortCode", label: "Sort code", placeholder: "00-00-00" }, { key: "accountNumber", label: "Account number" }],
      iban: [{ key: "iban", label: "IBAN" }, { key: "swift", label: "SWIFT/BIC code" }],
    },
  },
  DE: {
    name: "Germany",
    flag: "🇩🇪",
    currencies: ["EUR"],
    rails: { iban: [{ key: "iban", label: "IBAN" }, { key: "swift", label: "SWIFT/BIC code" }] },
  },
  US: {
    name: "United States",
    flag: "🇺🇸",
    currencies: ["USD"],
    rails: { swift: [{ key: "swift", label: "SWIFT/BIC code" }, { key: "accountNumber", label: "Account number" }] },
  },
}

export const RAIL_LABELS: Record<Rail, string> = { local: "Local transfer", swift: "SWIFT", iban: "IBAN" }

export const CURRENCY_FLAGS: Record<Currency, string> = { GHS: "🇬🇭", USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧" }
export const CURRENCY_NAMES: Record<Currency, string> = { GHS: "Ghana cedi", USD: "US dollar", EUR: "Euro", GBP: "British pound" }

export function methodLabel(m: PayoutMethod) {
  if (m.type === "bank") return m.nickname || `${m.fields.bankName ?? BANK_COUNTRIES[m.country]?.name} ${m.currency} account`
  if (m.type === "momo") return m.nickname || `${m.network} MoMo ${m.number}`
  return m.name
}

export function methodHint(m: PayoutMethod) {
  if (m.type === "bank") return `${m.currency} · ${RAIL_LABELS[m.rail]}`
  if (m.type === "momo") return m.number
  return `${m.address.slice(0, 6)}…${m.address.slice(-4)}`
}

/** How a method reads on the invoice for the customer. */
export function methodLines(m: PayoutMethod): string[] {
  if (m.type === "momo") return [`${m.network} Mobile Money`, `${m.number} · ${m.name}`]
  if (m.type === "crypto") return [`Crypto · ${m.network ?? "Wallet"}`, m.address]
  const f = m.fields
  return [
    `Bank transfer · ${m.currency}`,
    [f.bankName, f.branch].filter(Boolean).join(", ") || (f.swift ? `SWIFT ${f.swift}` : ""),
    [f.accountNumber ?? f.iban, f.sortCode && `Sort ${f.sortCode}`, f.accountName].filter(Boolean).join(" · "),
  ].filter(Boolean)
}
