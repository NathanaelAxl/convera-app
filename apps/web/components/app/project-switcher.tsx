"use client"

import { ChevronsUpDownIcon, PlusIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import type { Project } from "@/lib/api/types"
import { cn } from "@/lib/utils"

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn("size-2 shrink-0 rounded-full", active ? "bg-success" : "bg-muted-foreground")}
      aria-hidden="true"
    />
  )
}

type ProjectSwitcherProps = {
  projects: Project[] | undefined
  activeSlug: string | undefined
  onNavigate?: () => void
}

/** Daftar proyek + titik status aktif + tombol "Proyek baru" (PRD 8.2). */
export function ProjectSwitcher({ projects, activeSlug, onNavigate }: ProjectSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()

  if (!projects) return <Skeleton className="h-9 w-full touch:h-11" />

  const active = projects.find((project) => project.slug === activeSlug)

  // Pindah proyek tetap di sub-halaman yang sama, misalnya Event Log → Event Log.
  function hrefFor(slug: string) {
    const prefix = `/projects/${activeSlug}/`
    const subPath = activeSlug && pathname.startsWith(prefix) ? pathname.slice(prefix.length - 1) : "/dashboard"
    return `/projects/${slug}${subPath}`
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="lg" className="w-full justify-between">
          <span className="flex min-w-0 items-center gap-2">
            {active && <StatusDot active={active.is_active} />}
            <span className="sr-only">Proyek: </span>
            <span className="truncate">{active?.name ?? (projects.length ? "Pilih proyek" : "Belum ada proyek")}</span>
          </span>
          <ChevronsUpDownIcon className="text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
        <DropdownMenuLabel>Proyek</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={activeSlug}
          onValueChange={(slug) => {
            router.push(hrefFor(slug))
            onNavigate?.()
          }}
        >
          {projects.map((project) => (
            <DropdownMenuRadioItem key={project.id} value={project.slug}>
              <StatusDot active={project.is_active} />
              <span className="truncate">{project.name}</span>
              <span className="sr-only">, {project.is_active ? "aktif" : "nonaktif"}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        {/* CreateProjectDialog dibangun di fitur Fase 1 — Manajemen Proyek. */}
        <DropdownMenuItem disabled>
          <PlusIcon aria-hidden="true" />
          Proyek baru
          <Badge variant="secondary" className="ml-auto">
            Segera
          </Badge>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
