"use client"

import { useQueryClient } from "@tanstack/react-query"
import { FlaskConicalIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authKeys } from "@/lib/api/auth"
import { isMocked } from "@/lib/api/config"
import { setMockSession, type MockSession } from "@/lib/api/mocks/session"

/** Hanya path internal yang boleh jadi tujuan setelah masuk. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/projects"
}

/** Masuk tanpa backend selama modul `auth` masih di daftar mock (`lib/api/config.ts`). */
export function MockSessionPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  if (!isMocked("auth")) return null

  function signIn(session: Exclude<MockSession, "signed-out">) {
    setMockSession(session)
    queryClient.removeQueries({ queryKey: authKeys.me })
    router.replace(safeNext(searchParams.get("next")))
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConicalIcon className="size-4" aria-hidden="true" />
          Mode mock
        </CardTitle>
        <CardDescription>
          Modul autentikasi masih memakai data mock. Pilih peran untuk masuk tanpa backend.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => signIn("user")}>
          Masuk sebagai User
        </Button>
        <Button variant="outline" onClick={() => signIn("admin")}>
          Masuk sebagai Admin
        </Button>
      </CardContent>
    </Card>
  )
}
