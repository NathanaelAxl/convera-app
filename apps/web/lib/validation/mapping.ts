import { z } from "zod"

import type { EventSlot, EventSlotInput, MetaEvent, UpdateEventSlotsRequest, ValueMode } from "@/lib/api/types"
import {
  allowsNoValue,
  CUSTOM_EVENT_NAME_MAX_LENGTH,
  FIXED_VALUE_MAX,
  formatNominal,
  hasMoreThanTwoDecimals,
  isValueEvent,
  MAX_SLOTS,
  MAX_TRIGGER_KEYWORDS,
  META_EVENTS,
  parseNominal,
  SLOT_SENDERS,
  TRIGGER_KEYWORD_MAX_LENGTH,
  VALUE_MODES,
} from "@/lib/mapping"

// Aturan yang sama dengan server (openapi.yaml: PUT /projects/{slug}/event-slots). Form memakai string untuk nama
// custom event dan nominal; request memakai `null` dan angka. Skema request juga dipakai mock untuk mensimulasikan 422.

/** Bagian slot yang diperiksa lintas field; string sudah di-trim. */
type SlotRuleInput = {
  meta_event: MetaEvent
  custom_event_name: string
  trigger_keywords: string[]
  value_mode: ValueMode
  /** `undefined` = nominal sudah ditolak karena formatnya (hanya di form). */
  fixed_value: number | null | undefined
}

type SlotIssue = { field: "custom_event_name" | "trigger_keywords" | "value_mode" | "fixed_value"; message: string }

function customEventNameIssue(name: string) {
  if (name === "") return "Nama custom event wajib diisi."
  if (!/^[A-Za-z0-9_]+$/.test(name)) return "Nama custom event hanya boleh berisi huruf, angka, dan underscore."
  if (name.length > CUSTOM_EVENT_NAME_MAX_LENGTH) return `Nama custom event maksimal ${CUSTOM_EVENT_NAME_MAX_LENGTH} karakter.`
  return null
}

function triggerKeywordsIssue(keywords: string[]) {
  if (keywords.length > MAX_TRIGGER_KEYWORDS) return `Maksimal ${MAX_TRIGGER_KEYWORDS} keyword per slot.`
  const seen = new Set<string>()
  for (const keyword of keywords) {
    if (keyword === "") return "Keyword tidak boleh kosong."
    if (keyword.length > TRIGGER_KEYWORD_MAX_LENGTH) return `Keyword maksimal ${TRIGGER_KEYWORD_MAX_LENGTH} karakter.`
    // FR-22: pencocokan tidak membedakan huruf besar/kecil, jadi "Harga" dan "harga" dianggap sama.
    const key = keyword.toLocaleLowerCase("id-ID")
    if (seen.has(key)) return `Keyword "${keyword}" ditulis lebih dari sekali.`
    seen.add(key)
  }
  return null
}

function fixedValueIssue(value: number | null) {
  if (value === null) return "Nominal wajib diisi untuk nilai tetap."
  if (value <= 0) return "Nominal harus lebih dari 0."
  if (value > FIXED_VALUE_MAX) return "Nominal maksimal Rp 999.999.999.999,99."
  if (hasMoreThanTwoDecimals(value)) return "Nominal maksimal 2 angka di belakang koma."
  return null
}

/** Aturan lintas field satu slot (FR-21, FR-22, FR-24, AC 2–3), satu pesan per field. */
export function slotIssues(slot: SlotRuleInput): SlotIssue[] {
  const issues: SlotIssue[] = []
  const add = (field: SlotIssue["field"], message: string | null) => message && issues.push({ field, message })

  if (slot.meta_event === "CustomEvent") add("custom_event_name", customEventNameIssue(slot.custom_event_name))

  const keywordsIssue = triggerKeywordsIssue(slot.trigger_keywords)
  add("trigger_keywords", keywordsIssue)

  if (!isValueEvent(slot.meta_event) && slot.value_mode !== "none") {
    add("value_mode", "Cara mengambil nilai hanya untuk event bernilai.")
  } else if (!allowsNoValue(slot.meta_event) && slot.value_mode === "none") {
    add("value_mode", "Pilih cara mengambil nilai.")
  } else if (slot.value_mode === "keyword" && slot.trigger_keywords.length === 0 && !keywordsIssue) {
    add("trigger_keywords", "Isi minimal satu keyword trigger untuk mengambil angka setelah keyword.")
  } else if (slot.value_mode === "fixed" && slot.fixed_value !== undefined) {
    add("fixed_value", fixedValueIssue(slot.fixed_value))
  }
  return issues
}

// --- Request (server) ---

const eventSlotInputSchema = z
  .object({
    id: z.guid({ error: "ID slot tidak valid." }).nullish(),
    is_active: z.boolean({ error: "Status aktif slot harus true atau false." }),
    meta_event: z.enum(META_EVENTS, { error: "Pilih event Meta." }),
    custom_event_name: z.string({ error: "Nama custom event harus berupa teks." }).trim().nullish(),
    trigger_keywords: z.array(z.string({ error: "Keyword harus berupa teks." }).trim(), {
      error: "Keyword trigger harus berupa daftar teks.",
    }),
    sender: z.enum(SLOT_SENDERS, { error: "Pilih pengirim." }),
    value_mode: z.enum(VALUE_MODES, { error: "Pilih cara mengambil nilai." }),
    fixed_value: z.number({ error: "Nominal harus berupa angka." }).nullish(),
  })
  .superRefine((slot, ctx) => {
    const issues = slotIssues({
      ...slot,
      custom_event_name: slot.custom_event_name ?? "",
      fixed_value: slot.fixed_value ?? null,
    })
    for (const { field, message } of issues) ctx.addIssue({ code: "custom", path: [field], message })
  })

/** `PUT /projects/{slug}/event-slots`. Pemeriksaan `id` milik proyek ada di server (dan mock), bukan di sini. */
export const updateEventSlotsRequestSchema = z
  .object({
    slots: z
      .array(eventSlotInputSchema, { error: "Daftar slot wajib diisi." })
      .max(MAX_SLOTS, `Maksimal ${MAX_SLOTS} slot per proyek.`),
  })
  .superRefine(({ slots }, ctx) => {
    const seen = new Set<string>()
    slots.forEach((slot, index) => {
      if (!slot.id) return
      if (seen.has(slot.id)) {
        ctx.addIssue({ code: "custom", path: ["slots", index, "id"], message: "Slot ini muncul lebih dari sekali." })
      }
      seen.add(slot.id)
    })
  })

// --- Form ---

const slotFormSchema = z
  .object({
    id: z.string().nullable(),
    is_active: z.boolean(),
    /** "" = slot baru yang event-nya belum dipilih. */
    meta_event: z.union([z.enum(META_EVENTS), z.literal("")]),
    custom_event_name: z.string(),
    trigger_keywords: z.array(z.string()),
    sender: z.enum(SLOT_SENDERS, { error: "Pilih pengirim." }),
    value_mode: z.enum(VALUE_MODES, { error: "Pilih cara mengambil nilai." }),
    fixed_value: z.string(),
  })
  .superRefine((slot, ctx) => {
    if (slot.meta_event === "") {
      ctx.addIssue({ code: "custom", path: ["meta_event"], message: "Pilih event Meta." })
      return
    }
    let fixedValue: number | null | undefined = null
    if (slot.value_mode === "fixed" && slot.fixed_value.trim() !== "") {
      fixedValue = parseNominal(slot.fixed_value) ?? undefined
      if (fixedValue === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["fixed_value"],
          message: "Tulis nominal dengan angka, misalnya 150000 atau 150.000.",
        })
      }
    }
    const issues = slotIssues({
      meta_event: slot.meta_event,
      custom_event_name: slot.custom_event_name.trim(),
      trigger_keywords: slot.trigger_keywords.map((keyword) => keyword.trim()),
      value_mode: slot.value_mode,
      fixed_value: fixedValue,
    })
    for (const { field, message } of issues) ctx.addIssue({ code: "custom", path: [field], message })
  })

export const eventMappingFormSchema = z.object({
  slots: z.array(slotFormSchema).max(MAX_SLOTS, `Maksimal ${MAX_SLOTS} slot per proyek.`),
})

export type EventMappingFormValues = z.input<typeof eventMappingFormSchema>
export type SlotFormValues = EventMappingFormValues["slots"][number]

/** Slot baru dari tombol "Tambah slot": event belum dipilih, pengirim Keduanya (FR-23). */
export function newSlotFormValues(): SlotFormValues {
  return {
    id: null,
    is_active: true,
    meta_event: "",
    custom_event_name: "",
    trigger_keywords: [],
    sender: "both",
    value_mode: "none",
    fixed_value: "",
  }
}

/** Nilai awal form dari `GET /event-slots`, urut sesuai `position`. */
export function slotsToFormValues(slots: EventSlot[]): EventMappingFormValues {
  return {
    slots: [...slots]
      .sort((a, b) => a.position - b.position)
      .map((slot) => ({
        id: slot.id,
        is_active: slot.is_active,
        meta_event: slot.meta_event,
        custom_event_name: slot.custom_event_name ?? "",
        trigger_keywords: slot.trigger_keywords,
        sender: slot.sender,
        value_mode: slot.value_mode,
        fixed_value: slot.fixed_value === null ? "" : formatNominal(slot.fixed_value),
      })),
  }
}

/**
 * Body `PUT /event-slots` dari isi form yang sudah lolos validasi. Field yang tidak berlaku untuk pilihan slot
 * (nama custom event untuk event standar, nominal untuk mode selain nilai tetap) dikirim `null`.
 */
export function toUpdateEventSlotsRequest(values: EventMappingFormValues): UpdateEventSlotsRequest {
  return {
    slots: values.slots.map((slot): EventSlotInput => {
      const metaEvent = slot.meta_event as MetaEvent
      return {
        ...(slot.id ? { id: slot.id } : {}),
        is_active: slot.is_active,
        meta_event: metaEvent,
        custom_event_name: metaEvent === "CustomEvent" ? slot.custom_event_name.trim() : null,
        trigger_keywords: slot.trigger_keywords.map((keyword) => keyword.trim()),
        sender: slot.sender,
        value_mode: slot.value_mode,
        fixed_value: slot.value_mode === "fixed" ? parseNominal(slot.fixed_value) : null,
      }
    }),
  }
}

/** `details[].field` dari server (`slots[1].custom_event_name`) → nama field react-hook-form (`slots.1.custom_event_name`). */
export function toSlotFormField(field: string) {
  return field.replace(/\[(\d+)\]/g, ".$1")
}
