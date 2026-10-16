"use client"

import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type StatusTab = { id: string; label: string; count: number }

/**
 * Status is always chosen with shadcn Tabs, never a dropdown. The first tab
 * is always "All", and every tab shows its count.
 */
export function StatusTabs({
  tabs,
  value,
  onValueChange,
  className,
}: {
  tabs: StatusTab[]
  value: string
  onValueChange: (id: string) => void
  className?: string
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn("min-w-0", className)}>
      <div className="no-scrollbar max-w-full overflow-x-auto">
        <TabsList className="h-9 w-max">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="flex-none gap-1.5 px-3 text-[13px] data-[state=active]:bg-card">
              {t.label}
              <span className="rounded-full bg-background px-1.5 text-[11px] leading-[18px] font-medium tabular text-muted-foreground group-data-[state=active]:bg-muted">
                {t.count}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  )
}
