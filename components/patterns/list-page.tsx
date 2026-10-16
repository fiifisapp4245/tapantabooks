"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { usePathname } from "next/navigation"
import { findNavItem } from "@/lib/nav"
import { cn } from "@/lib/utils"
import { PageHeader } from "./page-header"
import { KpiStrip, type Kpi } from "./kpi-strip"
import type { StatusTab } from "./status-tabs"
import { FilterChip } from "./filter-chip"
import { DataTable } from "./data-table"
import { SectionTabs } from "./section-tabs"

/** Page padding and width, shared by every screen. */
export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto flex w-full max-w-[1320px] min-w-0 flex-col gap-6 px-4 py-6 md:px-8 md:py-8", className)}>
      <SectionTabs />
      {children}
    </div>
  )
}

/**
 * The one list template, top to bottom: PageHeader → KpiStrip → toolbar
 * (search, Status first, then the page's own filters) → DataTable. The title always comes from the nav, so the nav label
 * and the page title can't drift apart.
 */
export function ListPage<T>({
  primary,
  more,
  kpis,
  activeKpi,
  onKpiSelect,
  tabs,
  tab,
  onTabChange,
  tabLabel = "Status",
  columns,
  data,
  getRowId,
  onRowClick,
  hiddenColumns,
  searchPlaceholder,
  filters,
  empty,
  children,
}: {
  primary?: React.ReactNode
  more?: { label: string; onSelect?: () => void }[]
  kpis?: Kpi[]
  activeKpi?: string
  onKpiSelect?: (id: string) => void
  tabs: StatusTab[]
  tab: string
  onTabChange: (id: string) => void
  /** Name of the first filter. "Status" unless the options are something else, e.g. "Type". */
  tabLabel?: string
  columns: ColumnDef<T, unknown>[]
  data: T[]
  getRowId?: (row: T) => string
  onRowClick?: (row: T) => void
  hiddenColumns?: string[]
  searchPlaceholder?: string
  filters?: React.ReactNode
  empty?: React.ReactNode
  /** Drawers and dialogs owned by the page. */
  children?: React.ReactNode
}) {
  const nav = findNavItem(usePathname())
  return (
    // From tablet width up the page fits the panel: heading, KPIs and filters stay put and only the table scrolls.
    <PageBody className="md:h-full md:min-h-0">
      <PageHeader title={nav?.label ?? ""} description={nav?.description} primary={primary} more={more} />
      {kpis && <KpiStrip items={kpis} activeId={activeKpi} onSelect={onKpiSelect} />}
      <DataTable
        className="md:min-h-0 md:flex-1"
        columns={columns}
        data={data}
        getRowId={getRowId}
        onRowClick={onRowClick}
        hiddenColumns={hiddenColumns}
        searchPlaceholder={searchPlaceholder}
        filters={
          <>
            {/* Status is a filter like the others, and comes first. "All" is the cleared state. */}
            <FilterChip
              label={tabLabel}
              value={tab === "all" ? undefined : tab}
              onChange={(v) => onTabChange(v ?? "all")}
              options={tabs.filter((t) => t.id !== "all").map((t) => ({ value: t.id, label: t.label, count: t.count }))}
            />
            {filters}
          </>
        }
        empty={empty}
      />
      {children}
    </PageBody>
  )
}
