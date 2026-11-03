// Origin tiruan untuk mem-parse `next` dengan parser URL yang sama seperti browser.
const PLACEHOLDER_ORIGIN = "http://convera.invalid"

/**
 * Tujuan setelah masuk dari `?next=`. Hanya path internal yang diterima agar tidak bisa dipakai open redirect:
 * `//domain.com`, `/\domain.com` (browser membaca `\` sebagai `/`), varian dengan tab/baris baru, dan URL absolut
 * semuanya jatuh ke `fallback`.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/projects") {
  if (!next || !next.startsWith("/")) return fallback
  try {
    const url = new URL(next, PLACEHOLDER_ORIGIN)
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
