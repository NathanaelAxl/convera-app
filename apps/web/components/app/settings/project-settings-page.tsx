"use client"

import { useCurrentProject } from "@/lib/api/projects"

import { PageHeader } from "../page-header"
import { ProjectSettingsForm } from "./project-settings-form"

/** Pengaturan Proyek — `/projects/[slug]/settings` (PRD 8.3). Kartu Event Mapping ditambahkan di fitur Event Mapping. */
export function ProjectSettingsPage() {
  const { slug, project } = useCurrentProject()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Proyek"
        description="Info proyek, Meta Conversions API, dan koneksi WhatsApp. Semua kartu disimpan sekaligus."
        projectName={project?.name}
      />
      {slug && <ProjectSettingsForm slug={slug} />}
    </div>
  )
}
