import type { Metadata } from "next"
import { Suspense } from "react"

import { MockSessionPanel } from "@/components/app/mock-session-panel"
import { PagePlaceholder } from "@/components/app/page-placeholder"

export const metadata: Metadata = { title: "Masuk" }

export default function LoginPage() {
  return (
    <>
      <PagePlaceholder title="Masuk" description="Masuk ke akun Convera Anda." feature="Fase 1 — Autentikasi & Akun" />
      <Suspense>
        <MockSessionPanel />
      </Suspense>
    </>
  )
}
