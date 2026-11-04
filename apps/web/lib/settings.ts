import type { BusinessCategory, ProjectSettings, WaConnectionType, WaProvider } from "@/lib/api/types"
import { BUSINESS_CATEGORY_LABELS, WA_PROVIDER_LABELS } from "@/lib/projects"

/** 9 kategori bisnis (FR-19), urutan sama dengan pilihan di form. */
export const BUSINESS_CATEGORIES = Object.keys(BUSINESS_CATEGORY_LABELS) as [BusinessCategory, ...BusinessCategory[]]

/** Jenis koneksi WhatsApp (FR-15). `qr` baru bisa dipilih di Fase 5. */
export const WA_CONNECTION_TYPES = ["waba", "qr"] as const satisfies readonly WaConnectionType[]

/** Provider WABA yang punya adapter, dari enum `WaProvider` (Pertanyaan Terbuka 2). */
export const WA_PROVIDERS = Object.keys(WA_PROVIDER_LABELS) as [WaProvider, ...WaProvider[]]

/** `capi_access_token_masked`: 8 karakter penyamar + 4 karakter terakhir, misalnya "••••••••Zx9a" (AC 2). */
export const MASK = "••••••••"

/** Token lebih pendek dari ini hanya ditampilkan sebagai `MASK`, agar tidak terbuka hampir utuh. */
export const MASK_MIN_LENGTH_FOR_SUFFIX = 16

/** "••••••••Zx9a" → "Zx9a": bagian yang dibacakan screen reader; kosong bila tidak ada karakter yang terlihat. */
export function maskedSuffix(masked: string) {
  return masked.replace(/^•+/, "")
}

/**
 * Alasan tombol "Uji koneksi" dinonaktifkan (AC 6), atau `null` bila bisa dipakai.
 * Server menguji pengaturan yang tersimpan, jadi Pixel ID dan token harus sudah tersimpan
 * dan isian Meta CAPI tidak sedang diubah.
 */
export function testConnectionBlocker(
  settings: Pick<ProjectSettings, "pixel_id" | "has_capi_access_token">,
  hasUnsavedCapiChanges: boolean,
): string | null {
  const missing = [!settings.pixel_id && "Pixel ID", !settings.has_capi_access_token && "Access Token"].filter(Boolean)
  if (missing.length > 0) return `Isi dan simpan ${missing.join(" dan ")} dulu untuk menguji koneksi.`
  if (hasUnsavedCapiChanges) return "Simpan perubahan Meta CAPI dulu. Uji koneksi memakai pengaturan yang sudah tersimpan."
  return null
}
