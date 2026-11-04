"use client"

import { Loader2Icon } from "lucide-react"
import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type StickySaveBarProps = {
  /** Id form yang disimpan; tombol Simpan berada di luar elemen `<form>`. */
  formId: string
  dirty: boolean
  pending: boolean
  onDiscard: () => void
}

/** Tinggi bilah, dipakai Toaster (app/providers.tsx) agar toast muncul di atasnya. */
const HEIGHT_VARIABLE = "--sticky-save-bar-height"

/** Bilah Simpan yang menempel di bawah layar: semua kartu Pengaturan disimpan sekaligus (PRD 8.3). */
export function StickySaveBar({ formId, dirty, pending, onDiscard }: StickySaveBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const blocked = !dirty || pending

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const root = document.documentElement
    const observer = new ResizeObserver(() => root.style.setProperty(HEIGHT_VARIABLE, `${bar.offsetHeight}px`))
    observer.observe(bar)
    return () => {
      observer.disconnect()
      root.style.removeProperty(HEIGHT_VARIABLE)
    }
  }, [])

  function discard() {
    onDiscard()
    // Tombol ini hilang setelah perubahan dibatalkan; fokus pindah ke status agar tidak jatuh ke `<body>`.
    statusRef.current?.focus()
  }

  return (
    <div
      ref={barRef}
      className="sticky bottom-0 z-20 -mx-4 -mb-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:-mb-6 md:px-6 lg:-mx-8 lg:-mb-8 lg:px-8">
      <div className="flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p ref={statusRef} role="status" tabIndex={-1} className="text-sm text-muted-foreground outline-none">
          {pending ? "Menyimpan…" : dirty ? "Ada perubahan yang belum disimpan." : "Belum ada perubahan."}
        </p>
        <div className="flex gap-2">
          {dirty && (
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" disabled={pending} onClick={discard}>
              Batalkan perubahan
            </Button>
          )}
          {/* `aria-disabled`, bukan `disabled`: tombol yang sedang difokus tidak kehilangan fokus saat menyimpan. */}
          <Button
            type="submit"
            form={formId}
            className={cn("flex-1 sm:flex-none", blocked && "cursor-not-allowed opacity-50")}
            aria-disabled={blocked || undefined}
            aria-busy={pending || undefined}
            onClick={(event) => blocked && event.preventDefault()}
          >
            {pending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
            Simpan
          </Button>
        </div>
      </div>
    </div>
  )
}
