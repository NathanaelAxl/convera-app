"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"

import { useMe } from "@/lib/api/auth"
import { isApiError, isUnauthorized } from "@/lib/api/errors"
import { useCurrentProject } from "@/lib/api/projects"

import { ErrorState } from "./error-state"
import { LoadError } from "./load-error"
import { PageSkeleton, ShellSkeleton } from "./loading-state"

/**
 * Halaman yang butuh login. Cookie sesi httpOnly tidak bisa dibaca di browser,
 * jadi sesi diperiksa lewat `GET /me`; 401 (setelah refresh gagal) diarahkan ke /login.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const me = useMe()
  const router = useRouter()
  const pathname = usePathname()
  const unauthorized = isUnauthorized(me.error)

  useEffect(() => {
    if (unauthorized) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [unauthorized, router, pathname])

  if (unauthorized) return <ShellSkeleton />
  if (me.data) return children
  if (me.isError) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <LoadError error={me.error} onRetry={() => me.refetch()} />
      </div>
    )
  }
  return <ShellSkeleton />
}

/** Route `/admin/*`: role selain admin melihat halaman 403 (Fase 1 — Autentikasi & Akun, AC 6). */
export function AdminGuard({ children }: { children: ReactNode }) {
  const me = useMe()
  if (!me.data) return <PageSkeleton />
  if (me.data.role !== "admin") return <ErrorState code={403} />
  return children
}

/** Route `/projects/[slug]/*`: `GET /projects/{slug}` menjawab 404 untuk slug yang tidak ada atau milik user lain. */
export function ProjectGuard({ children }: { children: ReactNode }) {
  const { project, isPending, error, refetch } = useCurrentProject()

  if (isApiError(error) && error.status === 404) return <ErrorState code={404} />
  if (error) return <LoadError error={error} onRetry={() => refetch()} />
  if (isPending || !project) return <PageSkeleton />
  return children
}
