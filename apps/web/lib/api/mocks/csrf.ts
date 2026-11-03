import { CSRF_COOKIE, readCookie } from "../cookies"
import { mockDelay, mockError } from "./utils"

/** Token terakhir yang diterbitkan "server" mock; cookie dengan nilai lain dianggap tidak valid. */
const ISSUED_TOKEN_KEY = "convera.mock-csrf-token"

/** Tiruan `GET /auth/csrf`: memasang cookie `csrf_token` acak yang baru. */
export async function issueCsrfToken(): Promise<void> {
  await mockDelay(100)
  const token = crypto.randomUUID().replaceAll("-", "")
  window.localStorage.setItem(ISSUED_TOKEN_KEY, token)
  document.cookie = `${CSRF_COOKIE}=${token}; Path=/; SameSite=Lax`
}

/**
 * Pemeriksaan server untuk request mutasi. Klien menyalin cookie ke header, jadi cukup cookie yang dicek:
 * tidak ada, atau bukan token yang diterbitkan mock (misalnya diubah manual atau sisa sesi lama) → 403 `CSRF_INVALID`.
 */
export function mockRequireCsrf() {
  const token = readCookie(CSRF_COOKIE)
  if (!token || token !== window.localStorage.getItem(ISSUED_TOKEN_KEY)) {
    mockError(403, "CSRF_INVALID", "Token keamanan tidak valid. Muat ulang halaman lalu coba lagi.")
  }
}
