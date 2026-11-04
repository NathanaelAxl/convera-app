/** Modul API (PRD 5.4) yang dipanggil dari halaman. */
export type ApiModule =
  | "auth"
  | "projects"
  | "settings"
  | "mapping"
  | "analytics"
  | "blacklist"
  | "billing"
  | "admin"
  | "metaads"
  | "learning"
  | "waqr"

/**
 * Modul yang masih memakai data mock dari `lib/api/mocks`.
 * Tahap integrasi = menghapus modul dari daftar ini; halaman tidak perlu diubah.
 */
export const MOCK_MODULES: readonly ApiModule[] = ["auth", "projects", "settings"]

export function isMocked(module: ApiModule) {
  return MOCK_MODULES.includes(module)
}
