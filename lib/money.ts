import type { Currency } from "./constants"

const SYMBOLS: Record<Currency, string> = {
  GHS: "GH₵",
  USD: "US$",
  EUR: "€",
  GBP: "£",
}

const MINUS = "−"

export type FormatMoneyOptions = {
  /** Drop the currency symbol, e.g. inside a column already labelled GH₵. */
  hideSymbol?: boolean
  /** Round to whole units, for big KPI-style figures and chart axes. */
  whole?: boolean
  /** Compact form for chart axes: 12.4k, 1.2m. */
  compact?: boolean
}

/**
 * The only place a money amount is turned into text. Negatives use a true
 * minus sign before the symbol (−GH₵ 10,080.10), never brackets.
 */
export function formatMoney(
  amount: number,
  currency: Currency = "GHS",
  options: FormatMoneyOptions = {}
): string {
  const { hideSymbol, whole, compact } = options
  const abs = Math.abs(amount)
  let body: string
  if (compact) {
    body = new Intl.NumberFormat("en-GB", {
      notation: "compact",
      maximumFractionDigits: 1,
    })
      .format(abs)
      .toLowerCase()
  } else {
    body = new Intl.NumberFormat("en-GB", {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(abs)
  }
  const sign = amount < 0 && abs >= (whole ? 0.5 : 0.005) ? MINUS : ""
  return hideSymbol ? `${sign}${body}` : `${sign}${SYMBOLS[currency]} ${body}`
}

export function currencySymbol(currency: Currency) {
  return SYMBOLS[currency]
}
