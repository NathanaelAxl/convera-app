/** Cookie double-submit CSRF (PRD 7.1). Bukan httpOnly, jadi bisa dibaca di browser. */
export const CSRF_COOKIE = "csrf_token"

export function readCookie(name: string) {
  if (typeof document === "undefined") return undefined
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined
}
