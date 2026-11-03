"use client"

import { toast } from "sonner"

import { getErrorMessage } from "@/lib/api/errors"
import { useUpdateProjectStatus } from "@/lib/api/projects"
import type { Project } from "@/lib/api/types"

import { ConfirmDialog } from "../confirm-dialog"

type ProjectStatusDialogProps = {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus?: (event: Event) => void
}

/** Konfirmasi singkat sebelum menonaktifkan atau mengaktifkan kembali proyek (Manajemen Proyek AC 5 [asumsi], UF-08). */
export function ProjectStatusDialog({ project, open, onOpenChange, onCloseAutoFocus }: ProjectStatusDialogProps) {
  const updateStatus = useUpdateProjectStatus()
  const deactivate = project.is_active

  async function handleConfirm() {
    try {
      await updateStatus.mutateAsync({ slug: project.slug, is_active: !project.is_active })
      toast.success(deactivate ? `Proyek “${project.name}” dinonaktifkan.` : `Proyek “${project.name}” diaktifkan kembali.`)
    } catch (error) {
      toast.error(getErrorMessage(error))
      throw error
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      title={deactivate ? "Nonaktifkan proyek?" : "Aktifkan kembali proyek?"}
      description={
        deactivate ? (
          <>
            Pesan WhatsApp yang masuk ke Webhook URL “{project.name}” tidak akan diproses dan tidak ada event yang
            dikirim ke Meta sampai proyek diaktifkan kembali. Data dan pengaturan tetap tersimpan.
          </>
        ) : (
          <>
            Pesan WhatsApp yang masuk ke Webhook URL “{project.name}” akan diproses lagi sesuai Event Mapping. Pesan
            yang masuk selama proyek nonaktif tidak diproses ulang.
          </>
        )
      }
      confirmLabel={deactivate ? "Nonaktifkan" : "Aktifkan"}
      variant={deactivate ? "destructive" : "default"}
      onConfirm={handleConfirm}
    />
  )
}
