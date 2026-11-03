import { CSRF_COOKIE, readCookie } from "../cookies"
import { mockDelay, mockError } from "./utils"

/** Tiruan `GET /auth/csrf`: memasang cookie `csrf_token` acak. */
export async function issueCsrfToken(): Promise<void> {
  await mockDelay(100)
  document.cookie = `${CSRF_COOKIE}=${crypto.randomUUID().replaceAll("-", "")}; Path=/; SameSite=Lax`
}

/** Pemeriksaan server untuk request mutasi: tanpa cookie `csrf_token` dijawab 403. */
export function mockRequireCsrf() {
  if (!readCookie(CSRF_COOKIE)) {
    mockError(403, "FORBIDDEN", "Token keamanan tidak ditemukan. Muat ulang halaman lalu coba lagi.")
  }
}
