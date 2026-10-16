"use client"

import * as React from "react"
import { Ban, Check, Plus, RotateCcw, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { fmtDate } from "@/lib/dates"
import type { BankLine, Journal } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Money } from "@/components/patterns/money"
import { Code } from "@/components/patterns/text"
import { StatusBadge } from "@/components/patterns/status-badge"

type Confidence = NonNullable<BankLine["suggestion"]>["confidence"]

const CONFIDENCE: Record<Confidence, { className: string; dot: string }> = {
  High: { className: "bg-success-soft text-success", dot: "bg-success" },
  Medium: { className: "bg-info-soft text-info", dot: "bg-info" },
  Low: { className: "bg-neutral-soft text-muted-foreground", dot: "bg-muted-foreground/60" },
}

/** How sure the suggestion is. Same shape and tones as StatusBadge. */
export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const c = CONFIDENCE[confidence]
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap", c.className)}>
      <span className={cn("size-1.5 rounded-full", c.dot)} aria-hidden />
      {confidence} match
    </span>
  )
}

export const hasUsableSuggestion = (l: BankLine) => !!l.suggestion && l.suggestion.label !== "No match found"

export type Candidate = { journal: Journal; amount: number }

/** One statement line on the left, what it matches in Tapanta on the right. */
export function ReconcileLine({
  line,
  matchedJournal,
  candidates,
  onAccept,
  onPick,
  onCreate,
  onExclude,
  onRestore,
  onOpenJournal,
}: {
  line: BankLine
  matchedJournal?: Journal
  candidates: Candidate[]
  onAccept: () => void
  onPick: (journalId: string) => void
  onCreate: () => void
  onExclude: () => void
  onRestore: () => void
  onOpenJournal: (id: string) => void
}) {
  const usable = hasUsableSuggestion(line)
  return (
    <li className="grid min-w-0 lg:grid-cols-2 lg:divide-x">
      {/* Statement side */}
      <div className={cn("flex min-w-0 items-start gap-4 px-4 py-3.5", line.status === "excluded" && "opacity-60")}>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{fmtDate(line.date)}</p>
          <p className="truncate text-sm font-medium" title={line.description}>
            {line.description}
          </p>
          <Code className="text-xs">{line.reference}</Code>
        </div>
        <Money amount={line.amount} size="lg" negativeHint="Money out of the account" className="shrink-0 pt-4" />
      </div>

      {/* Tapanta side */}
      <div className="flex min-w-0 flex-col gap-2.5 border-t border-dashed px-4 py-3.5 lg:border-t-0">
        {line.status === "matched" ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <StatusBadge status="reconciled" />
            {matchedJournal ? (
              <button type="button" onClick={() => onOpenJournal(matchedJournal.id)} className="flex min-w-0 items-baseline gap-2 rounded-sm text-left hover:underline hover:underline-offset-4">
                <Code className="text-foreground">{matchedJournal.id}</Code>
                <span className="truncate text-sm text-muted-foreground">{matchedJournal.memo}</span>
              </button>
            ) : (
              <span className="text-sm text-muted-foreground">Matched</span>
            )}
          </div>
        ) : line.status === "excluded" ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Excluded. Left out of this reconciliation.</p>
            <Button variant="ghost" onClick={onRestore}>
              <RotateCcw />
              Restore
            </Button>
          </div>
        ) : (
          <>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              {line.suggestion && <ConfidenceBadge confidence={line.suggestion.confidence} />}
              <span className={cn("min-w-0 text-sm", usable ? "font-medium" : "text-muted-foreground")}>
                {usable ? line.suggestion!.label : "No match found. Find one, or create the entry."}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!usable} onClick={onAccept} title={usable ? undefined : "Nothing to accept yet"}>
                <Check />
                Accept
              </Button>
              <FindMatch line={line} candidates={candidates} onPick={onPick} />
              <Button variant="outline" onClick={onCreate}>
                <Plus />
                Create
              </Button>
              <Button variant="ghost" onClick={onExclude}>
                <Ban />
                Exclude
              </Button>
            </div>
          </>
        )}
      </div>
    </li>
  )
}

function FindMatch({ line, candidates, onPick }: { line: BankLine; candidates: Candidate[]; onPick: (id: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const same = candidates.filter((c) => Math.abs(c.amount - line.amount) < 0.005)
  const others = candidates.filter((c) => Math.abs(c.amount - line.amount) >= 0.005)
  const item = (c: Candidate) => (
    <CommandItem
      key={c.journal.id}
      value={`${c.journal.id} ${c.journal.memo} ${c.amount}`}
      onSelect={() => {
        onPick(c.journal.id)
        setOpen(false)
      }}
      className="items-start"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <Code>{c.journal.id}</Code>
          <span className="text-xs text-muted-foreground">{fmtDate(c.journal.date)}</span>
        </div>
        <p className="truncate text-[13px]">{c.journal.memo}</p>
      </div>
      <Money amount={c.amount} size="sm" />
    </CommandItem>
  )
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Search />
          Find match
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(380px,calc(100vw-32px))] p-0">
        <Command>
          <CommandInput placeholder="Search entries on GCB Bank" />
          <CommandList>
            <CommandEmpty>No unmatched entries match.</CommandEmpty>
            {same.length > 0 && <CommandGroup heading="Same amount">{same.map(item)}</CommandGroup>}
            <CommandGroup heading="Recent unmatched entries on 1010">{others.map(item)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
