"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"

import { useMe } from "@/lib/api/auth"
import { isUnauthorized } from "@/lib/api/errors"
import { useCurrentProject, useProjects } from "@/lib/api/projects"

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

/** Route `/projects/[slug]/*`: slug yang tidak ada atau milik user lain berakhir di 404. */
export function ProjectGuard({ children }: { children: ReactNode }) {
  const { project, isPending, error } = useCurrentProject()
  const projects = useProjects()

  if (isPending) return <PageSkeleton />
  if (error) return <LoadError error={error} onRetry={() => projects.refetch()} />
  if (!project) return <ErrorState code={404} />
  return children
}
