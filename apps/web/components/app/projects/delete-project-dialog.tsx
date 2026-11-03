"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { applyFieldErrors, getErrorMessage } from "@/lib/api/errors"
import { useDeleteProject } from "@/lib/api/projects"
import type { Project } from "@/lib/api/types"
import { isProjectNameConfirmed } from "@/lib/projects"
import { deleteProjectRequestSchema, type DeleteProjectFormValues } from "@/lib/validation/projects"

import { ConfirmDialog } from "../confirm-dialog"
import { FormField } from "../form-field"

type DeleteProjectDialogProps = {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus?: (event: Event) => void
}

/**
 * Hapus proyek permanen: user wajib mengetik ulang nama proyek (Manajemen Proyek AC 6 [asumsi], UF-08).
 * Tombol "Hapus permanen" aktif setelah nama cocok; 422 dari server tampil di bawah field.
 */
export function DeleteProjectDialog({ project, open, onOpenChange, onCloseAutoFocus }: DeleteProjectDialogProps) {
  const deleteProject = useDeleteProject()
  const form = useForm<DeleteProjectFormValues>({
    resolver: zodResolver(deleteProjectRequestSchema),
    defaultValues: { confirm_name: "" },
  })
  const typed = useWatch({ control: form.control, name: "confirm_name" })

  async function handleConfirm() {
    if (!(await form.trigger())) throw new Error("Form tidak valid")
    try {
      await deleteProject.mutateAsync({ slug: project.slug, confirm_name: typed.trim() })
      toast.success(`Proyek “${project.name}” dan seluruh datanya sudah dihapus.`)
    } catch (error) {
      if (!applyFieldErrors(error, form.setError)) toast.error(getErrorMessage(error))
      throw error
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
      title="Hapus proyek permanen?"
      description={
        <>
          Proyek “{project.name}” beserta seluruh datanya (kontak, event, Event Mapping, dan blacklist) akan dihapus dan
          tidak bisa dikembalikan. Webhook URL proyek ini juga berhenti berfungsi.
        </>
      }
      confirmLabel="Hapus permanen"
      variant="destructive"
      confirmDisabled={!isProjectNameConfirmed(project.name, typed)}
      onConfirm={handleConfirm}
    >
      <FormField
        control={form.control}
        name="confirm_name"
        label={
          <span>
            Ketik <span className="font-semibold break-all">{project.name}</span> untuk konfirmasi
          </span>
        }
        description="Huruf besar/kecil harus sama. Tombol Hapus permanen aktif setelah nama cocok."
        render={(props) => (
          <Input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} {...props} />
        )}
      />
    </ConfirmDialog>
  )
}
