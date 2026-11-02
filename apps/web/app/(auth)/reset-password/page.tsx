import type { Metadata } from "next"

import { PagePlaceholder } from "@/components/app/page-placeholder"

export const metadata: Metadata = { title: "Reset password" }

export default function Page() {
  return (
    <PagePlaceholder
      title="Reset password"
      description="Buat password baru."
      feature="Fase 1 — Autentikasi & Akun"
    />
  )
}
