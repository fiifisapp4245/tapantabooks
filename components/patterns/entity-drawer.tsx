"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Currency } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Money } from "./money"
import { Code } from "./text"

/**
 * Clicking a row opens this on the right: summary, status, actions, then
 * sections (lines, the journal it posted, activity, attachments).
 */
export function EntityDrawer({
  open,
  onOpenChange,
  code,
  title,
  subtitle,
  status,
  amount,
  currency,
  amountLabel = "Amount",
  actions,
  fullPageHref,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  code?: string
  title: string
  subtitle?: React.ReactNode
  status?: React.ReactNode
  amount?: number
  currency?: Currency
  amountLabel?: string
  actions?: React.ReactNode
  fullPageHref?: string
  children?: React.ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 border-l p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[560px]">
        <SheetHeader className="gap-3 border-b p-6 pr-12">
          <div className="flex items-center gap-2">
            {code && <Code>{code}</Code>}
            {status}
          </div>
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <SheetTitle className="font-heading text-xl font-semibold">{title}</SheetTitle>
              {subtitle && <SheetDescription className="mt-0.5">{subtitle}</SheetDescription>}
            </div>
            {amount != null && (
              <div>
                <p className="text-xs text-muted-foreground">{amountLabel}</p>
                <Money amount={amount} currency={currency} size="kpi" className="text-2xl" />
              </div>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">{children}</div>
        {fullPageHref && (
          <div className="border-t px-6 py-3">
            <Button variant="ghost" asChild className="-ml-3">
              <Link href={fullPageHref}>
                Open full page
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export function DrawerSection({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-sans text-[13px] font-medium tracking-normal text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Label/value pairs for drawer summaries. */
export function FactList({ items }: { items: { label: React.ReactNode; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,140px)_1fr] gap-x-4 gap-y-2 text-sm">
      {items.map((i, idx) => (
        <React.Fragment key={idx}>
          <dt className="text-muted-foreground">{i.label}</dt>
          <dd className="min-w-0">{i.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  )
}
