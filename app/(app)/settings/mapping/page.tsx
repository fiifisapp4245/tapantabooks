"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, ChevronRight, Plus } from "lucide-react"
import { toast } from "sonner"
import { findNavItem } from "@/lib/nav"
import { useLedger } from "@/lib/ledger"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { SettingsSplit } from "@/components/settings/settings-split"
import { Banner } from "@/components/patterns/banner"
import { Code } from "@/components/patterns/text"
import { KindIcon } from "@/components/integrations/shared"
import { MAPPINGS, RULES } from "@/components/integrations/mapping-data"

const SECTIONS = [
  { id: "mappings", label: "Field mappings" },
  { id: "rules", label: "Accounting rules" },
] as const

export default function Page() {
  return (
    <React.Suspense>
      <MappingAndRules />
    </React.Suspense>
  )
}

function MappingAndRules() {
  const nav = findNavItem(usePathname())
  const params = useSearchParams()
  const router = useRouter()
  const tab = params.get("section") === "rules" ? "rules" : "mappings"
  const connections = useLedger((s) => s.connections)
  const [rules, setRules] = React.useState(() => Object.fromEntries(RULES.map((r) => [r.id, r.on])))

  return (
    <SettingsSplit
      title={nav?.label ?? "Mapping & rules"}
      description={nav?.description}
      items={SECTIONS}
      value={tab}
      onChange={(id) => router.replace(`/settings/mapping?section=${id}`, { scroll: false })}
      actions={
        <Button onClick={() => toast(tab === "mappings" ? "Adding a mapping is mocked in the prototype" : "Adding a rule is mocked in the prototype")}>
          <Plus />
          {tab === "mappings" ? "Add mapping" : "Add rule"}
        </Button>
      }
    >
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{tab === "mappings" ? "Field mappings" : "Accounting rules"}</h2>
        <p className="text-sm text-muted-foreground">
          {tab === "mappings" ? "How each kind of incoming record becomes an invoice, bill or journal." : "What gets posted where when a record arrives."}
        </p>
      </div>
      <Banner tone="info" title="Changes apply to new imports only">
        Rows already posted stay as they are. To change a posted entry, reverse it from Journals.
      </Banner>

      {tab === "mappings" && (
          <div className="divide-y rounded-xl border bg-card">
            {MAPPINGS.map((m) => {
              const sources = connections.filter((c) => m.connectionIds.includes(c.id))
              return (
                <div key={m.id} className="flex gap-3 p-4">
                  {sources[0] && <KindIcon kind={sources[0].kind} />}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                      {m.from}
                      <ArrowRight className="size-3.5 text-muted-foreground" aria-label="becomes" />
                      {m.to}
                    </p>
                    <p className="text-[13px] text-muted-foreground">{m.description}</p>
                    <p className="text-xs text-muted-foreground">From {sources.map((c) => c.name).join(", ")}</p>
                    <Collapsible className="group/td pt-1">
                      <CollapsibleTrigger className="-ml-1 inline-flex items-center gap-1 rounded px-1 text-[13px] text-muted-foreground hover:text-foreground">
                        <ChevronRight className="size-3.5 transition-transform group-data-[state=open]/td:rotate-90" />
                        Technical detail
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full min-w-[480px] text-[13px]">
                            <thead>
                              <tr className="border-b text-xs text-muted-foreground">
                                <th className="py-1.5 pr-4 text-left font-medium">Incoming field</th>
                                <th className="py-1.5 pr-4 text-left font-medium">Tapanta field</th>
                                <th className="py-1.5 text-left font-medium">Note</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {m.fields.map((f) => (
                                <tr key={f.source + f.target}>
                                  <td className="py-1.5 pr-4"><Code>{f.source}</Code></td>
                                  <td className="py-1.5 pr-4"><Code>→ {f.target}</Code></td>
                                  <td className="py-1.5 text-muted-foreground">{f.note ?? ""}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              )
            })}
          </div>
      )}

      {tab === "rules" && (
          <div className="divide-y rounded-xl border bg-card">
            {RULES.map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-4">
                <label htmlFor={r.id} className="min-w-0 flex-1 cursor-pointer text-sm">
                  <span className="font-medium">{r.when}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span>{r.then}</span>
                </label>
                <span className="w-8 text-right text-xs text-muted-foreground">{rules[r.id] ? "On" : "Off"}</span>
                <Switch
                  id={r.id}
                  checked={rules[r.id]}
                  onCheckedChange={(v) => {
                    setRules((x) => ({ ...x, [r.id]: v }))
                    toast.success(`Rule turned ${v ? "on" : "off"}`, { description: `${r.when} → ${r.then}` })
                  }}
                />
              </div>
            ))}
          </div>
      )}
    </SettingsSplit>
  )
}
