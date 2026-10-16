"use client"

import * as React from "react"
import { Check, ChevronDown, ChevronRight, Plus, Search } from "lucide-react"
import { Command as CommandPrimitive } from "cmdk"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { create } from "zustand"

/*
 * Editor field kit. Same look as the reference: a 1px inset ring that
 * darkens on focus with a soft grey halo, a grey hover tint, and a red ring
 * when invalid. Flat — no drop shadows.
 */

const EASE = "transition-all duration-200 ease-[cubic-bezier(0,0,0.2,1)]"

export const fieldShell = cn(
  "relative flex w-full items-center rounded-lg bg-card ring-1 ring-input ring-inset",
  EASE,
  "hover:not-focus-within:bg-muted/60",
  "focus-within:ring-foreground/75 focus-within:shadow-[0_0_0_2px_var(--card),0_0_0_4px_rgb(163_163_163/0.16)]",
  "has-[[aria-invalid=true]]:ring-destructive has-[[aria-invalid=true]]:shadow-none",
  "has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-muted/50"
)

const inputCls =
  "h-10 w-full min-w-0 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground group-hover/field:placeholder:text-foreground/60 disabled:cursor-not-allowed focus-visible:outline-none"

export function FieldLabel({ htmlFor, children, action }: { htmlFor?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {children}
      </label>
      {action}
    </div>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={`${id}-error`} className="text-xs text-destructive">
      {message}
    </p>
  )
}

/** Label + control + error, 8px apart. */
export function EField({ id, label, error, action, className, children }: { id: string; label: React.ReactNode; error?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <FieldLabel htmlFor={id} action={action}>
        {label}
      </FieldLabel>
      {children}
      <FieldError id={id} message={error} />
    </div>
  )
}

export function TextInput({ id, error, className, ...props }: React.ComponentProps<"input"> & { id: string; error?: string }) {
  return (
    <div className={cn("group/field", fieldShell, className)}>
      <input id={id} aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : undefined} className={inputCls} {...props} />
    </div>
  )
}

export function TextArea({ id, className, ...props }: React.ComponentProps<"textarea"> & { id: string }) {
  return (
    <div className={cn("group/field", fieldShell, "items-stretch", className)}>
      <textarea id={id} className={cn(inputCls, "h-auto min-h-[100px] resize-y py-2.5")} {...props} />
    </div>
  )
}

const fmt2 = (n: number) => n.toFixed(2)

/**
 * Numbers typed freely, shown as 0.00 placeholder, formatted to two decimals
 * on blur. `minor` stores integer minor units; otherwise the plain number.
 */
export function NumberInput({
  id,
  value,
  onValue,
  minor,
  error,
  className,
  align = "right",
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  id: string
  value: number
  onValue: (v: number) => void
  minor?: boolean
  error?: string
  align?: "left" | "right"
}) {
  const shown = minor ? value / 100 : value
  const [text, setText] = React.useState(shown ? fmt2(shown) : "")
  const [focused, setFocused] = React.useState(false)
  // Follow outside changes (e.g. picking a product) while not typing.
  const display = focused ? text : shown ? fmt2(shown) : ""
  return (
    <div className={cn("group/field", fieldShell, className)}>
      <input
        id={id}
        inputMode="decimal"
        placeholder="0.00"
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(inputCls, "tabular", align === "right" && "text-right")}
        value={display}
        onFocus={(e) => {
          setText(shown ? String(shown) : "")
          setFocused(true)
          // Select the number so typing replaces it.
          const el = e.currentTarget
          requestAnimationFrame(() => el.select())
        }}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1").replace(/(\.\d{2})\d+/, "$1")
          setText(t)
          const n = Number(t) || 0
          onValue(minor ? Math.round(n * 100) : n)
        }}
        onBlur={() => {
          setFocused(false)
          setText(shown ? fmt2(shown) : "")
        }}
        {...props}
      />
    </div>
  )
}

/* ---------------- combobox ---------------- */

export type ComboOption = { value: string; label: string; hint?: React.ReactNode; icon?: React.ReactNode }

/**
 * Trigger looks like a TextInput. Panel: search row, one group, ✓ on the
 * selected row, and an inline "+ Add new …" row at the bottom.
 */
export function Combobox({
  id,
  value,
  values,
  onSelect,
  options,
  placeholder,
  searchPlaceholder = "Search…",
  groupLabel,
  addLabel,
  onAdd,
  error,
  renderValue,
  className,
}: {
  id: string
  value?: string
  /** Multi-select: every selected value gets a ✓ and the panel stays open. */
  values?: string[]
  onSelect: (value: string) => void
  options: ComboOption[]
  placeholder: string
  searchPlaceholder?: string
  groupLabel?: string
  addLabel?: (query: string) => string
  onAdd?: (query: string) => void
  error?: string
  renderValue?: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const selected = options.find((o) => o.value === value)
  const isSelected = (v: string) => (values ? values.includes(v) : v === value)
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery("") }}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn("group/field h-10 justify-between gap-2 px-3 text-left text-sm outline-none focus-visible:outline-none", fieldShell, "focus-visible:ring-foreground/75 focus-visible:shadow-[0_0_0_2px_var(--card),0_0_0_4px_rgb(163_163_163/0.16)]", "aria-[invalid=true]:ring-destructive", className)}
        >
          <span className={cn("flex min-w-0 items-center gap-2 truncate", !selected && !renderValue && "text-muted-foreground")}>
            {renderValue ?? (selected ? <>{selected.icon}{selected.label}</> : placeholder)}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        <CommandPrimitive className="flex flex-col" loop>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 text-muted-foreground" />
            <CommandPrimitive.Input value={query} onValueChange={setQuery} placeholder={searchPlaceholder} className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <CommandPrimitive.List id={`${id}-list`} className="max-h-64 overflow-y-auto p-1">
            <CommandPrimitive.Empty className="px-2 py-3 text-sm text-muted-foreground">Nothing matches.</CommandPrimitive.Empty>
            <CommandPrimitive.Group heading={groupLabel} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
              {options.map((o) => (
                <CommandPrimitive.Item
                  key={o.value}
                  value={`${o.label} ${o.value}`}
                  onSelect={() => {
                    onSelect(o.value)
                    if (!values) setOpen(false)
                  }}
                  className={cn("flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-muted", isSelected(o.value) && "bg-muted/70")}
                >
                  {o.icon}
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="truncate text-xs text-muted-foreground">{o.hint}</span>}
                  <Check className={cn("size-4", isSelected(o.value) ? "opacity-100" : "opacity-0")} />
                </CommandPrimitive.Item>
              ))}
            </CommandPrimitive.Group>
            {onAdd && (
              <CommandPrimitive.Item
                value={`__add ${query}`}
                forceMount
                onSelect={() => {
                  onAdd(query.trim())
                  setOpen(false)
                }}
                className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border-t px-2 py-2 text-sm font-medium data-[selected=true]:bg-muted"
              >
                <Plus className="size-4" />
                {addLabel ? addLabel(query.trim()) : "Add new"}
              </CommandPrimitive.Item>
            )}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverContent>
    </Popover>
  )
}

/* ---------------- option cards (radio group) ---------------- */

export function OptionCards({
  value,
  onValueChange,
  options,
  label,
}: {
  value: string
  onValueChange: (v: string) => void
  options: { value: string; label: string; icon: React.ReactNode; tint: string }[]
  label: string
}) {
  return (
    <RadioGroupPrimitive.Root value={value} onValueChange={onValueChange} aria-label={label} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <RadioGroupPrimitive.Item
          key={o.value}
          value={o.value}
          className={cn(
            "flex h-[70px] flex-col items-start justify-center gap-1.5 rounded-lg bg-card px-3 text-left text-sm font-medium ring-1 ring-input ring-inset transition-all duration-300 outline-none hover:bg-muted/50",
            "data-[state=checked]:ring-brand focus-visible:ring-foreground/75"
          )}
        >
          <span className={cn("[&_svg]:size-5", value === o.value ? o.tint : "text-muted-foreground")}>{o.icon}</span>
          {o.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  )
}

/* ---------------- "Additional details" ---------------- */

/** Open state is remembered per step while the sheet is open. */
export const useDetailsOpen = create<{ open: Record<string, boolean>; set: (k: string, v: boolean) => void; reset: () => void }>((set) => ({
  open: {},
  set: (k, v) => set((s) => ({ open: { ...s.open, [k]: v } })),
  reset: () => set({ open: {} }),
}))

export function AdditionalDetails({ stepKey, children, label = "Additional details" }: { stepKey: string; children: React.ReactNode; label?: string }) {
  const open = useDetailsOpen((s) => !!s.open[stepKey])
  const setOpen = useDetailsOpen((s) => s.set)
  return (
    <Collapsible open={open} onOpenChange={(v) => setOpen(stepKey, v)}>
      <CollapsibleTrigger className="flex items-center gap-1.5 rounded text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground">
        <ChevronRight className={cn("size-4 transition-transform duration-200", open && "rotate-90")} />
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
        <div className="flex flex-col gap-6 pt-5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** Small image picker: PNG/JPEG, shows a thumbnail, with Remove/Replace. */
export function LogoField({ id, value, onChange }: { id: string; value?: string; onChange: (url?: string) => void }) {
  const ref = React.useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-input">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-xs text-muted-foreground">Logo</span>
        )}
      </div>
      <input
        ref={ref}
        id={id}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onChange(URL.createObjectURL(f))
          e.target.value = ""
        }}
      />
      <button type="button" onClick={() => ref.current?.click()} className={cn("h-9 rounded-lg bg-card px-3 text-sm font-medium text-foreground/80 ring-1 ring-input ring-inset hover:bg-muted/60", EASE)}>
        {value ? "Replace" : "Upload"}
      </button>
      {value && (
        <button type="button" onClick={() => onChange(undefined)} className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Remove
        </button>
      )}
    </div>
  )
}
