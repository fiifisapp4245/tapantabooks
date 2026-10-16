"use client"

import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

/** A dashed chip that becomes solid once a value is picked. */
export function FilterChip({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string; count?: number }[]
  value?: string
  onChange: (value: string | undefined) => void
}) {
  const selected = options.find((o) => o.value === value)
  return (
    <Popover>
      <div className="inline-flex">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "bg-card",
              !selected && "border-dashed text-muted-foreground",
              selected && "rounded-r-none border-r-0"
            )}
          >
            {label}
            {selected && <span className="font-medium text-foreground">: {selected.label}</span>}
            {!selected && <ChevronDown className="opacity-60" />}
          </Button>
        </PopoverTrigger>
        {selected && (
          <Button
            variant="outline"
            size="icon"
            className="rounded-l-none bg-card"
            aria-label={`Clear ${label} filter`}
            onClick={() => onChange(undefined)}
          >
            <X />
          </Button>
        )}
      </div>
      <PopoverContent align="start" className="w-56 p-0">
        <Command>
          {options.length > 6 && <CommandInput placeholder={`Search ${label.toLowerCase()}`} />}
          <CommandList>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} value={o.label} onSelect={() => onChange(o.value === value ? undefined : o.value)}>
                  <Check className={cn("size-4", o.value === value ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1">{o.label}</span>
                  {o.count != null && <span className="text-xs text-muted-foreground tabular">{o.count}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
