const TIME_ZONE = "Asia/Jakarta"

const rupiahFormat = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})
const numberFormat = new Intl.NumberFormat("id-ID")
const dateTimeFormat = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  dateStyle: "medium",
  timeStyle: "short",
})
const dateFormat = new Intl.DateTimeFormat("id-ID", { timeZone: TIME_ZONE, dateStyle: "medium" })

/** 1250000 → "Rp 1.250.000" */
export function formatRupiah(value: number) {
  return rupiahFormat.format(value)
}

/** 1250 → "1.250" */
export function formatNumber(value: number) {
  return numberFormat.format(value)
}

/** Waktu ISO 8601 UTC → "2 Nov 2026, 14.41 WIB" */
export function formatDateTimeWib(iso: string) {
  return `${dateTimeFormat.format(new Date(iso))} WIB`
}

/** Waktu ISO 8601 UTC atau tanggal `YYYY-MM-DD` → "2 Nov 2026" (Asia/Jakarta) */
export function formatDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+07:00`) : new Date(value)
  return dateFormat.format(date)
}
