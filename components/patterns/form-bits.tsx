"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/** Label + control + optional hint or error, the same on every form. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: React.ReactNode
  htmlFor?: string
  hint?: React.ReactNode
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-[13px] font-medium">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/**
 * Primary actions stay disabled until the form is valid; the reason sits
 * beside the button so nobody has to guess.
 */
export function SubmitReason({ reason }: { reason?: string | null }) {
  if (!reason) return null
  return <span className="text-xs text-muted-foreground">{reason}</span>
}

/**
 * Wrap a Dialog/Sheet's onOpenChange: closing a dirty form asks
 * "Discard changes?" first.
 */
export function useDiscardGuard(dirty: boolean, close: () => void) {
  const [asking, setAsking] = React.useState(false)
  const request = React.useCallback(() => {
    if (dirty) setAsking(true)
    else close()
  }, [dirty, close])
  const dialog = (
    <AlertDialog open={asking} onOpenChange={setAsking}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard changes?</AlertDialogTitle>
          <AlertDialogDescription>You&apos;ve entered details that haven&apos;t been saved. They&apos;ll be lost if you close this.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setAsking(false)
              close()
            }}
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
  return { request, dialog }
}
