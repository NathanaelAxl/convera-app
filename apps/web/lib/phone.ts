/**
 * Menormalkan nomor HP Indonesia ke format `62xxxxxxxxxx` (PRD 6.1).
 * Menerima 08xx, 62xx, atau +62, dengan spasi, titik, tanda hubung, atau kurung.
 * Mengembalikan `null` bila bukan nomor yang valid (62 + 8–13 digit).
 */
export function normalizePhone(input: string): string | null {
  const compact = input.trim().replace(/[\s().-]/g, "")
  const digits = compact.startsWith("+") ? compact.slice(1) : compact
  if (!/^\d+$/.test(digits)) return null

  const normalized = digits.startsWith("62") ? digits : digits.startsWith("0") ? `62${digits.slice(1)}` : null
  return normalized && /^62\d{8,13}$/.test(normalized) ? normalized : null
}

/** `6281234567890` → `+62 812-3456-7890` untuk tampilan. */
export function formatPhone(phone: string) {
  const match = /^62(\d{3})(\d{4})(\d+)$/.exec(phone)
  return match ? `+62 ${match[1]}-${match[2]}-${match[3]}` : phone
}
