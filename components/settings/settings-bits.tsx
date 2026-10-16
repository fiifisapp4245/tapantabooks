"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * One settings card: a title (and optional line of help) with its own action
 * at the top right, then the fields. Each card saves on its own.
 */
export function SettingsCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-5 md:p-7", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children && <div className="mt-6">{children}</div>}
    </section>
  )
}

/**
 * A card's Save: greyed out until something in the card changes, so nothing
 * is saved by accident. The reason it can't save sits beside it.
 */
export function SaveButton({ dirty, onSave, blocked }: { dirty: boolean; onSave: () => void; blocked?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      {dirty && blocked && <span className="text-xs text-muted-foreground">{blocked}</span>}
      <Button variant={dirty ? "default" : "secondary"} disabled={!dirty || !!blocked} onClick={onSave}>
        Save
      </Button>
    </div>
  )
}

/** Per-card form state: what's typed, whether it differs from what's saved, and save/reset. */
export function useCardForm<T>(initial: T) {
  const [saved, setSaved] = React.useState(initial)
  const [value, setValue] = React.useState(initial)
  const dirty = JSON.stringify(value) !== JSON.stringify(saved)
  const set = <K extends keyof T>(k: K, v: T[K]) => setValue((x) => ({ ...x, [k]: v }))
  return { value, set, setValue, dirty, commit: () => setSaved(value), reset: () => setValue(saved), saved }
}

/** Label above the control, with an optional required star and help line. */
export function SettingsField({
  label,
  htmlFor,
  required,
  hint,
  children,
  className,
}: {
  label: React.ReactNode
  htmlFor?: string
  required?: boolean
  hint?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive" aria-hidden>*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export type Role = "Owner" | "Senior Accountant" | "Accounts Officer"

/** What each role can do. Role names match the team list exactly (lib/constants USERS). */
export const PERMISSIONS: { label: string; roles: Role[] }[] = [
  { label: "Create invoices and bills", roles: ["Owner", "Senior Accountant", "Accounts Officer"] },
  { label: "Record money in and money out", roles: ["Owner", "Senior Accountant", "Accounts Officer"] },
  { label: "Reconcile bank accounts", roles: ["Owner", "Senior Accountant", "Accounts Officer"] },
  { label: "Post journals under the approval threshold", roles: ["Owner", "Senior Accountant", "Accounts Officer"] },
  { label: "Approve journals over the threshold", roles: ["Owner", "Senior Accountant"] },
  { label: "Close and reopen periods", roles: ["Owner", "Senior Accountant"] },
  { label: "Manage connections and mapping rules", roles: ["Owner", "Senior Accountant"] },
  { label: "Change settings and period locks", roles: ["Owner"] },
  { label: "Invite and remove users", roles: ["Owner"] },
]
