import type { Metadata } from "next"

import { PagePlaceholder } from "@/components/app/page-placeholder"

export const metadata: Metadata = { title: "Blacklist" }

export default function Page() {
  return (
    <PagePlaceholder
      inProject
      title="Blacklist"
      description="Nomor yang tidak boleh memicu event."
      feature="Fase 1 — Blacklist"
    />
  )
}
