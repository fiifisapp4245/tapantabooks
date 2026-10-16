"use client"

import * as React from "react"
import { ArrowDownLeft, ArrowUpRight, FileText, NotebookPen, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import "./sticky-notes.css"

/*
 * Home quick actions as sticky notes on the hero card. Each note takes one of
 * the four accent tokens (brand, success, warning, info) as a light paper
 * tint with handwriting in the deep tone. Clicking peels the note off the
 * wall, then runs the action. The notes are the one deliberate exception to
 * the app's no-shadow rule.
 */

export type StickyNote = {
  id: string
  label: string
  icon: LucideIcon
  /** Design-system accent the note is made from. */
  tone: "brand" | "success" | "warning" | "info"
  onClick: () => void
}

// Small, fixed tilts so the notes look hand-placed.
const TILTS = [-2.2, 1.6, -1.2, 2.4]

/** Matches the peel animation length in sticky-notes.css. */
const PEEL_MS = 420

export function StickyNotes({ notes, className }: { notes: StickyNote[]; className?: string }) {
  const [peeling, setPeeling] = React.useState<string | null>(null)

  const peel = (n: StickyNote) => {
    if (peeling) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return n.onClick()
    setPeeling(n.id)
    // The action opens as the note leaves; the note is back in place a moment later.
    window.setTimeout(n.onClick, PEEL_MS - 80)
    window.setTimeout(() => setPeeling(null), PEEL_MS + 700)
  }

  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5", className)}>
      {notes.map((n, i) => (
        <button
          key={n.id}
          type="button"
          onClick={() => peel(n)}
          data-tone={n.tone}
          data-peeling={peeling === n.id || undefined}
          style={{ "--tilt": `${TILTS[i % TILTS.length]}deg` } as React.CSSProperties}
          className="sticky-note group/note relative flex aspect-square min-w-0 flex-col justify-between rounded-[8px] p-3 text-left outline-none sm:p-3.5"
        >
          {/* a strip of tape holding it up */}
          <span aria-hidden className="sticky-tape" />
          <n.icon aria-hidden className="sticky-ink size-4 self-end opacity-70" />
          <span className="sticky-ink font-[family-name:var(--font-caveat)] text-[22px] leading-[1.05] font-semibold sm:text-2xl">{n.label}</span>
          {/* the bottom corner lifts a little, like real paper */}
          <span aria-hidden className="sticky-curl" />
        </button>
      ))}
    </div>
  )
}

export const STICKY_ICONS = { invoice: FileText, moneyIn: ArrowDownLeft, moneyOut: ArrowUpRight, journal: NotebookPen }
