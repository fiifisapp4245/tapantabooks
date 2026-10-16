"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SECTIONS } from "@/lib/nav"
import { useNavBadges } from "@/lib/selectors"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * Every Settings page starts with one row of shadcn tabs that stays put while
 * you move between areas. Each page renders its own heading below it.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const badges = useNavBadges()
  const tabs = SECTIONS.find((s) => s.id === "settings")!.pages
  // The longest matching href wins, so /settings/companies/new keeps "Companies" selected.
  const active = tabs
    .filter((t) => pathname === t.href || pathname.startsWith(t.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    // Fills the panel: the tabs stay put and each page scrolls below them.
    <div className="flex h-full min-h-0 flex-col">
      {/* No "Settings" title: the sidebar already says where you are, so the tabs
          come first and each tab's own heading sits under them. */}
      <div className="shrink-0 px-4 pt-6 md:px-8">
        <Tabs value={active ?? ""}>
          <nav aria-label="Settings" className="no-scrollbar max-w-full overflow-x-auto">
            <TabsList className="h-9 w-max">
              {tabs.map((t) => {
                const count = t.badge ? badges[t.badge] : 0
                return (
                  <TabsTrigger key={t.href} value={t.href} asChild className="flex-none gap-1.5 px-3 text-[13px] data-[state=active]:bg-card">
                    <Link href={t.href}>
                      {t.label}
                      {count ? <span className="rounded-full bg-warning-soft px-1.5 text-[11px] leading-[18px] font-medium tabular text-warning">{count}</span> : null}
                    </Link>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </nav>
        </Tabs>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
