import type { Metadata } from "next"

import { ErrorState } from "@/components/app/error-state"

export const metadata: Metadata = { title: "Admin" }

// Halaman admin dibangun di Fase 3; route spesifik (mis. /admin/payments) nanti menggantikan catch-all ini.
// Dirender sebagai children AdminGuard, jadi role user tetap melihat 403 lebih dulu.
export default function AdminFallbackPage() {
  return <ErrorState code={404} />
}
