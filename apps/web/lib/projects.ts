import type { BusinessCategory, Project } from "@/lib/api/types"

/** Panjang maksimal slug dasar; sisa kolom `projects.slug` (VARCHAR 120) untuk sufiks `-2`, `-3`, ... */
export const SLUG_BASE_MAX_LENGTH = 100

/** Slug dasar bila nama tidak punya huruf/angka Latin sama sekali, misalnya "日本料理". */
export const FALLBACK_SLUG = "proyek"

/**
 * Slug dasar dari nama proyek (FR-07), sama dengan aturan server di `POST /projects` (openapi.yaml):
 * NFKD + buang diakritik, huruf kecil, setiap deret non-alfanumerik jadi satu `-`, `-` di awal/akhir dibuang.
 * "Toko Dummy & Co. 2026!" → "toko-dummy-co-2026".
 */
export function slugifyProjectName(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_BASE_MAX_LENGTH)
    .replace(/-+$/, "")
  return slug || FALLBACK_SLUG
}

/** Slug dasar bila belum dipakai; bila sudah, tambahkan `-2`, `-3`, dan seterusnya (FR-08 [asumsi]). */
export function uniqueSlug(base: string, isTaken: (slug: string) => boolean) {
  if (!isTaken(base)) return base
  let suffix = 2
  while (isTaken(`${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}

/** Konfirmasi hapus: nama yang diketik sama dengan nama proyek, setelah di-trim, peka huruf besar/kecil. */
export function isProjectNameConfirmed(projectName: string, typed: string) {
  return typed.trim() !== "" && typed.trim() === projectName.trim()
}

/** 9 kategori bisnis (PRD 1.2, FR-19). */
export const BUSINESS_CATEGORY_LABELS: Record<BusinessCategory, string> = {
  general: "Umum",
  health: "Kesehatan",
  ecommerce: "E-commerce",
  education: "Pendidikan",
  property: "Properti",
  fnb: "F&B",
  service: "Jasa",
  travel: "Travel",
  finance: "Keuangan",
}

/** Provider WABA yang punya adapter. Hanya mode generik sampai Pertanyaan Terbuka 2 diputuskan. */
const WA_PROVIDER_LABELS: Record<string, string> = {
  generic: "Generik",
}

/** "WABA · Generik"; kode provider yang belum dikenal ditampilkan apa adanya. */
export function waConnectionLabel(project: Pick<Project, "wa_connection_type" | "wa_provider">) {
  if (project.wa_connection_type === "qr") return "QR"
  return `WABA · ${WA_PROVIDER_LABELS[project.wa_provider] ?? project.wa_provider}`
}
