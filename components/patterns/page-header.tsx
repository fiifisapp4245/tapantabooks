"use client"

import * as React from "react"
import { ChevronDown, Download, Ellipsis } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Title, one-line description, and actions in a fixed order:
 * Export menu, then one primary button, then a "…" menu for the rest.
 */
export function PageHeader({
  title,
  description,
  term,
  meta,
  exportable = true,
  primary,
  more,
  children,
}: {
  title: string
  description?: string
  /** Formal accounting name, shown small under the title. */
  term?: string
  /** Extra line under the description, e.g. "as at 5 Oct 2026". */
  meta?: React.ReactNode
  exportable?: boolean
  primary?: React.ReactNode
  more?: { label: string; onSelect?: () => void }[]
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 space-y-1">
        <h1 className="text-[26px] leading-8 font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {(term || meta) && (
          <p className="text-xs text-muted-foreground">
            {term}
            {term && meta && " · "}
            {meta}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        {exportable && <ExportMenu />}
        {primary}
        {more && more.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {more.map((m) => (
                <DropdownMenuItem key={m.label} onSelect={m.onSelect}>
                  {m.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

export function ExportMenu({ formats = ["CSV", "Excel", "PDF"] }: { formats?: string[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download />
          Export
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.map((f) => (
          <DropdownMenuItem key={f} onSelect={() => toast(`Export as ${f} is mocked in the prototype`)}>
            {f}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
