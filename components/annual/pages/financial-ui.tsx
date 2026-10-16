"use client"

/**
 * Building blocks for the financial pages: the statement header, the
 * statement table (highlighted current-year column, bold subtotals, thin and
 * double rules) and the note heading. Colours come from the report theme.
 */
import * as React from "react"
import { cn } from "@/lib/utils"
import { fsNum } from "../page"

export const HEADING_FONT = "var(--font-open-runde)"
export const GREY = "#6B6B6B"
export const RULE = "#1E1E1E"

/** Estimated heights (px) used to paginate without measuring the DOM. */
export const ROW_H = 21
export const TABLE_HEAD_H = 30
/** Usable height of a standard page's content area, with a safety margin. */
export const PAGE_CONTENT_H = 930

export function StatementHeader({
  company,
  title,
  period,
  amounts = true,
  continued,
}: {
  company: string
  title: string
  period?: string
  amounts?: boolean
  continued?: boolean
}) {
  return (
    <div className={continued ? "mb-5" : "mb-6"}>
      <span className="mb-3 block h-1 w-12" style={{ background: "var(--ar-primary)" }} />
      <p className="mb-1 text-[10px] font-semibold tracking-[0.14em] uppercase" style={{ color: GREY }}>
        {company}
      </p>
      <h2
        className={cn("leading-[1.15] font-semibold tracking-[-0.015em]", continued ? "text-[17px]" : "text-[22px]")}
        style={{ fontFamily: HEADING_FONT, color: "var(--ar-ink)" }}
      >
        {title}
        {continued && <span className="font-normal" style={{ color: GREY }}> (continued)</span>}
      </h2>
      {period && !continued && (
        <p className="mt-0.5 text-[13px] font-medium" style={{ fontFamily: HEADING_FONT, color: "var(--ar-ink)" }}>
          {period}
        </p>
      )}
      {amounts && !continued && <p className="mt-1.5 text-[10px]" style={{ color: GREY }}>(All amounts in Ghana cedis)</p>}
    </div>
  )
}

/** Height of a full (not continued) StatementHeader. */
export const HEADER_H = 118
export const HEADER_CONTINUED_H = 72

export type Col = { label: string; highlight?: boolean; width?: number }

export type Row = {
  label: React.ReactNode
  note?: string | number
  /** One per column: a number (fsNum), a ready string, or null for an empty cell. */
  values?: (number | string | null)[]
  /** line: plain · heading: section heading · sub: subtotal (rule above) · total: rules above and below · grand: rule above, double rule below · gap: spacer. */
  kind?: "line" | "heading" | "sub" | "total" | "grand" | "gap"
  indent?: boolean
}

export function StatementTable({
  cols,
  rows,
  showNote = true,
  labelHeader,
  className,
  size = "md",
}: {
  cols: Col[]
  rows: Row[]
  showNote?: boolean
  labelHeader?: string
  className?: string
  size?: "md" | "sm"
}) {
  const fs = size === "sm" ? "text-[10.5px]" : "text-[11px]"
  return (
    <table className={cn("w-full table-fixed border-collapse leading-[14px]", fs, className)} style={{ fontVariantNumeric: "tabular-nums" }}>
      <colgroup>
        <col />
        {showNote && <col style={{ width: 44 }} />}
        {cols.map((c, i) => (
          <col key={i} style={{ width: c.width ?? 96 }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th className="pb-1.5 text-left align-bottom text-[10px] font-semibold" style={{ color: GREY, borderBottom: `1px solid ${RULE}` }}>
            {labelHeader}
          </th>
          {showNote && (
            <th className="pb-1.5 text-center align-bottom text-[10px] font-semibold" style={{ color: GREY, borderBottom: `1px solid ${RULE}` }}>
              Note
            </th>
          )}
          {cols.map((c, i) => (
            <th
              key={i}
              className="px-2 py-1.5 text-right align-bottom text-[11px] font-semibold"
              style={{
                borderBottom: `1px solid ${RULE}`,
                background: c.highlight ? "var(--ar-primary)" : undefined,
                color: c.highlight ? "var(--ar-on-primary)" : "var(--ar-ink)",
              }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const kind = r.kind ?? "line"
          const bold = kind !== "line" && kind !== "gap"
          if (kind === "gap") {
            return (
              <tr key={i} aria-hidden>
                <td className="h-2" colSpan={showNote ? 2 : 1} />
                {cols.map((c, j) => (
                  <td key={j} className="h-2" style={{ background: c.highlight ? "var(--ar-tint)" : undefined }} />
                ))}
              </tr>
            )
          }
          const numBorder: React.CSSProperties =
            kind === "sub"
              ? { borderTop: `1px solid ${RULE}` }
              : kind === "total"
                ? { borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }
                : kind === "grand"
                  ? { borderTop: `1px solid ${RULE}`, borderBottom: `3px double ${RULE}` }
                  : {}
          return (
            <tr key={i} className={cn(bold && "font-semibold")}>
              <td
                className={cn("py-[3px] pr-2", kind === "heading" && "pt-2.5", r.indent && "pl-3")}
                style={{ color: kind === "heading" ? "var(--ar-ink)" : undefined }}
              >
                {r.label}
              </td>
              {showNote && (
                <td className="py-[3px] text-center font-normal" style={{ color: GREY }}>
                  {r.note ?? ""}
                </td>
              )}
              {cols.map((c, j) => {
                const v = r.values?.[j]
                return (
                  <td
                    key={j}
                    className={cn("px-2 py-[3px] text-right whitespace-nowrap", kind === "heading" && "pt-2.5")}
                    style={{ ...numBorder, background: c.highlight ? "var(--ar-tint)" : undefined }}
                  >
                    {typeof v === "number" ? fsNum(v) : (v ?? "")}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Estimated height of a StatementTable. */
export const tableHeight = (rows: Row[]) =>
  TABLE_HEAD_H + rows.reduce((h, r) => h + (r.kind === "gap" ? 8 : r.kind === "heading" ? ROW_H + 8 : ROW_H), 0)

/** A numbered note heading; the number in the brand colour. */
export function NoteHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-baseline gap-2.5 text-[13px] font-semibold" style={{ fontFamily: HEADING_FONT, color: "var(--ar-ink)" }}>
      <span className="tabular-nums" style={{ color: "var(--ar-primary)" }}>
        {n}
      </span>
      {children}
    </h3>
  )
}
export const NOTE_HEADING_H = 28

/** Small print under a statement. */
export function FootLine({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[10px] leading-[1.5]", className)} style={{ color: GREY }}>
      {children}
    </p>
  )
}

/** "+19.0%" / "−4.2%". */
export function pctChange(g: number) {
  const v = (g * 100).toFixed(1)
  return g >= 0 ? `+${v}%` : `−${v.replace("-", "")}%`
}

export const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`
