"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLedger } from "@/lib/ledger"
import type { Account, AccountType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Code } from "./text"

const TYPE_LABELS: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  cost_of_sales: "Cost of sales",
  expense: "Expenses",
}

/**
 * Searchable account picker, grouped by type, showing code + name. Every
 * account field in the app uses this.
 */
export function AccountPicker({
  value,
  onChange,
  types,
  filter,
  placeholder = "Choose an account",
  className,
  id,
  invalid,
}: {
  value?: string
  onChange: (code: string) => void
  types?: AccountType[]
  filter?: (a: Account) => boolean
  placeholder?: string
  className?: string
  id?: string
  invalid?: boolean
}) {
  const accounts = useLedger((s) => s.accounts)
  const [open, setOpen] = React.useState(false)
  const list = accounts.filter((a) => a.active && (!types || types.includes(a.type)) && (!filter || filter(a)))
  const selected = accounts.find((a) => a.code === value)
  const groups = (Object.keys(TYPE_LABELS) as AccountType[]).map((t) => ({ type: t, items: list.filter((a) => a.type === t) })).filter((g) => g.items.length)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          className={cn("w-full justify-between bg-card px-3 font-normal", !selected && "text-muted-foreground", className)}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            {selected ? (
              <>
                <Code>{selected.code}</Code>
                <span className="truncate text-foreground">{selected.name}</span>
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name or code" />
          <CommandList>
            <CommandEmpty>No account matches.</CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g.type} heading={TYPE_LABELS[g.type]}>
                {g.items.map((a) => (
                  <CommandItem
                    key={a.code}
                    value={`${a.code} ${a.name} ${a.category}`}
                    onSelect={() => {
                      onChange(a.code)
                      setOpen(false)
                    }}
                  >
                    <Code className="w-10 shrink-0">{a.code}</Code>
                    <span className="truncate">{a.name}</span>
                    <Check className={cn("ml-auto size-4", value === a.code ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Searchable customer or supplier picker, with "+ New" at the bottom. */
export function ContactPicker({
  kind,
  value,
  onChange,
  onCreate,
  placeholder,
  className,
  id,
  allowNone,
}: {
  kind: "customer" | "supplier" | "any"
  value?: string
  onChange: (id: string | undefined) => void
  onCreate?: () => void
  placeholder?: string
  className?: string
  id?: string
  allowNone?: boolean
}) {
  const contacts = useLedger((s) => s.contacts)
  const [open, setOpen] = React.useState(false)
  const list = contacts.filter((c) => kind === "any" || c.kind === kind)
  const selected = contacts.find((c) => c.id === value)
  const groups = kind === "any" ? (["customer", "supplier"] as const) : ([kind] as const)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between bg-card px-3 font-normal", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate">{selected ? <span className="text-foreground">{selected.name}</span> : placeholder ?? `Choose a ${kind === "any" ? "contact" : kind}`}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name" />
          <CommandList>
            <CommandEmpty>No one matches.</CommandEmpty>
            {allowNone && (
              <CommandGroup>
                <CommandItem value="none no contact" onSelect={() => { onChange(undefined); setOpen(false) }}>
                  <span className="text-muted-foreground">No contact</span>
                </CommandItem>
              </CommandGroup>
            )}
            {groups.map((g) => (
              <CommandGroup key={g} heading={g === "customer" ? "Customers" : "Suppliers"}>
                {list
                  .filter((c) => c.kind === g)
                  .map((c) => (
                    <CommandItem key={c.id} value={`${c.name} ${c.city}`} onSelect={() => { onChange(c.id); setOpen(false) }}>
                      <span className="truncate">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.city}</span>
                      <Check className={cn("ml-auto size-4", value === c.id ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
            {onCreate && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem value="+ new create add" onSelect={() => { setOpen(false); onCreate() }}>
                    <Plus className="size-4" />
                    New {kind === "supplier" ? "supplier" : "customer"}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
