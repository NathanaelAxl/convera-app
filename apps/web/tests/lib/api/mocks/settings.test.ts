import { beforeEach, describe, expect, it, vi } from "vitest"

import { CSRF_COOKIE } from "@/lib/api/cookies"
import { issueCsrfToken } from "@/lib/api/mocks/csrf"
import * as projects from "@/lib/api/mocks/projects"
import { setMockSessionUserId } from "@/lib/api/mocks/session"
import * as settings from "@/lib/api/mocks/settings"
import type { UpdateProjectSettingsRequest } from "@/lib/api/types"

// Uji lapisan mock settings seperti menguji server: status, kode error, detail field, dan bentuk respons PRD 7.5.

vi.mock(import("@/lib/api/mocks/utils"), async (importOriginal) => ({
  ...(await importOriginal()),
  mockDelay: () => Promise.resolve(),
}))

const TOKO = "toko-dummy-co-2026"
/** Proyek contoh tanpa Pixel ID, token, maupun secret; langganannya habis (terkunci). */
const WARUNG = "warung-makan-bu-sari"
/** Proyek contoh milik user lain. */
const OTHER = "butik-kebaya-ayu"

const SETTINGS_KEYS = [
  "name",
  "business_category",
  "pixel_id",
  "has_capi_access_token",
  "capi_access_token_masked",
  "test_event_code",
  "wa_connection_type",
  "wa_provider",
  "webhook_url",
  "has_webhook_secret",
]

const BODY: UpdateProjectSettingsRequest = {
  name: "Toko Dummy & Co. 2026!",
  business_category: "ecommerce",
  pixel_id: "123456789012345",
  capi_access_token: null,
  test_event_code: "TEST48213",
  wa_connection_type: "waba",
  wa_provider: "generic",
  webhook_secret: null,
}

/** Salinan objek tanpa key tertentu, untuk menguji field yang tidak dikirim. */
function omit<T extends object>(value: T, ...keys: (keyof T)[]) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key as keyof T)))
}

function setCsrfCookie(value: string | null) {
  document.cookie = value === null ? `${CSRF_COOKIE}=; Max-Age=0; Path=/` : `${CSRF_COOKIE}=${value}; Path=/`
}

beforeEach(async () => {
  window.localStorage.clear()
  setCsrfCookie(null)
  await issueCsrfToken()
})

describe("GET /projects/{slug}/settings", () => {
  it("bentuk persis PRD 7.5; token hanya tersamar, secret hanya statusnya", async () => {
    const result = await settings.getSettings(TOKO)

    expect(Object.keys(result)).toEqual(SETTINGS_KEYS)
    expect(result).toEqual({
      name: "Toko Dummy & Co. 2026!",
      business_category: "ecommerce",
      pixel_id: "123456789012345",
      has_capi_access_token: true,
      capi_access_token_masked: "••••••••Zx9a",
      test_event_code: "TEST48213",
      wa_connection_type: "waba",
      wa_provider: "generic",
      webhook_url: "https://api.example.com/api/v1/webhooks/wa/k7Qm2xPz9LwR4tVb8NcY1sDf6GhJ3aEu",
      has_webhook_secret: true,
    })
    expect(JSON.stringify(result)).not.toMatch(/EAAG|whsec_/)
  })

  it("proyek belum dikonfigurasi → null dan false", async () => {
    await expect(settings.getSettings(WARUNG)).resolves.toMatchObject({
      pixel_id: null,
      has_capi_access_token: false,
      capi_access_token_masked: null,
      test_event_code: null,
      has_webhook_secret: false,
    })
  })

  it("proyek milik user lain atau tidak ada → 404; tanpa login → 401", async () => {
    await expect(settings.getSettings(OTHER)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" })
    await expect(settings.getSettings("tidak-ada")).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" })

    setMockSessionUserId(null)
    await expect(settings.getSettings(TOKO)).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" })
  })
})

describe("PUT /projects/{slug}/settings", () => {
  it("menyimpan semua kartu sekaligus; respons sama seperti GET; nama dan kategori ikut berubah di proyek", async () => {
    const result = await settings.updateSettings(TOKO, {
      ...BODY,
      name: "  Toko Dummy Baru  ",
      business_category: "fnb",
      pixel_id: "9876543210",
      capi_access_token: "EAAGtokenbaruUntukUjiQw3e",
      test_event_code: "TEST11111",
    })

    expect(Object.keys(result)).toEqual(SETTINGS_KEYS)
    expect(result).toMatchObject({
      name: "Toko Dummy Baru",
      business_category: "fnb",
      pixel_id: "9876543210",
      capi_access_token_masked: "••••••••Qw3e",
      test_event_code: "TEST11111",
    })
    await expect(settings.getSettings(TOKO)).resolves.toEqual(result)
    await expect(projects.getProject(TOKO)).resolves.toMatchObject({
      name: "Toko Dummy Baru",
      business_category: "fnb",
      slug: TOKO,
      pixel_id: "9876543210",
    })
  })

  it("AC 2: token dan secret null, dihilangkan, atau kosong tidak menghapus nilai lama", async () => {
    const withoutSecrets = omit(BODY, "capi_access_token", "webhook_secret") as UpdateProjectSettingsRequest
    for (const body of [BODY, withoutSecrets, { ...BODY, capi_access_token: "", webhook_secret: "  " }]) {
      await expect(settings.updateSettings(TOKO, body)).resolves.toMatchObject({
        has_capi_access_token: true,
        capi_access_token_masked: "••••••••Zx9a",
        has_webhook_secret: true,
      })
    }
  })

  it("Pixel ID dan Test Event Code null atau kosong → dikosongkan (UF-01 langkah 11)", async () => {
    await expect(settings.updateSettings(TOKO, { ...BODY, pixel_id: "", test_event_code: null })).resolves.toMatchObject({
      pixel_id: null,
      test_event_code: null,
    })
  })

  it("secret dari provider disimpan, tetapi tidak pernah dikembalikan", async () => {
    const result = await settings.updateSettings(WARUNG, {
      ...BODY,
      name: "Warung Makan Bu Sari",
      webhook_secret: "secret-dari-provider-123",
    })

    expect(result.has_webhook_secret).toBe(true)
    expect(JSON.stringify(result)).not.toContain("secret-dari-provider-123")
  })

  it("token pendek hanya ditampilkan sebagai •••••••• agar tidak terbuka hampir utuh", async () => {
    await expect(settings.updateSettings(TOKO, { ...BODY, capi_access_token: "EAAshort" })).resolves.toMatchObject({
      capi_access_token_masked: "••••••••",
    })
  })

  it("AC 1: 422 VALIDATION_ERROR dengan detail per field; tidak ada yang tersimpan", async () => {
    await expect(
      settings.updateSettings(TOKO, {
        ...BODY,
        name: "Nama Baru",
        pixel_id: "12345abc",
        test_event_code: "TEST-1",
        wa_connection_type: "qr",
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      details: [
        { field: "pixel_id", message: "Pixel ID hanya boleh berisi angka." },
        { field: "test_event_code", message: "Test Event Code hanya boleh berisi huruf dan angka." },
        { field: "wa_connection_type", message: "Koneksi lewat scan QR belum tersedia." },
      ],
    })
    await expect(settings.getSettings(TOKO)).resolves.toMatchObject({ name: "Toko Dummy & Co. 2026!" })
  })

  it("provider tidak dikenal → 422 di field wa_provider", async () => {
    await expect(
      settings.updateSettings(TOKO, { ...BODY, wa_provider: "qontak" } as unknown as UpdateProjectSettingsRequest),
    ).rejects.toMatchObject({ status: 422, details: [{ field: "wa_provider", message: "Provider tidak dikenal." }] })
  })

  it("proyek milik user lain → 404 dan tidak berubah; tanpa login → 401; tanpa token CSRF → 403", async () => {
    await expect(settings.updateSettings(OTHER, { ...BODY, name: "Diambil alih" })).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    })
    setMockSessionUserId(projects.OTHER_USER_ID)
    await expect(settings.getSettings(OTHER)).resolves.toMatchObject({ name: "Butik Kebaya Ayu" })

    setMockSessionUserId(null)
    await expect(settings.updateSettings(TOKO, BODY)).rejects.toMatchObject({ status: 401 })

    setMockSessionUserId("5b1c8f4e-2a7d-4c1e-9a0b-1f2e3d4c5b6a")
    setCsrfCookie(null)
    await expect(settings.updateSettings(TOKO, BODY)).rejects.toMatchObject({ status: 403, code: "CSRF_INVALID" })
  })
})

describe("POST /projects/{slug}/settings/test-capi", () => {
  it("token valid → Meta menerima 1 event uji dengan Test Event Code yang tersimpan", async () => {
    const result = await settings.testCapi(TOKO)

    expect(Object.keys(result)).toEqual(["success", "events_received", "fbtrace_id", "message", "used_test_event_code"])
    expect(result).toMatchObject({ success: true, events_received: 1, message: null, used_test_event_code: "TEST48213" })
    expect(result.fbtrace_id).toMatch(/^[A-Za-z0-9]{11}$/)
  })

  it("token ditolak Meta → 200 dengan success false dan pesan dari Meta", async () => {
    await settings.updateSettings(TOKO, { ...BODY, capi_access_token: "tokensalah1234567890" })

    await expect(settings.testCapi(TOKO)).resolves.toMatchObject({
      success: false,
      events_received: 0,
      message: "Invalid OAuth access token.",
      used_test_event_code: "TEST48213",
    })
  })

  it("tanpa Test Event Code → used_test_event_code null", async () => {
    await settings.updateSettings(TOKO, { ...BODY, test_event_code: null })

    await expect(settings.testCapi(TOKO)).resolves.toMatchObject({ success: true, used_test_event_code: null })
  })

  it("AC 6: Pixel ID atau token belum tersimpan → 422 dengan field yang kurang", async () => {
    await settings.updateSettings(TOKO, { ...BODY, pixel_id: null })

    await expect(settings.testCapi(TOKO)).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      details: [{ field: "pixel_id", message: "Pixel ID belum diisi." }],
    })
  })

  it("proyek terkunci (langganan habis) → 402 SUBSCRIPTION_EXPIRED", async () => {
    await expect(settings.testCapi(WARUNG)).rejects.toMatchObject({ status: 402, code: "SUBSCRIPTION_EXPIRED" })
  })

  it("proyek milik user lain → 404; tanpa login → 401; tanpa token CSRF → 403", async () => {
    await expect(settings.testCapi(OTHER)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" })

    setCsrfCookie(null)
    await expect(settings.testCapi(TOKO)).rejects.toMatchObject({ status: 403, code: "CSRF_INVALID" })

    await issueCsrfToken()
    setMockSessionUserId(null)
    await expect(settings.testCapi(TOKO)).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" })
  })
})

describe("POST /projects/{slug}/settings/webhook-secret", () => {
  it("201: secret baru hanya ada di respons ini; GET hanya menampilkan statusnya", async () => {
    const result = await settings.createWebhookSecret(WARUNG)

    expect(result).toEqual({ webhook_secret: expect.stringMatching(/^whsec_[A-Za-z0-9]{32}$/), has_webhook_secret: true })
    const after = await settings.getSettings(WARUNG)
    expect(after.has_webhook_secret).toBe(true)
    expect(JSON.stringify(after)).not.toContain(result.webhook_secret)
  })

  it("setiap permintaan menghasilkan secret berbeda (secret lama langsung tidak berlaku)", async () => {
    const first = await settings.createWebhookSecret(TOKO)
    const second = await settings.createWebhookSecret(TOKO)

    expect(first.webhook_secret).not.toBe(second.webhook_secret)
  })

  it("proyek milik user lain → 404; tanpa login → 401; tanpa token CSRF → 403", async () => {
    await expect(settings.createWebhookSecret(OTHER)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" })

    setCsrfCookie(null)
    await expect(settings.createWebhookSecret(TOKO)).rejects.toMatchObject({ status: 403, code: "CSRF_INVALID" })

    await issueCsrfToken()
    setMockSessionUserId(null)
    await expect(settings.createWebhookSecret(TOKO)).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" })
  })
})
