import { Suspense } from "react"

import { AppShell } from "@/components/app/app-shell"
import { AuthGuard } from "@/components/app/guards"
import { ShellSkeleton } from "@/components/app/loading-state"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // Sesi dan data dibaca di browser, jadi seluruh shell berada di balik Suspense (cacheComponents).
    <Suspense fallback={<ShellSkeleton />}>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </Suspense>
  )
}
