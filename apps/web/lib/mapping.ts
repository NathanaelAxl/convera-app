import type { EventSlot, EventSlotInput, MetaEvent, SlotSender, ValueMode } from "@/lib/api/types"

/** Pilihan event Meta (FR-21), urutan sama dengan PRD 3: 16 event standar lalu Custom Event. */
export const META_EVENT_DESCRIPTIONS: Record<MetaEvent, string> = {
  Contact: "Customer menghubungi bisnis",
  Lead: "Calon pembeli menunjukkan minat",
  InitiateCheckout: "Mulai memesan",
  Purchase: "Pembelian selesai",
  CompleteRegistration: "Pendaftaran selesai",
  AddToCart: "Menambah produk ke keranjang",
  AddToWishlist: "Menyimpan produk ke daftar keinginan",
  AddPaymentInfo: "Mengirim info pembayaran",
  Search: "Mencari produk atau layanan",
  ViewContent: "Melihat produk atau konten",
  Subscribe: "Berlangganan berbayar",
  StartTrial: "Mulai masa coba",
  SubmitApplication: "Mengajukan pendaftaran atau formulir",
  Schedule: "Membuat janji temu",
  FindLocation: "Mencari lokasi bisnis",
  CustomizeProduct: "Menyesuaikan produk",
  CustomEvent: "Event dengan nama sendiri",
}

export const META_EVENTS = Object.keys(META_EVENT_DESCRIPTIONS) as [MetaEvent, ...MetaEvent[]]

/** Event bernilai (glosarium PRD 1.6): hanya event ini yang punya pilihan cara mengambil nilai (AC 3). */
export const VALUE_EVENTS: readonly MetaEvent[] = [
  "Purchase",
  "AddPaymentInfo",
  "AddToCart",
  "AddToWishlist",
  "StartTrial",
  "Subscribe",
  "CustomEvent",
]

export function isValueEvent(event: MetaEvent) {
  return VALUE_EVENTS.includes(event)
}

/** Custom Event boleh tanpa nilai (contoh PRD 7.6); event standar bernilai wajib memilih salah satu cara. */
export function allowsNoValue(event: MetaEvent) {
  return !isValueEvent(event) || event === "CustomEvent"
}

/** Filter pengirim (FR-23), urutan sama dengan `ToggleGroup` di PRD 8.3. */
export const SLOT_SENDER_LABELS: Record<SlotSender, string> = {
  customer: "Customer",
  cs: "CS",
  both: "Keduanya",
}

export const SLOT_SENDERS = Object.keys(SLOT_SENDER_LABELS) as [SlotSender, ...SlotSender[]]

/** Cara mengambil nilai (FR-24 dan aturan di PRD 3, Event Mapping). */
export const VALUE_MODE_OPTIONS: Record<ValueMode, { label: string; description: string }> = {
  none: { label: "Tanpa nilai", description: "Event dikirim tanpa nilai uang." },
  auto: {
    label: "Otomatis",
    description: "Angka terbesar di pesan. Mengenali 1.250.000, 1,25 jt, 250rb, dan 250k.",
  },
  keyword: { label: "Angka setelah keyword", description: "Angka pertama tepat setelah keyword trigger yang cocok." },
  fixed: { label: "Nilai tetap", description: "Selalu memakai nominal yang diisi." },
}

export const VALUE_MODES = Object.keys(VALUE_MODE_OPTIONS) as [ValueMode, ...ValueMode[]]

/** Batas yang belum ditetapkan PRD [usulan, lihat openapi.yaml `PUT /event-slots`]. */
export const MAX_SLOTS = 20
export const MAX_TRIGGER_KEYWORDS = 20
export const TRIGGER_KEYWORD_MAX_LENGTH = 100
/** AC 2 [asumsi]. */
export const CUSTOM_EVENT_NAME_MAX_LENGTH = 50
/** `NUMERIC(14,2)`. */
export const FIXED_VALUE_MAX = 999_999_999_999.99

/** Nama event yang dikirim ke Meta: nama custom event untuk Custom Event. */
export function slotEventName(slot: Pick<EventSlot, "meta_event" | "custom_event_name">) {
  return slot.meta_event === "CustomEvent" ? slot.custom_event_name || "Custom Event" : slot.meta_event
}

/** Slot default proyek baru (AC 4 [asumsi]): Contact aktif untuk pesan pertama customer, sisanya templat tidak aktif. */
export const DEFAULT_SLOTS: readonly EventSlotInput[] = [
  { is_active: true, meta_event: "Contact", trigger_keywords: [], sender: "customer", value_mode: "none" },
  { is_active: false, meta_event: "Lead", trigger_keywords: [], sender: "customer", value_mode: "none" },
  { is_active: false, meta_event: "InitiateCheckout", trigger_keywords: [], sender: "both", value_mode: "none" },
  { is_active: false, meta_event: "Purchase", trigger_keywords: [], sender: "both", value_mode: "auto" },
]

/**
 * Nominal yang diketik user → angka, atau `null` bila formatnya tidak dikenali. Mengikuti format Indonesia:
 * titik pemisah ribuan, koma desimal. "150000", "150.000", "Rp 1.250.000", dan "1.250.000,50" diterima;
 * "150000.5" ditolak karena titik di sini tidak bisa dibedakan dari pemisah ribuan.
 */
export function parseNominal(input: string): number | null {
  const text = input.replace(/^\s*rp\.?/i, "").replace(/\s+/g, "")
  const match = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?$/.exec(text)
  if (!match) return null
  const [, whole, fraction] = match
  return Number(`${whole.replaceAll(".", "")}${fraction ? `.${fraction}` : ""}`)
}

/** Angka → teks untuk field nominal: 150000 → "150.000", 1250000.5 → "1.250.000,5". */
export function formatNominal(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2, useGrouping: true }).format(value)
}

/** Lebih dari 2 angka di belakang koma (batas `NUMERIC(14,2)`). */
export function hasMoreThanTwoDecimals(value: number) {
  return Number(value.toFixed(2)) !== value
}
