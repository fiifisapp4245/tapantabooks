"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { NAV, NAV_FOOTER, activeSidebarHref, type SidebarItem } from "@/lib/nav"
import { useNavBadges } from "@/lib/selectors"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Logo } from "./logo"

/**
 * 15 destinations, everyday money work first. Pages that left the sidebar
 * (credit notes, single reports, integrations, audit trail) are tabs on their
 * parent page, so the parent stays highlighted while you're on them.
 */
export function AppSidebar() {
  const active = activeSidebarHref(usePathname())
  const badges = useNavBadges()

  const item = (i: SidebarItem) => {
    const isActive = active === i.href
    const keys = i.badges ?? (i.badge ? [i.badge] : [])
    const count = keys.reduce((t, k) => t + (badges[k] ?? 0), 0)
    return (
      <SidebarMenuItem key={i.href}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={i.label}
          className="relative h-8 text-[13.5px] data-active:font-medium data-active:before:absolute data-active:before:inset-y-2 data-active:before:left-0 data-active:before:w-[2px] data-active:before:rounded-full data-active:before:bg-brand"
        >
          <Link href={i.href}>
            <i.icon className={isActive ? "text-foreground" : "text-muted-foreground"} />
            <span>{i.label}</span>
          </Link>
        </SidebarMenuButton>
        {count > 0 && (
          <SidebarMenuBadge className="rounded-full bg-sidebar-accent px-1.5 text-[11px] text-muted-foreground tabular peer-data-active/menu-button:bg-card">
            {count}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar collapsible="icon" className="group-data-[side=left]:border-r-0">
      <SidebarHeader className="h-14 justify-center px-3">
        <Link href="/" className="rounded-md" aria-label="Tapanta Books home">
          <Logo />
        </Link>
      </SidebarHeader>
      <SidebarContent className="gap-0 pb-4">
        {NAV.map((group, gi) => (
          <SidebarGroup key={group.label ?? gi} className="py-1">
            {group.label && <SidebarGroupLabel className="h-7 text-[11px] font-medium tracking-wide uppercase">{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu className="gap-px">{group.items.map(item)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        <SidebarMenu>{item(NAV_FOOTER)}</SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
