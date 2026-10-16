"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type SideItem = { id: string; label: string }

/**
 * A settings page with a side menu. The title and the side menu stay put;
 * only the chosen section's content scrolls. On phones the side menu becomes
 * a dropdown above the content.
 */
export function SettingsSplit({
  title,
  description,
  actions,
  items,
  value,
  onChange,
  children,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  items: readonly SideItem[]
  value: string
  onChange: (id: string) => void
  children: React.ReactNode
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  // A new section starts at the top.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [value])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4 px-4 pt-6 pb-5 md:px-8">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[26px] leading-8 font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 md:flex-row md:gap-10 md:px-8">
        <nav aria-label={`${title} sections`} className="shrink-0 md:w-60">
          <div className="md:hidden">
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger className="w-full" aria-label="Section">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ul className="hidden flex-col gap-0.5 md:flex">
            {items.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onChange(s.id)}
                  aria-current={value === s.id ? "page" : undefined}
                  className={cn(
                    "w-full rounded-lg px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
                    value === s.id && "bg-muted font-medium text-foreground"
                  )}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div ref={scrollRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-8 md:-mr-4 md:pr-4">
          <div key={value} className="flex max-w-[880px] flex-col gap-6 duration-200 animate-in fade-in-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
