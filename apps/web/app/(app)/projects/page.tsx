import type { Metadata } from "next"

import { PagePlaceholder } from "@/components/app/page-placeholder"

export const metadata: Metadata = { title: "Kelola Proyek" }

export default function Page() {
  return (
    <PagePlaceholder
      title="Kelola Proyek"
      description="Semua proyek di akun Anda."
      feature="Fase 1 — Manajemen Proyek"
    />
  )
}
