/** Tujuan setelah masuk dari `?next=`; hanya path internal yang diterima agar tidak bisa dipakai open redirect. */
export function safeNextPath(next: string | null | undefined, fallback = "/projects") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback
}
