"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageBody } from "@/components/patterns/list-page"
import { PageHeader } from "@/components/patterns/page-header"
import { PeriodsTab } from "@/components/accounting/periods-tab"
import { RevaluationTab } from "@/components/accounting/revaluation-tab"
import { StartingBalancesTab } from "@/components/accounting/starting-balances-tab"

export default function PeriodClosePage() {
  const [tab, setTab] = React.useState("periods")
  return (
    <PageBody>
      <PageHeader title="Period close" description="Close the month, revalue currencies and set starting balances." exportable={false} />
      <Tabs value={tab} onValueChange={setTab} className="min-w-0 gap-6">
        <div className="no-scrollbar max-w-full overflow-x-auto">
          <TabsList className="h-9 w-max">
            <TabsTrigger value="periods" className="data-[state=active]:bg-card">Periods</TabsTrigger>
            <TabsTrigger value="revaluation" className="data-[state=active]:bg-card">Currency revaluation</TabsTrigger>
            <TabsTrigger value="starting" className="data-[state=active]:bg-card">Starting balances</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="periods" className="min-w-0">
          <PeriodsTab onGoToRevaluation={() => setTab("revaluation")} />
        </TabsContent>
        <TabsContent value="revaluation" className="min-w-0">
          <RevaluationTab />
        </TabsContent>
        <TabsContent value="starting" className="min-w-0">
          <StartingBalancesTab />
        </TabsContent>
      </Tabs>
    </PageBody>
  )
}
