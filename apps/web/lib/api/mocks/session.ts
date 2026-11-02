/**
 * Sesi login tiruan untuk mode mock, disimpan di localStorage.
 * Default-nya sudah masuk sebagai user biasa supaya halaman yang butuh login bisa langsung dibuka.
 */
export type MockSession = "user" | "admin" | "signed-out"

const STORAGE_KEY = "convera.mock-session"

export function getMockSession(): MockSession {
  if (typeof window === "undefined") return "user"
  const value = window.localStorage.getItem(STORAGE_KEY)
  return value === "admin" || value === "signed-out" ? value : "user"
}

export function setMockSession(session: MockSession) {
  window.localStorage.setItem(STORAGE_KEY, session)
}
