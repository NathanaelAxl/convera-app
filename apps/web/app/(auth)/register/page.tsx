import type { Metadata } from "next"

import { PagePlaceholder } from "@/components/app/page-placeholder"

export const metadata: Metadata = { title: "Daftar" }

export default function Page() {
  return (
    <PagePlaceholder
      title="Daftar"
      description="Buat akun Convera."
      feature="Fase 1 — Autentikasi & Akun"
    />
  )
}
