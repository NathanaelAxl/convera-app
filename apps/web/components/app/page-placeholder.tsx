"use client"

import { ConstructionIcon } from "lucide-react"

import { useCurrentProject } from "@/lib/api/projects"

import { EmptyState } from "./empty-state"
import { PageHeader } from "./page-header"

type PagePlaceholderProps = {
  title: string
  description?: string
  /** Judul fitur di PRD bagian 3 yang akan mengisi halaman ini. */
  feature: string
  /** Halaman di bawah `/projects/[slug]`: tampilkan chip nama proyek. */
  inProject?: boolean
}

/** Halaman yang route-nya sudah ada tetapi isinya dibangun di fitur lain. */
export function PagePlaceholder({ title, description, feature, inProject = false }: PagePlaceholderProps) {
  return (
    <div className="space-y-6">
      {inProject ? (
        <ProjectPageHeader title={title} description={description} />
      ) : (
        <PageHeader title={title} description={description} />
      )}
      <EmptyState
        icon={ConstructionIcon}
        title="Halaman ini belum dibangun"
        description={
          <>
            Isinya dibuat di fitur <span className="font-medium text-foreground">{feature}</span>.
          </>
        }
      />
    </div>
  )
}

function ProjectPageHeader({ title, description }: { title: string; description?: string }) {
  const { project } = useCurrentProject()
  return <PageHeader title={title} description={description} projectName={project?.name} />
}
