import type { Metadata } from "next"

import { PagePlaceholder } from "@/components/app/page-placeholder"

export const metadata: Metadata = { title: "Dashboard" }

export default function Page() {
  return (
    <PagePlaceholder
      inProject
      title="Dashboard"
      description="Ringkasan funnel proyek."
      feature="Fase 1 — Dashboard KPI"
    />
  )
}
