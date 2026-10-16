"use client"

import * as React from "react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type Kpi = {
  id: string
  label: React.ReactNode
  /** Usually a <Money size="kpi" />, or a count. */
  value: React.ReactNode
  hint?: React.ReactNode
  /** Change vs last period as a fraction, e.g. 0.12 for +12%. */
  delta?: number
  /** Whether a rise is good news (cash) or bad news (what you owe). */
  deltaGood?: "up" | "down"
  tone?: "default" | "warning"
}

/** Up to four cards in a row, 2×2 below 1024px. Every card filters or links. */
export function KpiStrip({
  items,
  activeId,
  onSelect,
}: {
  items: Kpi[]
  activeId?: string
  onSelect?: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.slice(0, 4).map((k) => (
        <KpiCard key={k.id} kpi={k} active={activeId === k.id} onClick={onSelect ? () => onSelect(k.id) : undefined} />
      ))}
    </div>
  )
}

export function KpiCard({
  kpi,
  active,
  onClick,
  className,
}: {
  kpi: Kpi
  active?: boolean
  onClick?: () => void
  className?: string
}) {
  const Comp = onClick ? "button" : "div"
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={cn(
        "@container flex min-w-0 flex-col items-start gap-1.5 rounded-xl border bg-card p-4 text-left transition-colors",
        onClick && "hover:border-foreground/20",
        active && "border-foreground/70 hover:border-foreground/70",
        className
      )}
    >
      <span className={cn("text-[13px] text-muted-foreground", kpi.tone === "warning" && "text-warning")}>
        {kpi.label}
      </span>
      <span className="w-full">{kpi.value}</span>
      {(kpi.hint || kpi.delta != null) && (
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {kpi.delta != null && <Delta value={kpi.delta} good={kpi.deltaGood ?? "up"} />}
          {kpi.hint}
        </span>
      )}
    </Comp>
  )
}

export function Delta({ value, good = "up" }: { value: number; good?: "up" | "down" }) {
  const up = value >= 0
  const positive = (up && good === "up") || (!up && good === "down")
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium tabular", positive ? "text-success" : "text-warning")}>
      <Icon className="size-3.5" />
      {Math.abs(value * 100).toFixed(1)}%
    </span>
  )
}
