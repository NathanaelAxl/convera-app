import type { Metadata } from "next"

import { PagePlaceholder } from "@/components/app/page-placeholder"

export const metadata: Metadata = { title: "Pengaturan Proyek" }

export default function Page() {
  return (
    <PagePlaceholder
      inProject
      title="Pengaturan Proyek"
      description="Konfigurasi Meta CAPI, koneksi WhatsApp, dan Event Mapping."
      feature="Fase 1 — Konfigurasi Meta CAPI & Koneksi WhatsApp, Fase 1 — Event Mapping"
    />
  )
}
