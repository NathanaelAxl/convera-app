"use client"

import { FolderPlusIcon, PlusIcon } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useProjects } from "@/lib/api/projects"
import type { Project } from "@/lib/api/types"

import { EmptyState } from "../empty-state"
import { LoadError } from "../load-error"
import { CreateProjectDialog } from "./create-project-dialog"
import { DeleteProjectDialog } from "./delete-project-dialog"
import { projectActionsTriggerId, ProjectCard } from "./project-card"
import { ProjectStatusDialog } from "./project-status-dialog"

type PendingAction = { type: "status" | "delete"; project: Project; key: number }

const GRID_CLASS = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"

/** Daftar kartu proyek di Kelola Proyek, beserta dialog ubah status dan hapus (PRD 8.3, UF-08). */
export function ProjectGrid() {
  const projects = useProjects()
  const [action, setAction] = useState<PendingAction | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const actionCount = useRef(0)

  // Satu dialog untuk semua kartu; `action` tetap terisi selama animasi tutup agar isinya tidak berubah.
  function request(type: PendingAction["type"]) {
    return (project: Project) => {
      setAction({ type, project, key: ++actionCount.current })
      setDialogOpen(true)
    }
  }

  /** Fokus kembali ke tombol aksi kartu; bila kartunya sudah terhapus, ke konten utama. */
  function restoreFocus(event: Event) {
    if (!action) return
    event.preventDefault()
    const trigger = document.getElementById(projectActionsTriggerId(action.project.slug))
    ;(trigger ?? document.getElementById("main"))?.focus()
  }

  if (projects.isPending) return <ProjectGridSkeleton />
  if (projects.isError) return <LoadError error={projects.error} onRetry={() => projects.refetch()} />

  if (projects.data.length === 0) {
    return (
      <EmptyState
        icon={FolderPlusIcon}
        title="Belum ada proyek"
        description="Satu proyek mewakili satu bisnis atau brand. Buat proyek pertama, lalu hubungkan Meta Pixel dan WhatsApp di halaman Pengaturan."
        action={
          <CreateProjectDialog
            trigger={
              <Button>
                <PlusIcon aria-hidden="true" />
                Buat proyek pertama
              </Button>
            }
          />
        }
      />
    )
  }

  const dialogProps = { open: dialogOpen, onOpenChange: setDialogOpen, onCloseAutoFocus: restoreFocus }

  return (
    <>
      <ul aria-label="Daftar proyek" className={GRID_CLASS}>
        {projects.data.map((project) => (
          <li key={project.id}>
            <ProjectCard project={project} onChangeStatus={request("status")} onDelete={request("delete")} />
          </li>
        ))}
      </ul>

      {action?.type === "status" && <ProjectStatusDialog key={action.key} project={action.project} {...dialogProps} />}
      {action?.type === "delete" && <DeleteProjectDialog key={action.key} project={action.project} {...dialogProps} />}
    </>
  )
}

function ProjectGridSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Memuat proyek…
      </span>
      <div className={GRID_CLASS}>
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
