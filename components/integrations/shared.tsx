"use client"

import type * as React from "react"
import {
  Banknote,
  FileSpreadsheet,
  HandCoins,
  Info,
  Landmark,
  NotebookTabs,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  type LucideIcon,
} from "lucide-react"
import type { Connection, ImportBatch } from "@/lib/types"
import { cn } from "@/lib/utils"
import { daysBetween, fmtDateTime, relative, TODAY } from "@/lib/dates"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** One definition of "Held for review", used on Connections and Imports. */
export const HELD_DEFINITION = "Rows we received but didn't post because they need a person to check them."

export const heldTotal = (imports: ImportBatch[]) => imports.reduce((t, i) => t + i.held, 0)

export const KIND_ICONS: Record<Connection["kind"], LucideIcon> = {
  POS: ShoppingBag,
  "Mobile money": Smartphone,
  Loans: HandCoins,
  Accounting: NotebookTabs,
  "Bank feed": Landmark,
  Payments: Banknote,
  "E-commerce": ShoppingCart,
  Spreadsheet: FileSpreadsheet,
}

/** "Synced today at 08:40", "Last synced 2 days ago", "Hasn't synced for 286 days" — from DEMO_TODAY. */
export function lastSyncText(c: Connection) {
  if (!c.connected || !c.lastSync) return "Never synced"
  const days = daysBetween(c.lastSync.slice(0, 10), TODAY)
  if (days === 0) return `Synced today at ${c.lastSync.slice(11, 16)}`
  if (days >= 30) return `Hasn't synced for ${days} days`
  return `Last synced ${relative(c.lastSync)} (${fmtDateTime(c.lastSync)})`
}

/**
 * The "Held for review" KPI hint: the one definition, one hover away.
 * (It sits inside a clickable KPI card, so the trigger isn't a second button.)
 */
export function HeldHint({ children = "What's held?" }: { children?: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help items-center gap-1 underline decoration-dotted underline-offset-4">
          {children}
          <Info className="size-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{HELD_DEFINITION}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Import status. Posted uses StatusBadge; "Needs attention" and "Processing"
 * have no StatusBadge entry yet, so they borrow its warning and info tones.
 */
export function ImportStatus({ batch }: { batch: ImportBatch }) {
  if (batch.status === "posted") return <StatusBadge status="posted" />
  if (batch.status === "needs_attention" && batch.failed > 0) return <StatusBadge status="error" />
  const warning = batch.status === "needs_attention"
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        warning ? "bg-warning-soft text-warning" : "bg-info-soft text-info"
      )}
    >
      <span className={cn("size-1.5 rounded-full", warning ? "bg-warning" : "bg-info")} aria-hidden />
      {warning ? "Needs attention" : "Processing"}
    </span>
  )
}

export function KindIcon({ kind, className }: { kind: Connection["kind"]; className?: string }) {
  const Icon = KIND_ICONS[kind]
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground", className)}>
      <Icon className="size-[18px]" />
    </span>
  )
}

