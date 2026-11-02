import type { Metadata } from "next"

import { PagePlaceholder } from "@/components/app/page-placeholder"

export const metadata: Metadata = { title: "Lupa password" }

export default function Page() {
  return (
    <PagePlaceholder
      title="Lupa password"
      description="Kirim tautan reset password ke email Anda."
      feature="Fase 1 — Autentikasi & Akun"
    />
  )
}
