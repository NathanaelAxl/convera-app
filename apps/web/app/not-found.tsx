import type { Metadata } from "next"

import { ErrorState } from "@/components/app/error-state"

export const metadata: Metadata = { title: "Tidak ditemukan" }

export default function NotFound() {
  return (
    <main>
      <ErrorState code={404} />
    </main>
  )
}
