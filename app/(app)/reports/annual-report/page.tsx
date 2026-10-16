"use client"

import { PAGES } from "@/lib/nav"
import { PageBody } from "@/components/patterns/list-page"
import { AnnualLanding } from "@/components/annual/studio/landing"

export default function Page() {
  return (
    <PageBody>
      <AnnualLanding title={PAGES.annualReport.label} description={PAGES.annualReport.description} />
    </PageBody>
  )
}
