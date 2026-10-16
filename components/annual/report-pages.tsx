"use client"

import * as React from "react"
import type { AnnualReport } from "@/lib/annual/types"
import type { AnnualFigures } from "@/lib/annual/figures"
import type { Company } from "@/lib/types"
import { ArPage, PAGE_H, PAGE_W, themeStyle } from "./page"
import { buildPages, footerText, type BuiltPage } from "./registry"

/** Build the pages once per report change. */
export function useReportPages(report: AnnualReport, figures: AnnualFigures, company: Company) {
  return React.useMemo(() => buildPages(report, figures, company), [report, figures, company])
}

/** One page, drawn at a scale. The sheet itself is always true A4 size inside. */
export function ScaledPage({ page, scale, report, company, onClick, active }: { page: BuiltPage; scale: number; report: AnnualReport; company: Company; onClick?: () => void; active?: boolean }) {
  const Comp = onClick ? "button" : "div"
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={onClick ? `Page ${page.number}` : undefined}
      className={"block shrink-0 overflow-hidden bg-white ring-1 transition " + (active ? "ring-2 ring-[var(--brand)]" : "ring-black/10") + (onClick ? " hover:ring-black/30" : "")}
      style={{ width: PAGE_W * scale, height: PAGE_H * scale }}
    >
      <div style={{ ...themeStyle(report.theme), transform: `scale(${scale})`, transformOrigin: "top left", width: PAGE_W, height: PAGE_H }}>
        <ArPage number={page.number} footer={footerText(company, report.year)} bleed={page.spec.bleed}>
          {page.spec.node}
        </ArPage>
      </div>
    </Comp>
  )
}

/**
 * Every page of the report at full size, one after another. Used for print:
 * each `.ar-print-page` becomes one sheet of paper.
 */
export function PrintableReport({ report, figures, company }: { report: AnnualReport; figures: AnnualFigures; company: Company }) {
  const { pages } = useReportPages(report, figures, company)
  return (
    <div className="ar-print-root" style={themeStyle(report.theme)}>
      {pages.map((p) => (
        <div key={p.key} className="ar-print-page">
          <ArPage number={p.number} footer={footerText(company, report.year)} bleed={p.spec.bleed}>
            {p.spec.node}
          </ArPage>
        </div>
      ))}
    </div>
  )
}
