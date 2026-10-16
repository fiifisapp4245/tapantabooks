"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import {
  Bell,
  Check,
  ChevronsUpDown,
  Monitor,
  Moon,
  Search,
  Sun,
} from "lucide-react"
import { BRANCHES, CURRENT_PERIOD, USERS } from "@/lib/constants"
import { useLedger } from "@/lib/ledger"
import { usePrefs } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function TopBar() {
  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-2 bg-sidebar px-3 md:px-4">
      <SidebarTrigger className="size-9" />
      <Separator orientation="vertical" className="mx-1 h-5 data-[orientation=vertical]:self-center" />
      <EntitySwitcher />
      <div className="mx-auto hidden min-w-0 max-w-md flex-1 lg:block">
        <SearchButton />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:ml-0">
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Search" onClick={() => usePrefs.getState().setCommandOpen(true)}>
          <Search />
        </Button>
        <PeriodChip />
        <Notifications />
        <UserMenu />
      </div>
    </header>
  )
}

function EntitySwitcher() {
  const { entityId, branchId, setEntity, setBranch } = usePrefs()
  const companies = useLedger((s) => s.companies)
  const entity = companies.find((e) => e.id === entityId) ?? companies[0]
  const branch = BRANCHES.find((b) => b.id === branchId) ?? BRANCHES[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 max-w-[260px] min-w-0 gap-2 px-2" aria-label={`${entity.name}, ${branch.name}`}>
          <span className="flex size-6 items-center justify-center rounded-md bg-foreground text-[10px] font-semibold text-background">
            {entity.short}
          </span>
          <span className="hidden min-w-0 flex-col items-start leading-tight sm:flex">
            <span className="truncate text-[13px] font-medium">{entity.name}</span>
            <span className="truncate text-[11px] text-muted-foreground">{branch.name}</span>
          </span>
          <ChevronsUpDown className="hidden text-muted-foreground sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Company</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={entityId} onValueChange={setEntity}>
          {companies.map((e) => (
            <DropdownMenuRadioItem key={e.id} value={e.id}>
              {e.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Branch</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={branchId} onValueChange={setBranch}>
          {BRANCHES.map((b) => (
            <DropdownMenuRadioItem key={b.id} value={b.id}>
              {b.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SearchButton() {
  const setOpen = usePrefs((s) => s.setCommandOpen)
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-9 w-full items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20"
    >
      <Search className="size-4" />
      <span className="flex-1 truncate text-left">Search invoices, customers, accounts…</span>
      <kbd className="rounded border bg-muted px-1.5 font-mono text-[11px]">⌘K</kbd>
    </button>
  )
}

function PeriodChip() {
  return (
    <Button variant="outline" asChild className="hidden gap-2 bg-card lg:inline-flex">
      <Link href="/period-close" aria-label={`Current period ${CURRENT_PERIOD.label}, ${CURRENT_PERIOD.status}`}>
        <span className="size-1.5 rounded-full bg-success" aria-hidden />
        {CURRENT_PERIOD.label}
        <span className="text-muted-foreground">· {CURRENT_PERIOD.status}</span>
      </Link>
    </Button>
  )
}

function Notifications() {
  const items = [
    { title: "1 journal is awaiting your approval", time: "2 hours ago", unread: true },
    { title: "QuickBooks hasn't synced for 286 days", time: "Today", unread: true },
    { title: "Import batch IMP-007 needs attention", time: "Yesterday", unread: false },
  ]
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications, 2 unread" className="relative">
          <Bell />
          <span className="absolute top-2 right-2 size-1.5 rounded-full bg-brand" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <p className="border-b px-4 py-3 text-sm font-medium">Notifications</p>
        <ul>
          {items.map((n) => (
            <li key={n.title} className="flex gap-3 border-b px-4 py-3 last:border-b-0">
              <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.unread ? "bg-brand" : "bg-transparent")} />
              <div className="space-y-0.5">
                <p className="text-sm">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.time}</p>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

function UserMenu() {
  const { userId, setUser, showAccountingDetail, toggleAccountingDetail } = usePrefs()
  const { theme, setTheme } = useTheme()
  const user = USERS.find((u) => u.id === userId) ?? USERS[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Account: ${user.name}`}>
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">{user.initials}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium text-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.role}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">Switch user (demo)</DropdownMenuLabel>
        {USERS.map((u) => (
          <DropdownMenuItem key={u.id} onSelect={() => setUser(u.id)}>
            <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[9px] font-semibold">{u.initials}</span>
            <span className="flex-1">{u.name}</span>
            <span className="text-xs text-muted-foreground">{u.role}</span>
            {u.id === userId && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toggleAccountingDetail() }}>
          <span className="flex-1">Show accounting detail</span>
          <Switch checked={showAccountingDetail} tabIndex={-1} aria-hidden className="pointer-events-none" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light"><Sun className="text-muted-foreground" />Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon className="text-muted-foreground" />Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><Monitor className="text-muted-foreground" />System</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
