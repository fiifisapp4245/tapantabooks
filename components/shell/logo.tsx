import { cn } from "@/lib/utils"

/** Placeholder Tapanta Books mark: an open ledger in the brand colour. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7 shrink-0", className)}>
      <rect width="32" height="32" rx="9" className="fill-brand" />
      <path d="M8 10.5c2.8-1.2 5.4-1.1 8 .4v12.6c-2.6-1.5-5.2-1.6-8-.4V10.5Z" fill="white" />
      <path d="M24 10.5c-2.8-1.2-5.4-1.1-8 .4v12.6c2.6-1.5 5.2-1.6 8-.4V10.5Z" fill="white" opacity=".72" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-heading text-[15px] font-semibold tracking-[-0.02em] group-data-[collapsible=icon]:hidden">
        Tapanta Books
      </span>
    </span>
  )
}
