import { z } from "zod"

import type { ProjectSettings, UpdateProjectSettingsRequest } from "@/lib/api/types"
import { BUSINESS_CATEGORIES, WA_CONNECTION_TYPES, WA_PROVIDERS } from "@/lib/settings"

import { createProjectRequestSchema } from "./projects"

// Aturan yang sama dengan server (openapi.yaml: UpdateProjectSettingsRequest). Form memakai string, dengan ""
// berarti kosong; request memakai `null`. Skema request juga dipakai mock untuk mensimulasikan 422 dari server.

/** Batas panjang Pixel ID: default Pertanyaan Terbuka 3 (10–20 digit). */
export const PIXEL_ID_MIN_LENGTH = 10
export const PIXEL_ID_MAX_LENGTH = 20
export const CAPI_ACCESS_TOKEN_MAX_LENGTH = 1000
export const TEST_EVENT_CODE_MAX_LENGTH = 50
export const WEBHOOK_SECRET_MIN_LENGTH = 16
export const WEBHOOK_SECRET_MAX_LENGTH = 256

/**
 * Teks opsional yang di-trim dulu; "" selalu lolos. Bila diisi, `check` mengembalikan pesan pemeriksaan pertama
 * yang gagal, sehingga setiap field punya satu pesan seperti `details` dari server.
 */
function optionalText(label: string, check: (value: string) => string | null) {
  return z
    .string({ error: `${label} harus berupa teks.` })
    .trim()
    .superRefine((value, ctx) => {
      const message = value === "" ? null : check(value)
      if (message) ctx.addIssue({ code: "custom", message })
    })
}

const pixelId = optionalText("Pixel ID", (value) => {
  if (!/^\d+$/.test(value)) return "Pixel ID hanya boleh berisi angka."
  if (value.length < PIXEL_ID_MIN_LENGTH || value.length > PIXEL_ID_MAX_LENGTH) {
    return `Pixel ID harus ${PIXEL_ID_MIN_LENGTH} sampai ${PIXEL_ID_MAX_LENGTH} digit.`
  }
  return null
})

const capiAccessToken = optionalText("Access Token", (value) => {
  if (/\s/.test(value)) return "Access Token tidak boleh mengandung spasi."
  if (value.length > CAPI_ACCESS_TOKEN_MAX_LENGTH) return `Access Token maksimal ${CAPI_ACCESS_TOKEN_MAX_LENGTH} karakter.`
  return null
})

const testEventCode = optionalText("Test Event Code", (value) => {
  if (!/^[A-Za-z0-9]+$/.test(value)) return "Test Event Code hanya boleh berisi huruf dan angka."
  if (value.length > TEST_EVENT_CODE_MAX_LENGTH) return `Test Event Code maksimal ${TEST_EVENT_CODE_MAX_LENGTH} karakter.`
  return null
})

const webhookSecret = optionalText("Webhook Secret", (value) => {
  if (/\s/.test(value)) return "Webhook Secret tidak boleh mengandung spasi."
  if (value.length < WEBHOOK_SECRET_MIN_LENGTH) return `Webhook Secret minimal ${WEBHOOK_SECRET_MIN_LENGTH} karakter.`
  if (value.length > WEBHOOK_SECRET_MAX_LENGTH) return `Webhook Secret maksimal ${WEBHOOK_SECRET_MAX_LENGTH} karakter.`
  return null
})

export const projectSettingsFormSchema = z.object({
  name: createProjectRequestSchema.shape.name,
  business_category: z.enum(BUSINESS_CATEGORIES, { error: "Pilih salah satu kategori bisnis." }),
  pixel_id: pixelId,
  capi_access_token: capiAccessToken,
  test_event_code: testEventCode,
  wa_connection_type: z
    .enum(WA_CONNECTION_TYPES, { error: "Jenis koneksi tidak dikenal." })
    .refine((value) => value !== "qr", "Koneksi lewat scan QR belum tersedia."),
  wa_provider: z.enum(WA_PROVIDERS, { error: "Provider tidak dikenal." }),
  webhook_secret: webhookSecret,
})

/**
 * `PUT /projects/{slug}/settings`: aturan yang sama, ditambah `null`. Token dan secret boleh dihilangkan
 * (nilai lama tetap); Pixel ID dan Test Event Code wajib dikirim, `null` atau "" berarti dikosongkan.
 */
export const updateProjectSettingsRequestSchema = projectSettingsFormSchema.extend({
  pixel_id: pixelId.nullable(),
  capi_access_token: capiAccessToken.nullish(),
  test_event_code: testEventCode.nullable(),
  webhook_secret: webhookSecret.nullish(),
})

/** Isi form (sebelum validasi). */
export type ProjectSettingsFormValues = z.input<typeof projectSettingsFormSchema>
/** Isi form yang sudah lolos validasi: di-trim, dan `wa_connection_type` pasti `waba` sampai Fase 5. */
export type ValidProjectSettingsFormValues = z.output<typeof projectSettingsFormSchema>

/** Nilai awal form dari `GET /settings`. Field token dan secret selalu kosong: rahasia tidak pernah dikirim balik utuh. */
export function settingsToFormValues(settings: ProjectSettings): ProjectSettingsFormValues {
  return {
    name: settings.name,
    business_category: settings.business_category,
    pixel_id: settings.pixel_id ?? "",
    capi_access_token: "",
    test_event_code: settings.test_event_code ?? "",
    wa_connection_type: settings.wa_connection_type,
    wa_provider: settings.wa_provider,
    webhook_secret: "",
  }
}

/**
 * Body `PUT /settings` dari isi form yang sudah lolos validasi. "" menjadi `null`: untuk token dan secret artinya
 * nilai lama tetap (AC 2), untuk Pixel ID dan Test Event Code artinya dikosongkan.
 */
export function toUpdateSettingsRequest(values: ValidProjectSettingsFormValues): UpdateProjectSettingsRequest {
  const orNull = (value: string) => value.trim() || null
  return {
    name: values.name.trim(),
    business_category: values.business_category,
    pixel_id: orNull(values.pixel_id),
    capi_access_token: orNull(values.capi_access_token),
    test_event_code: orNull(values.test_event_code),
    wa_connection_type: values.wa_connection_type,
    wa_provider: values.wa_provider,
    webhook_secret: orNull(values.webhook_secret),
  }
}
