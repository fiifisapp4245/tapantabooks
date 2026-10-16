"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type Row,
  type RowData,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronsUpDown, Columns3, LayoutGrid, Rows3, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFirstLoad } from "@/lib/use-first-load"
import { usePrefs } from "@/lib/store"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "right"
    /** Label used in the column menu when the header isn't a plain string. */
    label?: string
    /** Lets long text wrap instead of being clipped. */
    wrap?: boolean
    width?: string
  }
}

type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  getRowId?: (row: T) => string
  onRowClick?: (row: T) => void
  /** Column ids hidden by default; viewers can show them from the column menu. */
  hiddenColumns?: string[]
  searchPlaceholder?: string
  /** Filter chips rendered between the search field and the column menu. */
  filters?: React.ReactNode
  empty?: React.ReactNode
  initialSorting?: SortingState
  className?: string
}

/**
 * The one table. Sticky header; the first column (number/name) and the last
 * (amount/status) are pinned so nothing important hides behind a sideways
 * scroll; low-priority columns hide by default.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  // The table mounts after the first-load skeleton, so it never prerenders
  // (TanStack reads the clock while building rows).
  const loading = useFirstLoad()
  if (loading) return <DataTableSkeleton columns={props.columns} hiddenColumns={props.hiddenColumns ?? []} className={props.className} />
  return <DataTableInner {...props} />
}

function DataTableSkeleton<T>({
  columns,
  hiddenColumns,
  className,
}: {
  columns: ColumnDef<T, unknown>[]
  hiddenColumns: string[]
  className?: string
}) {
  const cols = columns.filter((c) => {
    const id = c.id ?? ("accessorKey" in c ? String(c.accessorKey) : "")
    return !hiddenColumns.includes(id)
  })
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)} aria-busy="true">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-full sm:w-64" />
        <Skeleton className="ml-auto h-9 w-28" />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex h-10 items-center gap-4 border-b px-4">
          {cols.map((c, i) => (
            <span key={i} className={cn("flex-1 text-xs font-medium text-muted-foreground", c.meta?.align === "right" && "text-right")}>
              {typeof c.header === "string" ? c.header : ""}
            </span>
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, r) => (
          <div key={r} className="flex h-12 items-center gap-4 border-b px-4 last:border-b-0">
            {cols.map((_, i) => (
              <span key={i} className="flex-1"><Skeleton className="h-4 w-full max-w-32" /></span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function DataTableInner<T>({
  columns,
  data,
  getRowId,
  onRowClick,
  hiddenColumns = [],
  searchPlaceholder = "Search",
  filters,
  empty,
  initialSorting = [],
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() =>
    Object.fromEntries(hiddenColumns.map((id) => [id, false]))
  )

  const table = useReactTable({
    data,
    columns,
    getRowId: getRowId ? (r) => getRowId(r) : undefined,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
  })

  const visible = table.getVisibleLeafColumns()
  const firstId = visible[0]?.id
  const lastId = visible[visible.length - 1]?.id
  const pinClass = (id: string) =>
    id === firstId
      ? "sticky left-0 z-[1] bg-inherit after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border"
      : id === lastId
        ? "sticky right-0 z-[1] bg-inherit before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-border"
        : ""

  const rows = table.getRowModel().rows
  const view = usePrefs((p) => p.tableView)
  const setView = usePrefs((p) => p.setTableView)
  const labelOf = (c: (typeof visible)[number]) =>
    c.columnDef.meta?.label ?? (typeof c.columnDef.header === "string" ? c.columnDef.header : c.id)
  const sortable = visible.filter((c) => c.getCanSort())
  const sortValue = sorting[0] ? `${sorting[0].id}:${sorting[0].desc ? "desc" : "asc"}` : ""

  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="bg-card pl-9"
            aria-label={searchPlaceholder}
          />
        </div>
        {filters}
        <div className="ml-auto flex items-center gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            value={view}
            onValueChange={(v) => v && setView(v as typeof view)}
            aria-label="View"
            className="bg-card"
          >
            <ToggleGroupItem value="table" aria-label="Table view" title="Table view" className="size-9 bg-card">
              <Rows3 />
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Card view" title="Card view" className="size-9 bg-card">
              <LayoutGrid />
            </ToggleGroupItem>
          </ToggleGroup>
          {/* Cards have no column headers to click, so they get a Sort menu instead. */}
          {view === "cards" && sortable.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ArrowUpDown />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sortValue}
                  onValueChange={(v) => {
                    const [id, dir] = v.split(":")
                    setSorting([{ id, desc: dir === "desc" }])
                  }}
                >
                  {sortable.flatMap((c) => [
                    <DropdownMenuRadioItem key={`${c.id}:asc`} value={`${c.id}:asc`}>
                      {labelOf(c)} <ArrowUp className="ml-auto size-3.5 text-muted-foreground" />
                    </DropdownMenuRadioItem>,
                    <DropdownMenuRadioItem key={`${c.id}:desc`} value={`${c.id}:desc`}>
                      {labelOf(c)} <ArrowDown className="ml-auto size-3.5 text-muted-foreground" />
                    </DropdownMenuRadioItem>,
                  ])}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Columns3 />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {c.columnDef.meta?.label ?? (typeof c.columnDef.header === "string" ? c.columnDef.header : c.id)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {view === "cards" ? (
        <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
          <CardGrid rows={rows} onRowClick={onRowClick} empty={empty} labelOf={labelOf} />
        </div>
      ) : (
      // The table is the only thing that scrolls: it fills whatever height its page gives it.
      <div className="overflow-auto rounded-xl border bg-card md:min-h-0 md:flex-1">
        <table className="w-full caption-bottom border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-[2] bg-card">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-card">
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta
                  const sorted = h.column.getIsSorted()
                  return (
                    <th
                      key={h.id}
                      style={{ width: meta?.width }}
                      className={cn(
                        "relative h-10 border-b px-4 text-left text-xs font-medium whitespace-nowrap text-muted-foreground",
                        meta?.align === "right" && "text-right",
                        pinClass(h.column.id)
                      )}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    >
                      {h.isPlaceholder ? null : h.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className={cn(
                            "-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-foreground",
                            meta?.align === "right" && "flex-row-reverse"
                          )}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="bg-card">
                <td colSpan={visible.length} className="p-0">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter") onRowClick(row.original)
                        }
                      : undefined
                  }
                  className={cn(
                    "group/row bg-card transition-colors [&:last-child>td]:border-b-0",
                    onRowClick && "cursor-pointer hover:bg-[color-mix(in_oklab,var(--card),var(--foreground)_3%)] focus-visible:outline-offset-[-2px]"
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "relative h-12 border-b px-4 align-middle",
                          meta?.wrap ? "py-2.5 whitespace-normal" : "whitespace-nowrap",
                          meta?.align === "right" && "text-right",
                          pinClass(cell.column.id)
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
      {rows.length > 0 && (
        <p className="shrink-0 text-xs text-muted-foreground">
          {rows.length} of {data.length} {data.length === 1 ? "row" : "rows"}
        </p>
      )}
    </div>
  )
}

/**
 * Card view: the first visible column is the card's title, the last (amount
 * or status) sits top right, and the rest are labelled fields underneath.
 */
function CardGrid<T>({
  rows,
  onRowClick,
  empty,
  labelOf,
}: {
  rows: Row<T>[]
  onRowClick?: (row: T) => void
  empty?: React.ReactNode
  labelOf: (c: Column<T, unknown>) => string
}) {
  if (rows.length === 0) return <div className="rounded-xl border bg-card">{empty}</div>
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        const cells = row.getVisibleCells()
        const first = cells[0]
        const last = cells.length > 1 ? cells[cells.length - 1] : undefined
        const rest = cells.slice(1, last ? -1 : undefined)
        const Comp = onRowClick ? "button" : "div"
        return (
          <Comp
            key={row.id}
            type={onRowClick ? "button" : undefined}
            onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            className={cn(
              "flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 text-left text-sm",
              onRowClick && "transition-colors hover:border-foreground/20"
            )}
          >
            <div className="flex w-full min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 truncate">{flexRender(first.column.columnDef.cell, first.getContext())}</div>
              {last && <div className="shrink-0 text-right">{flexRender(last.column.columnDef.cell, last.getContext())}</div>}
            </div>
            {rest.length > 0 && (
              <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-2.5 border-t pt-3">
                {rest.map((cell) => (
                  <div key={cell.id} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{labelOf(cell.column)}</dt>
                    <dd className="mt-0.5 min-w-0 truncate [&_*]:text-left [&>div]:text-left">{flexRender(cell.column.columnDef.cell, cell.getContext())}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Comp>
        )
      })}
    </div>
  )
}
