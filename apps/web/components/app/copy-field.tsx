"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useEffect, useId, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type CopyFieldProps = {
  value: string
  /** Label terlihat di atas field. Bila tidak ada, `aria-label` field memakai `label` ini juga. */
  label?: string
  id?: string
  className?: string
}

/** Input read-only + tombol salin satu klik (PRD 8.2). Notifikasi "Tersalin" dibacakan lewat toast `aria-live`. */
export function CopyField({ value, label, id, className }: CopyFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timeout)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success("Tersalin")
    } catch {
      toast.error("Gagal menyalin. Salin manual dari kolom teks.")
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={value}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          className="font-mono text-xs md:text-xs"
        />
        <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Salin">
          {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
        </Button>
      </div>
    </div>
  )
}
