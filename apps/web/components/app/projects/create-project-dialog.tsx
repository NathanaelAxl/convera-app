"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState, type ReactElement, type RefObject } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { applyFieldErrors, getErrorMessage } from "@/lib/api/errors"
import { useCreateProject } from "@/lib/api/projects"
import type { Project } from "@/lib/api/types"
import { slugifyProjectName } from "@/lib/projects"
import { createProjectRequestSchema, type CreateProjectFormValues } from "@/lib/validation/projects"

import { FormAlert } from "../form-alert"
import { FormField } from "../form-field"

type CreateProjectDialogProps = {
  /** Tombol pembuka. Tanpa ini, dialog dikendalikan lewat `open` dan `onOpenChange` (misalnya dari DropdownMenu). */
  trigger?: ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Tujuan fokus saat dialog tanpa `trigger` ditutup, agar fokus tidak hilang ke `<body>` (NFR-17). */
  returnFocusRef?: RefObject<HTMLElement | null>
  /** Dipanggil setelah proyek dibuat, sebelum pindah ke halaman Pengaturan (misalnya untuk menutup Sheet sidebar). */
  onCreated?: (project: Project) => void
}

/** Buat proyek cukup dengan nama, dengan pratinjau slug langsung saat mengetik (FR-07, PRD 8.2). */
export function CreateProjectDialog({ trigger, open: openProp, onOpenChange, returnFocusRef, onCreated }: CreateProjectDialogProps) {
  const router = useRouter()
  const createProject = useCreateProject()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formId = useId()
  const previewId = useId()
  const open = openProp ?? uncontrolledOpen

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectRequestSchema),
    defaultValues: { name: "" },
  })
  const name = useWatch({ control: form.control, name: "name" })

  function setOpen(next: boolean) {
    if (!next) {
      form.reset()
      setFormError(null)
    }
    setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const project = await createProject.mutateAsync(values)
      // Slug final bisa berbeda dari pratinjau bila sudah dipakai (sufiks -2, -3, ...).
      toast.success(`Proyek “${project.name}” dibuat dengan slug ${project.slug}.`)
      setOpen(false)
      onCreated?.(project)
      router.push(`/projects/${project.slug}/settings`)
    } catch (error) {
      if (!applyFieldErrors(error, form.setError)) setFormError(getErrorMessage(error))
    }
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !createProject.isPending && setOpen(next)}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          if (!returnFocusRef?.current) return
          event.preventDefault()
          returnFocusRef.current.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>Proyek baru</DialogTitle>
          <DialogDescription>
            Cukup isi nama bisnis atau brand. Pixel, WhatsApp, dan Event Mapping diatur setelah proyek dibuat.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} method="post" onSubmit={onSubmit} noValidate className="space-y-4">
          {formError && <FormAlert title="Gagal membuat proyek">{formError}</FormAlert>}
          <FormField
            control={form.control}
            name="name"
            label="Nama proyek"
            describedBy={previewId}
            render={(props) => <Input autoComplete="off" placeholder="Contoh: Toko Kue Bu Ani" {...props} />}
          />
          <SlugPreview id={previewId} name={name} />
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={createProject.isPending}>
              Batal
            </Button>
          </DialogClose>
          <Button type="submit" form={formId} disabled={createProject.isPending} aria-busy={createProject.isPending || undefined}>
            {createProject.isPending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
            Buat proyek
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SlugPreview({ id, name }: { id: string; name: string }) {
  return (
    <div id={id} className="space-y-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
      <p>
        <span className="text-muted-foreground">Pratinjau slug: </span>
        {name.trim() ? (
          <span className="font-mono break-all">{slugifyProjectName(name)}</span>
        ) : (
          <span className="text-muted-foreground">dibuat otomatis dari nama</span>
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        Slug tidak bisa diubah setelah proyek dibuat. Bila sudah dipakai, sistem menambahkan angka, misalnya -2.
      </p>
    </div>
  )
}
