"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { findSection } from "@/lib/nav"
import { useNavBadges } from "@/lib/selectors"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * Joins pages that share one sidebar entry (Invoices | Credit notes,
 * the reports, the Settings pages). Each tab is a link, so every page keeps
 * its own address. Renders nothing on pages outside a section.
 */
export function SectionTabs() {
  const pathname = usePathname()
  const badges = useNavBadges()
  const section = findSection(pathname)
  // Settings has its own underlined tabs in app/(app)/settings/layout.tsx.
  if (!section || section.id === "settings") return null
  return (
    <Tabs value={pathname} className="min-w-0">
      <nav aria-label={section.label} className="no-scrollbar max-w-full overflow-x-auto">
        <TabsList className="h-9 w-max">
          {section.pages.map((p) => {
            const count = p.badge ? badges[p.badge] : 0
            return (
              <TabsTrigger key={p.href} value={p.href} asChild className="flex-none gap-1.5 px-3 text-[13px] data-[state=active]:bg-card">
                <Link href={p.href}>
                  {p.label}
                  {count ? (
                    <span className="rounded-full bg-background px-1.5 text-[11px] leading-[18px] font-medium tabular text-muted-foreground">{count}</span>
                  ) : null}
                </Link>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </nav>
    </Tabs>
  )
}
