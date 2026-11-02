"use client"

import { Loader2Icon } from "lucide-react"
import { useState, type MouseEvent, type ReactNode } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
  /** Bila mengembalikan promise, dialog menunggu; ditutup saat berhasil, tetap terbuka saat gagal. */
  onConfirm: () => unknown
  pending?: boolean
  /** Misalnya sampai user mengetik ulang nama proyek. */
  confirmDisabled?: boolean
  /** Konten tambahan di antara deskripsi dan tombol. */
  children?: ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Lanjutkan",
  cancelLabel = "Batal",
  variant = "default",
  onConfirm,
  pending: pendingProp = false,
  confirmDisabled = false,
  children,
}: ConfirmDialogProps) {
  const [running, setRunning] = useState(false)
  const pending = pendingProp || running

  async function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    setRunning(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // Pesan error ditampilkan oleh pemanggil (toast atau field); dialog tetap terbuka.
    } finally {
      setRunning(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            disabled={pending || confirmDisabled}
            aria-busy={pending || undefined}
            onClick={handleConfirm}
          >
            {pending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
