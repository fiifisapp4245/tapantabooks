import * as React from "react"
import { CircleAlert, Info, Lock, TriangleAlert, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Tone = "info" | "warning" | "error" | "locked"

const TONES: Record<Tone, { icon: LucideIcon; className: string }> = {
  info: { icon: Info, className: "bg-info-soft text-info" },
  warning: { icon: TriangleAlert, className: "bg-warning-soft text-warning" },
  error: { icon: CircleAlert, className: "bg-destructive-soft text-destructive" },
  locked: { icon: Lock, className: "bg-neutral-soft text-muted-foreground" },
}

/**
 * Page-level messages. Info is blue, warnings amber, errors red, locked grey.
 * Brand colour is never used here, so an info note never reads as an error.
 */
export function Banner({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: Tone
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  const { icon: Icon, className: toneClass } = TONES[tone]
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex flex-wrap items-start gap-3 rounded-xl px-4 py-3", toneClass, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        {children && <div className="text-sm text-foreground/75">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
