"use client"

import { cn } from "@/lib/utils"
import type { Currency } from "@/lib/constants"
import { formatMoney, type FormatMoneyOptions } from "@/lib/money"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type MoneyProps = FormatMoneyOptions & {
  amount: number
  currency?: Currency
  /** Shown on hover when the amount is negative. Explains the sign. */
  negativeHint?: string
  /** "kpi" is the large Acctual-style figure. */
  size?: "sm" | "md" | "lg" | "kpi"
  className?: string
}

const SIZES = {
  sm: "text-[13px]",
  md: "text-sm",
  lg: "text-base font-medium",
  // Scales with its card (an @container) so big amounts never clip.
  kpi: "font-heading text-[clamp(20px,11.5cqw,30px)] leading-tight font-semibold tracking-[-0.02em]",
}

/** Every money amount in the app renders through this component. */
export function Money({
  amount,
  currency = "GHS",
  negativeHint = "Credit balance",
  size = "md",
  className,
  ...options
}: MoneyProps) {
  const text = formatMoney(amount, currency, options)
  const negative = amount < 0 && text.startsWith("−")
  const node = (
    <span
      className={cn(
        "tabular whitespace-nowrap",
        SIZES[size],
        negative && "text-negative",
        className
      )}
    >
      {text}
    </span>
  )
  if (!negative) return node
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="cursor-help rounded-sm underline decoration-dotted decoration-negative/40 underline-offset-4">
          {node}
        </span>
      </TooltipTrigger>
      <TooltipContent>{negativeHint}</TooltipContent>
    </Tooltip>
  )
}

/** Right-aligned money for table cells. */
export function MoneyCell(props: MoneyProps) {
  return (
    <div className="text-right">
      <Money {...props} />
    </div>
  )
}
