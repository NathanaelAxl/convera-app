import type { Metadata } from "next"

import { ProjectSettingsPage } from "@/components/app/settings/project-settings-page"

export const metadata: Metadata = { title: "Pengaturan Proyek" }

export default function Page() {
  return <ProjectSettingsPage />
}
