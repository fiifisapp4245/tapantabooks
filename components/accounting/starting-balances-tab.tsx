"use client"

import * as React from "react"
import { FileText } from "lucide-react"
import { useLedger } from "@/lib/ledger"
import { USERS } from "@/lib/constants"
import { fmtDate } from "@/lib/dates"
import { Button } from "@/components/ui/button"
import { Banner } from "@/components/patterns/banner"
import { JournalLines } from "@/components/patterns/journal-lines"
import { Code } from "@/components/patterns/text"
import { EmptyState } from "@/components/patterns/empty-state"
import { JournalDrawer } from "@/components/drawers/journal-drawer"

const userName = (id?: string) => USERS.find((u) => u.id === id)?.name ?? "—"

/** Read-only: the balances brought over at conversion. No add or edit prompts. */
export function StartingBalancesTab() {
  const s = useLedger()
  const [open, setOpen] = React.useState(false)
  const j = s.journals.find((x) => x.source === "opening")

  if (!j) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState icon={FileText} title="No starting balances" description="This company started trading in Tapanta, so nothing was brought over." />
      </div>
    )
  }

  const name = (c: string) => s.accounts.find((a) => a.code === c)?.name ?? c
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Banner tone="locked" title={`Locked after conversion on ${fmtDate(j.date)}`}>
        These are the balances brought over from your previous system. They can&apos;t be changed here. If one was wrong, post a correcting journal dated after {fmtDate(j.date)}.
      </Banner>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <Code>{j.id}</Code>
            <Code>{j.reference}</Code>
          </div>
          <h2 className="text-[15px] font-medium">{j.memo}</h2>
          <p className="text-xs text-muted-foreground">
            {fmtDate(j.date)} · Entered by {userName(j.createdBy)}
            {j.approvedBy && ` · Approved by ${userName(j.approvedBy)}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <FileText />
          Open journal
        </Button>
      </div>
      <JournalLines lines={j.lines.map((l) => ({ ...l, accountName: name(l.accountCode) }))} />
      <JournalDrawer journalId={open ? j.id : null} onClose={() => setOpen(false)} />
    </div>
  )
}
