import { MASK, MASK_MIN_LENGTH_FOR_SUFFIX } from "@/lib/settings"
import { updateProjectSettingsRequestSchema } from "@/lib/validation/settings"

import type {
  ApiErrorDetail,
  ProjectSettings,
  TestCapiResult,
  UpdateProjectSettingsRequest,
  WaProvider,
  WebhookSecretResult,
} from "../types"
import { mockRequireCsrf } from "./csrf"
import {
  currentUserIdOr401,
  findOwnedOr404,
  isLocked,
  readProjects,
  writeProjects,
  type MockProjectRecord,
} from "./projects"
import { mockDelay, mockError, mockValidate, randomAlphanumeric } from "./utils"

// Modul `settings` (PRD 5.4) membaca dan menulis "tabel" projects yang sama dengan mocks/projects.ts.
// Seperti server, token dan secret tidak pernah dikembalikan utuh (NFR-09).

/** "••••••••Zx9a" (AC 2); token pendek hanya "••••••••" agar tidak terbuka hampir utuh. */
export function maskSecret(secret: string) {
  return secret.length < MASK_MIN_LENGTH_FOR_SUFFIX ? MASK : `${MASK}${secret.slice(-4)}`
}

function toSettings(record: MockProjectRecord): ProjectSettings {
  return {
    name: record.name,
    business_category: record.business_category,
    pixel_id: record.pixel_id,
    has_capi_access_token: record.capi_access_token !== null,
    capi_access_token_masked: record.capi_access_token === null ? null : maskSecret(record.capi_access_token),
    test_event_code: record.test_event_code,
    wa_connection_type: record.wa_connection_type,
    // Kolom `wa_provider` hanya ditulis lewat PUT /settings yang memvalidasi enum `WaProvider`.
    wa_provider: record.wa_provider as WaProvider,
    webhook_url: record.webhook_url,
    has_webhook_secret: record.webhook_secret !== null,
  }
}

function saveRecord(record: MockProjectRecord) {
  writeProjects(readProjects().map((project) => (project.id === record.id ? record : project)))
}

export async function getSettings(slug: string): Promise<ProjectSettings> {
  await mockDelay()
  const userId = currentUserIdOr401()
  return toSettings(findOwnedOr404(userId, slug))
}

export async function updateSettings(slug: string, body: UpdateProjectSettingsRequest): Promise<ProjectSettings> {
  await mockDelay()
  mockRequireCsrf()
  const userId = currentUserIdOr401()
  const record = findOwnedOr404(userId, slug)
  const input = mockValidate(updateProjectSettingsRequestSchema, body)

  const updated: MockProjectRecord = {
    ...record,
    name: input.name,
    business_category: input.business_category,
    pixel_id: input.pixel_id || null,
    // Token dan secret yang kosong atau tidak dikirim tidak menghapus nilai lama (AC 2).
    capi_access_token: input.capi_access_token || record.capi_access_token,
    test_event_code: input.test_event_code || null,
    wa_connection_type: input.wa_connection_type,
    wa_provider: input.wa_provider,
    webhook_secret: input.webhook_secret || record.webhook_secret,
    updated_at: new Date().toISOString(),
  }
  saveRecord(updated)
  return toSettings(updated)
}

/**
 * Tiruan jawaban Meta untuk satu event uji (FR-18). Access Token Meta diawali "EAA"; token lain ditolak seperti
 * token yang tidak valid, sehingga alur "Meta menolak → perbaiki token → uji lagi" (UF-01 langkah 9) bisa dicoba.
 */
export async function testCapi(slug: string): Promise<TestCapiResult> {
  await mockDelay(600)
  mockRequireCsrf()
  const userId = currentUserIdOr401()
  const record = findOwnedOr404(userId, slug)
  if (isLocked(record)) {
    mockError(402, "SUBSCRIPTION_EXPIRED", "Masa trial atau langganan proyek ini sudah habis. Uji koneksi tidak tersedia.")
  }

  const { pixel_id, capi_access_token } = record
  if (!pixel_id || !capi_access_token) {
    const missing: ApiErrorDetail[] = []
    if (!pixel_id) missing.push({ field: "pixel_id", message: "Pixel ID belum diisi." })
    if (!capi_access_token) missing.push({ field: "capi_access_token", message: "Access Token belum diisi." })
    mockError(422, "VALIDATION_ERROR", "Isi dan simpan Pixel ID serta Access Token sebelum menguji koneksi.", missing)
  }

  const accepted = capi_access_token.startsWith("EAA")
  return {
    success: accepted,
    events_received: accepted ? 1 : 0,
    fbtrace_id: randomAlphanumeric(11),
    message: accepted ? null : "Invalid OAuth access token.",
    used_test_event_code: record.test_event_code,
  }
}

/** Secret baru langsung menggantikan yang lama; nilai utuh hanya ada di respons ini (AC 5). */
export async function createWebhookSecret(slug: string): Promise<WebhookSecretResult> {
  await mockDelay()
  mockRequireCsrf()
  const userId = currentUserIdOr401()
  const record = findOwnedOr404(userId, slug)

  const secret = `whsec_${randomAlphanumeric(32)}`
  saveRecord({ ...record, webhook_secret: secret, updated_at: new Date().toISOString() })
  return { webhook_secret: secret, has_webhook_secret: true }
}
