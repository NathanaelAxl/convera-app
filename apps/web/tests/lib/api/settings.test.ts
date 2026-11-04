import { beforeEach, describe, expect, it, vi } from "vitest"

import { CSRF_COOKIE } from "@/lib/api/cookies"
import { applyFieldErrors } from "@/lib/api/errors"
import { createWebhookSecret, getProjectSettings, testProjectCapi, updateProjectSettings } from "@/lib/api/settings"
import type { UpdateProjectSettingsRequest } from "@/lib/api/types"

// Fungsi lib/api/settings.ts dengan modul `settings` keluar dari daftar mock (tahap integrasi):
// method, path, body, header CSRF, dan pembacaan `data`/error sesuai openapi.yaml.

vi.mock(import("@/lib/api/config"), async (importOriginal) => ({
  ...(await importOriginal()),
  isMocked: () => false,
}))

type Call = { method: string; path: string; csrf: string | null; body: unknown }

let calls: Call[] = []
let respond: (call: Call) => Response = () => new Response(null, { status: 204 })

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

const BODY: UpdateProjectSettingsRequest = {
  name: "Toko Dummy & Co. 2026!",
  business_category: "ecommerce",
  pixel_id: "123456789012345",
  capi_access_token: "EAAG...tokenbaru",
  test_event_code: "TEST48213",
  wa_connection_type: "waba",
  wa_provider: "generic",
  webhook_secret: null,
}

beforeEach(() => {
  calls = []
  respond = () => new Response(null, { status: 204 })
  document.cookie = `${CSRF_COOKIE}=tok-1; Path=/`
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const text = await request.text()
      const call: Call = {
        method: request.method,
        path: new URL(request.url).pathname,
        csrf: request.headers.get("X-CSRF-Token"),
        body: text ? JSON.parse(text) : null,
      }
      calls.push(call)
      return respond(call)
    }),
  )
})

describe("lib/api/settings (mode API asli)", () => {
  it("GET /api/v1/projects/{slug}/settings → isi `data`", async () => {
    respond = () => json(200, { data: { name: "Toko", has_webhook_secret: true } })

    await expect(getProjectSettings("toko")).resolves.toEqual({ name: "Toko", has_webhook_secret: true })
    expect(calls).toEqual([{ method: "GET", path: "/api/v1/projects/toko/settings", csrf: null, body: null }])
  })

  it("PUT /api/v1/projects/{slug}/settings mengirim semua field + X-CSRF-Token", async () => {
    respond = () => json(200, { data: { name: "Toko" } })

    await expect(updateProjectSettings("toko", BODY)).resolves.toEqual({ name: "Toko" })
    expect(calls).toEqual([{ method: "PUT", path: "/api/v1/projects/toko/settings", csrf: "tok-1", body: BODY }])
  })

  it("PUT 422 → error.details bisa dipasang per field di form", async () => {
    const details = [{ field: "pixel_id", message: "Pixel ID hanya boleh berisi angka." }]
    respond = () => json(422, { error: { code: "VALIDATION_ERROR", message: "Data tidak valid.", details } })

    const error = await updateProjectSettings("toko", BODY).catch((caught: unknown) => caught)
    expect(error).toMatchObject({ status: 422, code: "VALIDATION_ERROR", details })

    const setError = vi.fn()
    expect(applyFieldErrors(error, setError)).toBe(true)
    expect(setError).toHaveBeenCalledWith(
      "pixel_id",
      { type: "server", message: "Pixel ID hanya boleh berisi angka." },
      { shouldFocus: true },
    )
  })

  it("POST /api/v1/projects/{slug}/settings/test-capi tanpa body; jawaban Meta dari `data`", async () => {
    const result = { success: false, events_received: 0, fbtrace_id: "XyZ98wVu7t", message: "Invalid OAuth access token.", used_test_event_code: "TEST48213" }
    respond = () => json(200, { data: result })

    await expect(testProjectCapi("toko")).resolves.toEqual(result)
    expect(calls).toEqual([{ method: "POST", path: "/api/v1/projects/toko/settings/test-capi", csrf: "tok-1", body: null }])
  })

  it("test-capi 402 dan 502 → ApiError dengan pesan server", async () => {
    respond = () => json(402, { error: { code: "SUBSCRIPTION_EXPIRED", message: "Langganan habis." } })
    await expect(testProjectCapi("toko")).rejects.toMatchObject({ status: 402, code: "SUBSCRIPTION_EXPIRED", message: "Langganan habis." })

    respond = () => json(502, { error: { code: "EXTERNAL_SERVICE_ERROR", message: "Meta tidak bisa dihubungi." } })
    await expect(testProjectCapi("toko")).rejects.toMatchObject({ status: 502, code: "EXTERNAL_SERVICE_ERROR" })
  })

  it("POST /api/v1/projects/{slug}/settings/webhook-secret → 201 `data`", async () => {
    const result = { webhook_secret: "whsec_4Jd8Kq2Lm7Np1Rs5Tv9Xz3Bc6Fh0Gk", has_webhook_secret: true }
    respond = () => json(201, { data: result })

    await expect(createWebhookSecret("toko")).resolves.toEqual(result)
    expect(calls).toEqual([
      { method: "POST", path: "/api/v1/projects/toko/settings/webhook-secret", csrf: "tok-1", body: null },
    ])
  })

  it("proyek milik user lain → 404 NOT_FOUND", async () => {
    respond = () => json(404, { error: { code: "NOT_FOUND", message: "Proyek tidak ditemukan." } })

    await expect(getProjectSettings("milik-orang-lain")).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" })
  })
})
