"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { ALL_PAGES } from "@/lib/nav"
import { NEW_ACTIONS } from "@/lib/actions"
import { usePrefs } from "@/lib/store"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

/**
 * ⌘K: jump to any page or run an action. Stage 2 adds records (invoices,
 * bills, customers, accounts, journals) from the mock ledger.
 */
export function CommandPalette() {
  const router = useRouter()
  const open = usePrefs((s) => s.commandOpen)
  const setOpen = usePrefs((s) => s.setCommandOpen)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!usePrefs.getState().commandOpen)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [setOpen])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search and actions" description="Find a page or run an action">
      <Command>
        <CommandInput placeholder="Search pages and actions, or type “new invoice”…" />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>Nothing matches. Try a page name or “new”.</CommandEmpty>
          <CommandGroup heading="Actions">
            {NEW_ACTIONS.map((a) => (
              <CommandItem
                key={a.id}
                value={`new ${a.label} ${a.keywords ?? ""}`}
                onSelect={() => usePrefs.getState().openForm(a.id)}
              >
                <Plus className="text-muted-foreground" />
                New {a.label.toLowerCase()}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          {[...new Set(ALL_PAGES.map((p) => p.group))].map((group) => (
            <CommandGroup key={group} heading={group}>
              {ALL_PAGES.filter((p) => p.group === group).map((item) => (
                <CommandItem key={item.href} value={`${item.label} ${item.term ?? ""} ${group}`} onSelect={() => go(item.href)}>
                  <item.icon className="text-muted-foreground" />
                  {item.label}
                  {item.term && <CommandShortcut className="font-sans tracking-normal">{item.term}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
