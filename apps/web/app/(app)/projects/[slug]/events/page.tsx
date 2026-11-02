import type { Metadata } from "next"

import { PagePlaceholder } from "@/components/app/page-placeholder"

export const metadata: Metadata = { title: "Event Log" }

export default function Page() {
  return (
    <PagePlaceholder
      inProject
      title="Event Log"
      description="Semua event yang dikirim ke Meta."
      feature="Fase 1 — Event Log"
    />
  )
}
