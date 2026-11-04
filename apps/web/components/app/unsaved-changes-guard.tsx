"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { ConfirmDialog } from "./confirm-dialog"

/** Navigasi yang menunggu konfirmasi. */
type NavigationRequest = {
  /** Menjalankan navigasinya. */
  navigate: () => void
  /** Tujuan fokus bila user memilih tetap di halaman (NFR-17). */
  returnFocus?: HTMLElement | null
}

/** Guard yang sedang aktif (halaman terlihat dan ada perubahan belum disimpan); paling banyak satu. */
let activeGuard: ((request: NavigationRequest) => void) | null = null

/**
 * Untuk navigasi lewat `router.push` yang tidak berasal dari klik tautan, misalnya pemilih proyek di sidebar.
 * Bila ada perubahan yang belum disimpan, navigasi ditahan dan dikonfirmasi dulu. Mengembalikan `true` bila ditahan.
 */
export function requestNavigation(request: NavigationRequest) {
  if (!activeGuard) {
    request.navigate()
    return false
  }
  activeGuard(request)
  return true
}

type UnsavedChangesGuardProps = {
  /** Ada perubahan yang belum disimpan. */
  when: boolean
  /**
   * Dipanggil saat user memilih Tinggalkan, sebelum pindah halaman. Next.js menyembunyikan halaman lama dengan
   * `<Activity>` alih-alih membuangnya, jadi draf akan muncul lagi saat kembali kecuali dibuang di sini.
   */
  onLeave?: () => void
  description?: string
}

/**
 * Mencegah perubahan hilang tanpa sengaja (PRD 8.3, Pengaturan Proyek):
 * - Tautan internal (sidebar, logo, tautan di halaman) ditahan dulu lalu dikonfirmasi lewat `ConfirmDialog`.
 * - Navigasi `router.push` yang memanggil `requestNavigation` (pemilih proyek) dikonfirmasi dengan dialog yang sama.
 * - Muat ulang, tutup tab, dan tautan ke domain lain memakai dialog bawaan browser (`beforeunload`).
 * Tombol back/forward browser tidak ditahan; draf tetap tersimpan oleh `<Activity>` Next.js sampai halaman dibuka lagi.
 * Listener dilepas saat halaman disembunyikan (cleanup effect), jadi halaman tersembunyi tidak ikut menahan navigasi.
 */
export function UnsavedChangesGuard({
  when,
  onLeave,
  description = "Perubahan yang belum disimpan di halaman ini akan hilang.",
}: UnsavedChangesGuardProps) {
  const router = useRouter()
  const [pending, setPending] = useState<NavigationRequest | null>(null)
  const [open, setOpen] = useState(false)
  /** Klik ulang pada tautan setelah dikonfirmasi tidak ditahan lagi. */
  const allowNext = useRef(false)

  useEffect(() => {
    if (!when) return

    function hold(request: NavigationRequest) {
      setPending(request)
      setOpen(true)
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }

    // Fase capture di `document`, sebelum React (dan `next/link`) menerima klik.
    function handleClick(event: MouseEvent) {
      if (allowNext.current) {
        allowNext.current = false
        return
      }
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null
      if (!(anchor instanceof HTMLAnchorElement)) return
      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return

      const url = new URL(anchor.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      event.preventDefault()
      event.stopPropagation()
      const href = `${url.pathname}${url.search}${url.hash}`
      hold({
        // Klik ulang tautan aslinya agar perilakunya sama (misalnya menu Sheet ikut tertutup lewat `onNavigate`).
        navigate: () => {
          if (!anchor.isConnected) return router.push(href)
          allowNext.current = true
          anchor.click()
        },
        returnFocus: anchor,
      })
    }

    activeGuard = hold
    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("click", handleClick, true)
    return () => {
      if (activeGuard === hold) activeGuard = null
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("click", handleClick, true)
    }
  }, [when, router])

  function leave() {
    if (!pending) return
    onLeave?.()
    pending.navigate()
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Tinggalkan halaman tanpa menyimpan?"
      description={description}
      confirmLabel="Tinggalkan"
      cancelLabel="Tetap di sini"
      variant="destructive"
      onConfirm={leave}
      // Dialog tanpa trigger: fokus kembali ke tautan atau tombol asal navigasi (NFR-17).
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        if (pending?.returnFocus?.isConnected) pending.returnFocus.focus()
      }}
    />
  )
}
