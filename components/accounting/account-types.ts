import type { Account, AccountType } from "@/lib/types"

export const ACCOUNT_TYPES: { id: AccountType; label: string; plural: string; hint: string; range: [number, number]; placeholder: string; categories: string[] }[] = [
  { id: "asset", label: "Asset", plural: "Assets", hint: "Something the business owns or is owed", range: [1000, 1999], placeholder: "e.g. Fidelity Bank – Savings", categories: ["Cash & bank", "Receivables", "Inventory", "Tax assets", "Fixed assets", "Prepayments"] },
  { id: "liability", label: "Liability", plural: "Liabilities", hint: "Something the business owes", range: [2000, 2999], placeholder: "e.g. Director's loan", categories: ["Payables", "Tax liabilities", "Payroll liabilities", "Current liabilities", "Loans"] },
  { id: "equity", label: "Equity", plural: "Equity", hint: "The owners' stake in the business", range: [3000, 3999], placeholder: "e.g. Owner's drawings", categories: ["Equity"] },
  { id: "income", label: "Income", plural: "Income", hint: "Money the business earns", range: [4000, 4999], placeholder: "e.g. Delivery fees", categories: ["Sales", "Other income"] },
  { id: "cost_of_sales", label: "Cost of sales", plural: "Cost of sales", hint: "What the goods you sold cost you", range: [5000, 5999], placeholder: "e.g. Packaging for goods sold", categories: ["Cost of sales"] },
  { id: "expense", label: "Expense", plural: "Expenses", hint: "Day-to-day running costs", range: [6000, 8999], placeholder: "e.g. Security services", categories: ["Staff costs", "Premises", "Running costs", "Finance costs"] },
]

export const typeInfo = (t: AccountType) => ACCOUNT_TYPES.find((x) => x.id === t)!

export const normalFor = (t: AccountType): Account["normal"] => (t === "asset" || t === "expense" || t === "cost_of_sales" ? "debit" : "credit")

/** Report categories for a type: the standard ones plus any already in use. */
export function categoriesFor(t: AccountType, accounts: Account[]) {
  const used = accounts.filter((a) => a.type === t).map((a) => a.category)
  return [...new Set([...typeInfo(t).categories, ...used])]
}

/** The next free code in the type's range, after the last code in the category when it has one. */
export function suggestCode(t: AccountType, category: string | undefined, accounts: Account[]) {
  const [lo, hi] = typeInfo(t).range
  const taken = new Set(accounts.map((a) => a.code))
  const inRange = accounts.map((a) => Number(a.code)).filter((n) => n >= lo && n <= hi)
  const inCategory = accounts.filter((a) => a.type === t && a.category === category).map((a) => Number(a.code)).filter((n) => n >= lo && n <= hi)
  const base = inCategory.length ? Math.max(...inCategory) : inRange.length ? Math.max(...inRange) : lo - 10
  let n = Math.floor(base / 10) * 10 + 10
  while (n <= hi && taken.has(String(n))) n++
  if (n > hi) {
    n = lo
    while (n <= hi && taken.has(String(n))) n++
  }
  return n <= hi ? String(n) : ""
}
