"use client"

import { ChevronsUpDownIcon, PlusIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useRef, useState } from "react"

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

import { CreateProjectDialog } from "./projects/create-project-dialog"
import { requestNavigation } from "./unsaved-changes-guard"

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
  const [createOpen, setCreateOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // Menu yang ditutup mengembalikan fokus ke tombolnya; saat membuka dialog, fokus harus tetap di dialog.
  const openingDialog = useRef(false)

  if (!projects) return <Skeleton className="h-9 w-full touch:h-11" />

  const active = projects.find((project) => project.slug === activeSlug)

  // Pindah proyek tetap di sub-halaman yang sama, misalnya Event Log → Event Log.
  function hrefFor(slug: string) {
    const prefix = `/projects/${activeSlug}/`
    const subPath = activeSlug && pathname.startsWith(prefix) ? pathname.slice(prefix.length - 1) : "/dashboard"
    return `/projects/${slug}${subPath}`
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button ref={triggerRef} variant="outline" size="lg" className="w-full justify-between">
            <span className="flex min-w-0 items-center gap-2">
              {active && <StatusDot active={active.is_active} />}
              <span className="sr-only">Proyek: </span>
              <span className="truncate">{active?.name ?? (projects.length ? "Pilih proyek" : "Belum ada proyek")}</span>
            </span>
            <ChevronsUpDownIcon className="text-muted-foreground" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
          onCloseAutoFocus={(event) => {
            if (!openingDialog.current) return
            openingDialog.current = false
            event.preventDefault()
          }}
        >
          <DropdownMenuLabel>Proyek</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={activeSlug}
            onValueChange={(slug) => {
              // Ada perubahan belum disimpan (misalnya di Pengaturan): konfirmasi dulu, fokus tetap di dialog.
              openingDialog.current = requestNavigation({
                navigate: () => {
                  router.push(hrefFor(slug))
                  onNavigate?.()
                },
                returnFocus: triggerRef.current,
              })
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
          <DropdownMenuItem
            onSelect={() => {
              openingDialog.current = true
              setCreateOpen(true)
            }}
          >
            <PlusIcon aria-hidden="true" />
            Proyek baru
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        returnFocusRef={triggerRef}
        onCreated={() => onNavigate?.()}
      />
    </>
  )
}
