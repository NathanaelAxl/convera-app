import { PlusIcon } from "lucide-react"
import type { Metadata } from "next"

import { PageHeader } from "@/components/app/page-header"
import { CreateProjectDialog } from "@/components/app/projects/create-project-dialog"
import { ProjectGrid } from "@/components/app/projects/project-grid"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Kelola Proyek" }

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola Proyek"
        description="Semua proyek di akun Anda. Setiap proyek punya Pixel, koneksi WhatsApp, dan aturan event sendiri."
        actions={
          <CreateProjectDialog
            trigger={
              <Button>
                <PlusIcon aria-hidden="true" />
                Proyek baru
              </Button>
            }
          />
        }
      />
      <ProjectGrid />
    </div>
  )
}
