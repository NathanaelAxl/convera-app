/**
 * Sesi login tiruan untuk mode mock: id user yang sedang login, disimpan di localStorage.
 * Default-nya masuk sebagai user contoh supaya halaman yang butuh login bisa langsung dibuka.
 */
const STORAGE_KEY = "convera.mock-session"
const SIGNED_OUT = "signed-out"

/** User contoh dari PRD 7.2 (Rina Saputri). */
export const DEFAULT_MOCK_USER_ID = "5b1c8f4e-2a7d-4c1e-9a0b-1f2e3d4c5b6a"

export function getMockSessionUserId(): string | null {
  if (typeof window === "undefined") return DEFAULT_MOCK_USER_ID
  const value = window.localStorage.getItem(STORAGE_KEY)
  if (value === SIGNED_OUT) return null
  return value ?? DEFAULT_MOCK_USER_ID
}

export function setMockSessionUserId(userId: string | null) {
  window.localStorage.setItem(STORAGE_KEY, userId ?? SIGNED_OUT)
}
