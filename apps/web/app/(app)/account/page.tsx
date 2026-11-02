import type { Metadata } from "next"

import { PagePlaceholder } from "@/components/app/page-placeholder"

export const metadata: Metadata = { title: "Akun" }

export default function Page() {
  return (
    <PagePlaceholder
      title="Akun"
      description="Info akun dan ganti password."
      feature="Fase 1 — Autentikasi & Akun"
    />
  )
}
