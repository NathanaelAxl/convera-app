"use client"

import { useQueryClient } from "@tanstack/react-query"
import { FlaskConicalIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isMocked } from "@/lib/api/config"
import { MOCK_ACCOUNTS, signInAs } from "@/lib/api/mocks/auth"
import { safeNextPath } from "@/lib/navigation"

/** Bantuan masuk tanpa backend selama modul `auth` masih di daftar mock (`lib/api/config.ts`). */
export function MockSessionPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  if (!isMocked("auth")) return null

  function signIn(role: keyof typeof MOCK_ACCOUNTS) {
    signInAs(role)
    queryClient.clear()
    router.replace(safeNextPath(searchParams.get("next")))
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConicalIcon className="size-4" aria-hidden="true" />
          Mode mock
        </CardTitle>
        <CardDescription>
          Modul autentikasi masih memakai data mock. Masuk dengan {MOCK_ACCOUNTS.user.email} /{" "}
          {MOCK_ACCOUNTS.user.password} atau {MOCK_ACCOUNTS.admin.email} / {MOCK_ACCOUNTS.admin.password}, atau
          langsung pilih peran di bawah.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={() => signIn("user")}>
          Masuk sebagai User
        </Button>
        <Button variant="outline" onClick={() => signIn("admin")}>
          Masuk sebagai Admin
        </Button>
      </CardContent>
    </Card>
  )
}
