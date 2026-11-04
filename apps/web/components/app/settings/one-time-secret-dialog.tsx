"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { CopyField } from "../copy-field"

type OneTimeSecretDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  secret: string
  /** Dialog tanpa trigger: fokus dikembalikan ke sini saat ditutup (NFR-17). */
  onCloseAutoFocus: (event: Event) => void
}

/** Webhook Secret buatan sistem hanya ditampilkan sekali, dengan tombol salin (AC 5). */
export function OneTimeSecretDialog({ open, onOpenChange, secret, onCloseAutoFocus }: OneTimeSecretDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>Webhook Secret baru</DialogTitle>
          <DialogDescription>
            Salin secret ini lalu tempel di pengaturan webhook provider sekarang. Secret hanya ditampilkan sekali;
            setelah dialog ditutup, yang terlihat hanya status Tersimpan.
          </DialogDescription>
        </DialogHeader>
        <CopyField label="Webhook Secret" value={secret} />
        <DialogFooter>
          <DialogClose asChild>
            <Button>Sudah saya salin</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
