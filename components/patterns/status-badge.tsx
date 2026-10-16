import { cn } from "@/lib/utils"

export type Status =
  | "draft"
  | "awaiting_approval"
  | "open"
  | "unpaid"
  | "part_paid"
  | "overdue"
  | "paid"
  | "posted"
  | "reconciled"
  | "void"
  | "reversed"
  | "error"
  | "healthy"
  | "delayed"
  | "locked"
  | "closed"
  | "applied"
  | "needs_attention"
  | "processing"
  | "in_review"
  | "approved"
  | "published"

type Tone = "neutral" | "warning" | "info" | "info-outline" | "success" | "void" | "destructive"

const MAP: Record<Status, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  awaiting_approval: { label: "Awaiting approval", tone: "warning" },
  open: { label: "Open", tone: "info" },
  unpaid: { label: "Unpaid", tone: "info" },
  part_paid: { label: "Part paid", tone: "info-outline" },
  overdue: { label: "Overdue", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  posted: { label: "Posted", tone: "success" },
  reconciled: { label: "Reconciled", tone: "success" },
  void: { label: "Void", tone: "void" },
  reversed: { label: "Reversed", tone: "void" },
  error: { label: "Error", tone: "destructive" },
  healthy: { label: "Healthy", tone: "success" },
  delayed: { label: "Delayed", tone: "warning" },
  locked: { label: "Locked", tone: "neutral" },
  closed: { label: "Closed", tone: "neutral" },
  applied: { label: "Applied", tone: "success" },
  needs_attention: { label: "Needs attention", tone: "warning" },
  processing: { label: "Processing", tone: "info" },
  in_review: { label: "In review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  published: { label: "Published", tone: "info" },
}

const TONES: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-muted-foreground",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  "info-outline": "border-info/40 text-info",
  success: "bg-success-soft text-success",
  void: "bg-neutral-soft text-muted-foreground line-through decoration-muted-foreground/60",
  destructive: "bg-destructive-soft text-destructive",
}

const DOTS: Partial<Record<Tone, string>> = {
  warning: "bg-warning",
  info: "bg-info",
  "info-outline": "bg-info",
  success: "bg-success",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground/60",
}

/**
 * The one status badge. The mapping is fixed: the same word is always the
 * same colour, and brand blue is never used to mean a status.
 */
export function StatusBadge({
  status,
  days,
  className,
}: {
  status: Status
  /** Overdue only: how many days past due. */
  days?: number
  className?: string
}) {
  const { label, tone } = MAP[status]
  const text = status === "overdue" && days != null ? `Overdue ${days}d` : label
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-transparent px-2.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className
      )}
    >
      {DOTS[tone] && <span className={cn("size-1.5 rounded-full", DOTS[tone])} aria-hidden />}
      {text}
    </span>
  )
}

export const ALL_STATUSES = Object.keys(MAP) as Status[]
