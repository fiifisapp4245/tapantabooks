"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plug, Plus, RefreshCw, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { findNavItem } from "@/lib/nav"
import { useLedger } from "@/lib/ledger"
import type { Connection } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PageBody } from "@/components/patterns/list-page"
import { PageHeader } from "@/components/patterns/page-header"
import { StatusBadge } from "@/components/patterns/status-badge"
import { EmptyState } from "@/components/patterns/empty-state"
import { HeldHint, heldTotal, KindIcon, lastSyncText } from "@/components/integrations/shared"
import { KpiStrip } from "@/components/patterns/kpi-strip"

type Filter = "connected" | "healthy" | "attention" | "held"

export default function Page() {
  const nav = findNavItem(usePathname())
  const connections = useLedger((s) => s.connections)
  const imports = useLedger((s) => s.imports)
  const [filter, setFilter] = React.useState<Filter | undefined>()

  const connected = connections.filter((c) => c.connected)
  const healthy = connected.filter((c) => c.health === "healthy")
  const attention = connected.filter((c) => c.health !== "healthy")
  const heldBy = (c: Connection) => imports.filter((i) => i.connectionId === c.id).reduce((t, i) => t + i.held, 0)
  const held = heldTotal(imports)

  const shown = connections.filter((c) => {
    if (filter === "connected") return c.connected
    if (filter === "healthy") return c.connected && c.health === "healthy"
    if (filter === "attention") return c.connected && c.health !== "healthy"
    if (filter === "held") return heldBy(c) > 0
    return true
  })
  // Problems first, then healthy, then the ones not connected yet.
  const rank = (c: Connection) => (!c.connected ? 3 : c.health === "error" ? 0 : c.health === "delayed" ? 1 : 2)
  const sorted = [...shown].sort((a, b) => rank(a) - rank(b))

  return (
    <PageBody>
      <PageHeader
        title={nav?.label ?? "Connections"}
        description={nav?.description}
        term={nav?.term}
        exportable={false}
        primary={
          <Button onClick={() => toast("Adding a connection is mocked in the prototype")}>
            <Plus />
            Add connection
          </Button>
        }
      />
      <KpiStrip
        activeId={filter}
        onSelect={(id) => setFilter((f) => (f === id ? undefined : (id as Filter)))}
        items={[
          { id: "connected", label: "Connected", value: <span className="font-heading text-[28px] font-semibold">{connected.length} <span className="text-base font-normal text-muted-foreground">of {connections.length}</span></span>, hint: `${connections.length - connected.length} not connected yet` },
          { id: "healthy", label: "Healthy", value: <span className="font-heading text-[28px] font-semibold">{healthy.length}</span>, hint: "Synced on schedule" },
          { id: "attention", label: "Need attention", value: <span className="font-heading text-[28px] font-semibold">{attention.length}</span>, hint: "Delayed or erroring", tone: attention.length ? "warning" : "default" },
          { id: "held", label: "Held for review", value: <span className="font-heading text-[28px] font-semibold">{held}</span>, hint: <HeldHint>Rows, across all imports</HeldHint> },
        ]}
      />

      {sorted.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState icon={Plug} title="No connections match" action={<Button variant="outline" onClick={() => setFilter(undefined)}>Show all connections</Button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((c) => (
            <ConnectionCard key={c.id} c={c} held={heldBy(c)} />
          ))}
        </div>
      )}
    </PageBody>
  )
}

function ConnectionCard({ c, held }: { c: Connection; held: number }) {
  const stale = c.connected && c.health === "error" && c.kind === "Accounting"
  const sync = lastSyncText(c)
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <KindIcon kind={c.kind} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{c.name}</p>
          <p className="text-xs text-muted-foreground">{c.kind}</p>
        </div>
        {c.connected && c.health ? (
          <StatusBadge status={c.health} />
        ) : (
          <span className="text-xs whitespace-nowrap text-muted-foreground">Not connected</span>
        )}
      </div>

      {c.connected ? (
        <div className="space-y-1 text-[13px]">
          <p className={cn(c.health === "healthy" ? "text-muted-foreground" : "font-medium text-warning", "flex items-center gap-1.5")}>
            {c.health !== "healthy" && <TriangleAlert className="size-3.5 shrink-0" />}
            {sync}
          </p>
          {/* The sync line already says how long it's been; keep only the reason. */}
          {c.note && <p className="text-muted-foreground">{c.note.replace(/^Hasn't synced for \d+ days\.\s*/, "")}</p>}
          <p className="text-muted-foreground">
            {c.records30d} records in the last 30 days
            {held > 0 && (
              <>
                {" · "}
                <Link href="/settings/imports" className="text-foreground underline underline-offset-4">
                  {held} held for review
                </Link>
              </>
            )}
          </p>
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">Connect {c.name} to bring its transactions into your books automatically.</p>
      )}

      <div className="mt-auto flex flex-wrap gap-2 border-t pt-3">
        {!c.connected ? (
          <Button variant="outline" onClick={() => toast(`Connecting ${c.name} is mocked in the prototype`)}>
            <Plug />
            Connect
          </Button>
        ) : stale ? (
          <Button onClick={() => toast(`Reconnecting ${c.name}: sign-in is mocked in the prototype`)}>
            <RefreshCw />
            Reconnect
          </Button>
        ) : c.health === "error" ? (
          <Button variant="outline" asChild>
            <Link href="/settings/imports">Review import</Link>
          </Button>
        ) : (
          <Button variant="outline" onClick={() => toast.success(`${c.name} sync started`)}>
            <RefreshCw />
            Sync now
          </Button>
        )}
      </div>
    </div>
  )
}
