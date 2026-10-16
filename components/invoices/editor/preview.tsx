"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { fmtDate } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { useLedger } from "@/lib/ledger"
import { TAX_LABELS } from "@/lib/types"
import { STEPS, draftTotals, useDraft, type StepId } from "./draft"
import { methodLines } from "./payout"

/** True size of the invoice document. It never reflows; it only scales. */
const CARD_W = 760
const CARD_MIN_H = 866

const C = {
  strong: "text-[#1C1C1C]",
  text: "text-[#575757]",
  muted: "text-[#8C8C8C]",
}

/** Low-contrast dotted bar shown where a field is still empty. */
function Ghost({ w = 96, h = 12, className }: { w?: number; h?: number; className?: string }) {
  return <span aria-hidden className={cn("ghost-shimmer inline-block rounded-[4px] border border-dashed border-[#DCDCDC] align-middle", className)} style={{ width: w, height: h }} />
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className={cn("text-[11px] font-medium tracking-[0.06em] uppercase", C.muted)}>{children}</p>
}

/**
 * A clickable region of the invoice tied to one step. Active: corner
 * brackets. Hover/focus: a numbered pill slides down from the top edge.
 */
function Section({
  step,
  active,
  onJump,
  className,
  children,
}: {
  step: StepId
  active: boolean
  onJump: (s: StepId) => void
  className?: string
  children: React.ReactNode
}) {
  const idx = STEPS.findIndex((s) => s.id === step)
  const name = STEPS[idx].pill
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Edit ${name}`}
      data-active={active}
      onClick={() => onJump(step)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onJump(step)
        }
      }}
      className={cn(
        "group/sec relative cursor-pointer rounded-[10px] outline-none transition-colors duration-500",
        "data-[active=false]:hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-[#1C1C1C]/20",
        className
      )}
    >
      {/* Corner brackets: decorative, inset 8px */}
      {active && (
        <span aria-hidden className="pointer-events-none absolute inset-2">
          <span className="absolute top-0 left-0 size-2 border-t-[1.5px] border-l-[1.5px] border-brand" />
          <span className="absolute top-0 right-0 size-2 border-t-[1.5px] border-r-[1.5px] border-brand" />
          <span className="absolute bottom-0 left-0 size-2 border-b-[1.5px] border-l-[1.5px] border-brand" />
          <span className="absolute right-0 bottom-0 size-2 border-r-[1.5px] border-b-[1.5px] border-brand" />
        </span>
      )}
      {/* Hover pill, sized against the preview scale so it reads at 12px on screen */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 left-1/2 z-10 flex items-center gap-[0.5em] rounded-full bg-[#1A1A1A] py-[0.25em] pr-[0.85em] pl-[0.3em] whitespace-nowrap text-white",
          "opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,1,1)] [transform:translate(-50%,calc(-50%_-_10px))]",
          "group-hover/sec:opacity-100 group-hover/sec:[transform:translate(-50%,-50%)] group-focus-visible/sec:opacity-100 group-focus-visible/sec:[transform:translate(-50%,-50%)]",
          "motion-reduce:[transform:translate(-50%,-50%)]"
        )}
        style={{ fontSize: "calc(12px / var(--preview-scale, 1))" }}
      >
        <span className="flex size-[1.5em] items-center justify-center rounded-full bg-white/15 text-[0.85em] font-medium">{idx + 1}</span>
        {name}
      </span>
      {children}
    </div>
  )
}

function Avatar({ name, logo }: { name: string; logo?: string }) {
  return (
    <span className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#F0F0F0] text-[15px] font-medium text-[#575757]">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="size-full object-cover" />
      ) : name.trim() ? (
        name.trim()[0].toUpperCase()
      ) : (
        <Ghost w={16} h={16} className="rounded-full" />
      )}
    </span>
  )
}

function Party({ label, name, email, address, taxId, logo }: { label: string; name: string; email: string; address?: string; taxId?: string; logo?: string }) {
  return (
    <div className="flex flex-col gap-3 p-6">
      <Label>{label}</Label>
      <Avatar name={name} logo={logo} />
      <div className="flex flex-col gap-1">
        <p className={cn("text-[22px] leading-tight font-medium break-words", C.strong)}>{name || <Ghost w={180} h={20} />}</p>
        <p className={cn("text-xs", C.text)}>{email || <Ghost w={140} h={10} />}</p>
        {address && <p className={cn("text-[11px]", C.muted)}>{address}</p>}
        {taxId && <p className={cn("text-[11px]", C.muted)}>TIN {taxId}</p>}
      </div>
    </div>
  )
}

export function InvoiceDocument({ active, onJump }: { active: StepId; onJump: (s: StepId) => void }) {
  const d = useDraft((s) => s.draft)
  const methods = useLedger((s) => s.payoutMethods).filter((m) => d.payoutMethodIds.includes(m.id))
  const t = draftTotals(d)
  const money = (minor: number) => formatMoney(minor / 100, d.currency)
  const items = d.items.map((it, i) => ({ ...it, amount: t.amounts[i] }))
  const hasItems = items.some((i) => i.name.trim())

  return (
    <div className="flex flex-col gap-1 rounded-[14px] bg-white p-2 font-sans ring-1 ring-[#00193B]/[0.07]" style={{ width: CARD_W, minHeight: CARD_MIN_H }}>
      <Section step="terms" active={active === "terms"} onJump={onJump} className="grid max-h-[56px] grid-cols-3 gap-6 px-6 py-3">
        <div>
          <Label>Invoice no</Label>
          <p className={cn("font-mono text-[13px]", C.strong)}>{d.number || <Ghost w={64} />}</p>
        </div>
        <div>
          <Label>Issued</Label>
          <p className={cn("text-[13px]", C.strong)}>{d.issueDate ? fmtDate(d.issueDate) : <Ghost w={64} />}</p>
        </div>
        <div>
          <Label>Due date</Label>
          <p className={cn("text-[13px]", C.strong)}>{d.dueDate ? fmtDate(d.dueDate) : <Ghost w={64} />}</p>
        </div>
      </Section>

      <div className="grid grid-cols-2 border-y border-[#EDEDED]">
        <Section step="company" active={active === "company"} onJump={onJump} className="border-r border-[#EDEDED]">
          <Party label="From" {...d.from} logo={d.from.logoUrl} />
        </Section>
        <Section step="customer" active={active === "customer"} onJump={onJump}>
          <Party label="To" {...d.to} logo={d.to.logoUrl} />
        </Section>
      </div>

      <Section step="items" active={active === "items"} onJump={onJump} className="flex-1 px-6 py-5">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[#EDEDED]">
              {["Description", "Qty", "Price", "Amount"].map((h, i) => (
                <th key={h} className={cn("pb-2 text-[11px] font-medium tracking-[0.06em] uppercase", C.muted, i === 0 ? "text-left" : "text-right")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hasItems ? (
              items
                .filter((i) => i.name.trim() || i.unitPrice)
                .map((i) => (
                  <tr key={i.id} className="border-b border-[#F3F3F3]">
                    <td className={cn("py-2.5 pr-4", C.strong)}>{i.name || <Ghost w={120} />}</td>
                    <td className={cn("py-2.5 text-right tabular", C.text)}>{i.qty.toFixed(2)}</td>
                    <td className={cn("py-2.5 text-right tabular", C.text)}>{money(i.unitPrice)}</td>
                    <td className={cn("py-2.5 text-right tabular", C.strong)}>{money(i.amount)}</td>
                  </tr>
                ))
            ) : (
              <tr className="border-b border-[#F3F3F3]">
                <td className="py-3"><Ghost w={160} /></td>
                <td className="py-3 text-right"><Ghost w={28} /></td>
                <td className="py-3 text-right"><Ghost w={56} /></td>
                <td className="py-3 text-right"><Ghost w={64} /></td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mt-5 grid grid-cols-[1fr_260px] gap-8">
          <div>
            {d.note.trim() && (
              <>
                <Label>Note</Label>
                <p className={cn("mt-1 text-[12px] whitespace-pre-line", C.text)}>{d.note}</p>
              </>
            )}
          </div>
          <dl className="flex flex-col gap-2 text-[12px]">
            <div className="flex justify-between">
              <dt className={C.muted}>Subtotal</dt>
              <dd className={cn("tabular", C.text)}>{money(t.subtotal)}</dd>
            </div>
            {t.discount > 0 && (
              <div className="flex justify-between">
                <dt className={C.muted}>Discount</dt>
                <dd className={cn("tabular", C.text)}>{money(-t.discount)}</dd>
              </div>
            )}
            {d.taxCode !== "EXEMPT" && (
              <div className="flex justify-between">
                <dt className={C.muted}>{d.taxCode === "ZERO" ? "VAT (zero-rated)" : TAX_LABELS[d.taxCode].replace("Standard ", "")}</dt>
                <dd className={cn("tabular", C.text)}>{money(t.tax)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-[#EDEDED] pt-2.5">
              <dt className={cn("font-medium", C.strong)}>Total</dt>
              <dd className={cn("text-[16px] font-medium tabular", C.strong)}>{money(t.total)}</dd>
            </div>
          </dl>
        </div>
      </Section>

      <Section step="payment" active={active === "payment"} onJump={onJump} className="border-t border-[#EDEDED] px-6 py-4">
        {methods.length > 0 ? (
          <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-3">
            {methods.map((m) => {
              const [title, ...rest] = methodLines(m)
              return (
                <div key={m.id} className="min-w-0">
                  <p className={cn("text-[11px] font-medium", C.strong)}>{title}</p>
                  {rest.map((r) => (
                    <p key={r} className={cn("truncate text-[11px]", C.muted)}>{r}</p>
                  ))}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mb-4 flex gap-8"><Ghost w={140} h={24} /><Ghost w={140} h={24} /></div>
        )}
        <div className="flex items-center justify-between">
          <p className={cn("text-[11px]", C.muted)}>Powered by Tapanta Books</p>
          <span className="text-[12px] font-medium text-brand underline underline-offset-4">Choose how you&apos;d like to pay →</span>
        </div>
      </Section>
    </div>
  )
}

/** The right pane: dot canvas, the card scaled to fit, scrolls both ways if it must. */
export function PreviewPane({ active, onJump, className }: { active: StepId; onJump: (s: StepId) => void; className?: string }) {
  const paneRef = React.useRef<HTMLDivElement>(null)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(0.6)
  const [height, setHeight] = React.useState(CARD_MIN_H)

  React.useLayoutEffect(() => {
    const pane = paneRef.current
    const card = cardRef.current
    if (!pane || !card) return
    const ro = new ResizeObserver(() => {
      const fit = (pane.clientWidth - 48) / CARD_W
      setScale(Math.max(0.4, Math.min(0.75, fit)))
      setHeight(card.offsetHeight)
    })
    ro.observe(pane)
    ro.observe(card)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={paneRef} className={cn("relative overflow-auto bg-muted/40", className)}>
      {/* Dot grid with a very slow shimmer; still under reduced motion */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,var(--border)_1px,transparent_1.2px)] [background-size:16px_16px]" />
      <div aria-hidden className="preview-shimmer pointer-events-none absolute inset-0 bg-[radial-gradient(circle,var(--foreground)_1.1px,transparent_1.4px)] [background-size:16px_16px] opacity-45 motion-reduce:hidden" />
      <div className="relative grid min-h-full place-items-center p-6">
        <div style={{ width: CARD_W * scale, height: height * scale }}>
          <div ref={cardRef} style={{ transform: `scale(${scale})`, transformOrigin: "top left", ["--preview-scale" as string]: scale }}>
            <InvoiceDocument active={active} onJump={onJump} />
          </div>
        </div>
      </div>
    </div>
  )
}
