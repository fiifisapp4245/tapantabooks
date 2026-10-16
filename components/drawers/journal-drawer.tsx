"use client"

import * as React from "react"
import Link from "next/link"
import { Check, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { USERS } from "@/lib/constants"
import { fmtDate } from "@/lib/dates"
import { journalAmount, journalTotal } from "@/lib/selectors"
import { Button } from "@/components/ui/button"
import { DrawerSection, EntityDrawer, FactList } from "@/components/patterns/entity-drawer"
import { JournalLines } from "@/components/patterns/journal-lines"
import { StatusBadge } from "@/components/patterns/status-badge"
import { Banner } from "@/components/patterns/banner"
import { Money } from "@/components/patterns/money"
import { Code } from "@/components/patterns/text"
import { BRANCHES } from "@/lib/constants"

export const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  sales: "Sales",
  purchases: "Purchases",
  banking: "Banking",
  pos: "POS",
  momo: "MoMo",
  loans: "Loans",
  payroll: "Payroll",
  quickbooks: "QuickBooks",
  revaluation: "Revaluation",
  opening: "Starting balances",
  closing: "Year-end close",
}

const userName = (id?: string) => (id === "system" ? "System (integration)" : USERS.find((u) => u.id === id)?.name ?? "—")

/** Where a journal's source document lives, so the drawer can link to it. */
function sourceHref(id?: string) {
  if (!id) return undefined
  if (id.startsWith("INV-")) return "/invoices"
  if (id.startsWith("BILL-")) return "/bills"
  if (id.startsWith("RCPT-")) return "/payments-received"
  if (id.startsWith("PAY-")) return "/payments-made"
  if (id.startsWith("CN-")) return "/credit-notes"
  if (id.startsWith("SC-")) return "/supplier-credits"
  return undefined
}

/** Opens any journal by id: lines, balanced tag, source link, approval trail, Reverse. */
export function JournalDrawer({ journalId, onClose }: { journalId: string | null; onClose: () => void }) {
  const s = useLedger()
  const userId = usePrefs((p) => p.userId)
  const j = s.journals.find((x) => x.id === journalId)
  const status = j?.status === "awaiting_approval" ? "awaiting_approval" : j?.status === "draft" ? "draft" : j?.status === "reversed" ? "reversed" : "posted"
  const canApprove = j?.status === "awaiting_approval" && j.createdBy !== userId && userId !== "efua"
  const href = sourceHref(j?.sourceDocId)

  return (
    <EntityDrawer
      open={!!j}
      onOpenChange={(o) => !o && onClose()}
      code={j?.id}
      title={j?.memo ?? ""}
      subtitle={j ? `${fmtDate(j.date)} · ${BRANCHES.find((b) => b.id === j.branch)?.name} · ${SOURCE_LABELS[j.source]}` : undefined}
      status={j && <StatusBadge status={status} />}
      amount={j ? journalAmount(s, j) : undefined}
      amountLabel={j?.sourceDocId ? "Document total" : "Amount"}
      actions={
        j && (
          <>
            {j.status === "awaiting_approval" && (
              <Button
                disabled={!canApprove}
                onClick={() => {
                  s.approveJournal(j.id, userId)
                  toast.success(`${j.id} approved and posted`)
                }}
              >
                <Check />
                Approve & post
              </Button>
            )}
            {j.status === "posted" && !j.reverses && j.source !== "opening" && (
              <Button
                variant="outline"
                onClick={() => {
                  s.reverseJournal(j.id, userId)
                  toast.success(`${j.id} reversed`)
                }}
              >
                <RotateCcw />
                Reverse
              </Button>
            )}
          </>
        )
      }
    >
      {j && (
        <>
          {j.status === "awaiting_approval" && !canApprove && (
            <Banner tone="warning" title="Needs a second approver">
              {j.createdBy === userId
                ? "You created this entry, so someone else must approve it. Switch to Kofi Boateng or Ama Mensah from the user menu."
                : "Accounts officers can't approve journals. Switch to Kofi Boateng or Ama Mensah from the user menu."}
            </Banner>
          )}
          {j.status === "reversed" && (
            <Banner tone="locked" title={`Reversed by ${j.reversedBy}`}>
              This entry and its reversal cancel out. Neither changes your balances.
            </Banner>
          )}
          <DrawerSection title="Lines">
            <JournalLines lines={j.lines.map((l) => ({ ...l, accountName: s.accounts.find((a) => a.code === l.accountCode)?.name ?? l.accountCode }))} />
            {j.sourceDocId && Math.abs(journalTotal(j) - journalAmount(s, j)) > 0.005 && (
              <p className="text-xs text-muted-foreground">
                Debits total <Money amount={journalTotal(j)} size="sm" className="text-muted-foreground" />; the list shows the document total.
              </p>
            )}
          </DrawerSection>
          <DrawerSection title="Details">
            <FactList
              items={[
                { label: "Reference", value: j.reference ? <Code>{j.reference}</Code> : "—" },
                {
                  label: "Source document",
                  value: j.sourceDocId ? (
                    href ? (
                      <Link href={href} className="font-mono text-[13px] underline underline-offset-4">
                        {j.sourceDocId}
                      </Link>
                    ) : (
                      <Code>{j.sourceDocId}</Code>
                    )
                  ) : (
                    "None – entered by hand"
                  ),
                },
                ...(j.reverses ? [{ label: "Reverses", value: <Code>{j.reverses}</Code> }] : []),
              ]}
            />
          </DrawerSection>
          <DrawerSection title="Approval trail">
            <ol className="space-y-3 border-l pl-4 text-sm">
              <li>
                <p>{j.status === "draft" ? "Saved as draft" : "Created"} by {userName(j.createdBy)}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(j.createdAt)}</p>
              </li>
              {j.status === "awaiting_approval" && (
                <li>
                  <p>Waiting for approval</p>
                  <p className="text-xs text-muted-foreground">Over the GH₵ {s.settings.approvalThreshold.toLocaleString("en-GB")} approval threshold</p>
                </li>
              )}
              {j.approvedBy && (
                <li>
                  <p>Approved by {userName(j.approvedBy)}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(j.createdAt)}</p>
                </li>
              )}
              {(j.status === "posted" || j.status === "reversed") && !j.approvedBy && (
                <li>
                  <p>Posted automatically</p>
                  <p className="text-xs text-muted-foreground">Under the approval threshold</p>
                </li>
              )}
            </ol>
          </DrawerSection>
        </>
      )}
    </EntityDrawer>
  )
}

/** The journal lines behind a report figure. */
export function DrillDrawer({
  title,
  subtitle,
  lines,
  onClose,
  open,
}: {
  title: string
  subtitle?: string
  lines: { journal: { id: string; date: string; memo: string }; accountCode: string; debit: number; credit: number }[]
  open: boolean
  onClose: () => void
}) {
  const accounts = useLedger((s) => s.accounts)
  const [journalId, setJournalId] = React.useState<string | null>(null)
  const total = lines.reduce((t, l) => t + l.debit - l.credit, 0)
  return (
    <>
      <EntityDrawer open={open && !journalId} onOpenChange={(o) => !o && onClose()} title={title} subtitle={subtitle} amount={Math.abs(total)} amountLabel={`${lines.length} journal lines`}>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th className="h-9 px-3 text-left font-medium">Entry</th>
                <th className="h-9 px-3 text-right font-medium">Debit</th>
                <th className="h-9 px-3 text-right font-medium">Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.slice(0, 300).map((l, i) => (
                <tr key={i} className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40" onClick={() => setJournalId(l.journal.id)}>
                  <td className="px-3 py-2">
                    <div className="flex items-baseline gap-2">
                      <Code>{l.journal.id}</Code>
                      <span className="text-xs text-muted-foreground">{fmtDate(l.journal.date)}</span>
                    </div>
                    <p className="truncate text-[13px]">{l.journal.memo}</p>
                    <p className="text-xs text-muted-foreground">{accounts.find((a) => a.code === l.accountCode)?.name}</p>
                  </td>
                  <td className="px-3 py-2 text-right">{l.debit ? <Money amount={l.debit} hideSymbol size="sm" /> : null}</td>
                  <td className="px-3 py-2 text-right">{l.credit ? <Money amount={l.credit} hideSymbol size="sm" /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lines.length > 300 && <p className="text-xs text-muted-foreground">Showing the first 300 of {lines.length} lines.</p>}
      </EntityDrawer>
      <JournalDrawer journalId={journalId} onClose={() => setJournalId(null)} />
    </>
  )
}
