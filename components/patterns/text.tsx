"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { usePrefs } from "@/lib/store"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** Document numbers and account codes: mono, 13px, muted, so names read first. */
export function Code({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("font-mono text-[13px] tracking-normal text-muted-foreground", className)}
      {...props}
    />
  )
}

/**
 * A plain-language label with the accounting term one hover away.
 * With "Show accounting detail" on, the term is also shown inline.
 */
export function Term({
  children,
  term,
  className,
}: {
  children: React.ReactNode
  term: string
  className?: string
}) {
  const detail = usePrefs((s) => s.showAccountingDetail)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "cursor-help underline decoration-muted-foreground/40 decoration-dotted underline-offset-4",
            className
          )}
        >
          {children}
          {detail && <span className="ml-1.5 text-xs font-normal text-muted-foreground">· {term}</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent>{term}</TooltipContent>
    </Tooltip>
  )
}
