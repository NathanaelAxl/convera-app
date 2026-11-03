import { beforeEach, describe, expect, it, vi } from "vitest"

import { CSRF_COOKIE } from "@/lib/api/cookies"
import { issueCsrfToken } from "@/lib/api/mocks/csrf"
import * as projects from "@/lib/api/mocks/projects"
import { setMockSessionUserId } from "@/lib/api/mocks/session"

// Uji lapisan mock projects seperti menguji server: status, kode error, detail field, dan bentuk respons PRD 7.4.

vi.mock(import("@/lib/api/mocks/utils"), async (importOriginal) => ({
  ...(await importOriginal()),
  mockDelay: () => Promise.resolve(),
}))

const RINA_ID = "5b1c8f4e-2a7d-4c1e-9a0b-1f2e3d4c5b6a"
const TOKO = { name: "Toko Dummy & Co. 2026!", slug: "toko-dummy-co-2026" }
/** Proyek contoh milik user lain. */
const OTHER_SLUG = "butik-kebaya-ayu"

const PROJECT_KEYS = [
  "id",
  "name",
  "slug",
  "business_category",
  "is_active",
  "wa_connection_type",
  "wa_provider",
  "webhook_url",
  "subscription_status",
  "trial_ends_at",
  "subscription_ends_at",
  "created_at",
]

function setCsrfCookie(value: string | null) {
  document.cookie = value === null ? `${CSRF_COOKIE}=; Max-Age=0; Path=/` : `${CSRF_COOKIE}=${value}; Path=/`
}

beforeEach(async () => {
  window.localStorage.clear()
  setCsrfCookie(null)
  await issueCsrfToken()
})

describe("GET /projects", () => {
  it("hanya proyek milik user, terbaru dulu, bentuk persis PRD 7.4", async () => {
    const list = await projects.listProjects()

    expect(list.map((project) => project.slug)).toEqual([
      "toko-dummy-co-2026",
      "klinik-gigi-senyum-sehat",
      "warung-makan-bu-sari",
    ])
    expect(list.every((project) => Object.keys(project).join() === PROJECT_KEYS.join())).toBe(true)
    expect(list[0]).toEqual({
      id: "0f8e2c1a-6b3d-4f5e-8a9b-7c6d5e4f3a2b",
      name: TOKO.name,
      slug: TOKO.slug,
      business_category: "ecommerce",
      is_active: true,
      wa_connection_type: "waba",
      wa_provider: "generic",
      webhook_url: "https://api.example.com/api/v1/webhooks/wa/k7Qm2xPz9LwR4tVb8NcY1sDf6GhJ3aEu",
      subscription_status: "trial",
      trial_ends_at: "2026-11-09T03:16:00Z",
      subscription_ends_at: null,
      created_at: "2026-11-02T03:16:00Z",
    })
  })

  it("user tanpa proyek → daftar kosong", async () => {
    setMockSessionUserId("9d2e4f6a-8b1c-4d3e-a5f7-2c4e6a8b0d1f")

    await expect(projects.listProjects()).resolves.toEqual([])
  })

  it("tanpa login → 401 UNAUTHORIZED", async () => {
    setMockSessionUserId(null)

    await expect(projects.listProjects()).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" })
  })
})

describe("POST /projects", () => {
  it("201: default PRD, webhook_key acak 32 karakter, trial 7 hari, langsung ada di daftar paling atas", async () => {
    const project = await projects.createProject({ name: "  Toko Kue Bu Ani  " })

    expect(Object.keys(project)).toEqual(PROJECT_KEYS)
    expect(project).toMatchObject({
      name: "Toko Kue Bu Ani",
      slug: "toko-kue-bu-ani",
      business_category: "general",
      is_active: true,
      wa_connection_type: "waba",
      wa_provider: "generic",
      subscription_status: "trial",
      subscription_ends_at: null,
    })
    expect(project.webhook_url).toMatch(/^https:\/\/api\.example\.com\/api\/v1\/webhooks\/wa\/[A-Za-z0-9]{32}$/)
    expect(Date.parse(project.trial_ends_at) - Date.parse(project.created_at)).toBe(7 * 24 * 60 * 60_000)
    expect((await projects.listProjects())[0]).toEqual(project)
  })

  it("AC 4: slug bentrok → -2, -3; termasuk slug milik user lain (unik global)", async () => {
    await expect(projects.createProject({ name: TOKO.name })).resolves.toMatchObject({ slug: `${TOKO.slug}-2` })
    await expect(projects.createProject({ name: "Toko Dummy, Co 2026" })).resolves.toMatchObject({
      slug: `${TOKO.slug}-3`,
    })
    await expect(projects.createProject({ name: "Butik Kebaya Ayu" })).resolves.toMatchObject({
      slug: `${OTHER_SLUG}-2`,
    })
  })

  it("setiap proyek punya webhook URL berbeda", async () => {
    const first = await projects.createProject({ name: "Proyek A" })
    const second = await projects.createProject({ name: "Proyek B" })

    expect(first.webhook_url).not.toBe(second.webhook_url)
  })

  it.each([
    ["", "Nama proyek wajib diisi."],
    ["   ", "Nama proyek wajib diisi."],
    ["a".repeat(101), "Nama proyek maksimal 100 karakter."],
  ])("AC 2: nama %j → 422 VALIDATION_ERROR di field name", async (name, message) => {
    await expect(projects.createProject({ name })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      details: [{ field: "name", message }],
    })
  })

  it("tanpa token CSRF → 403 CSRF_INVALID; tanpa login → 401", async () => {
    setCsrfCookie(null)
    await expect(projects.createProject({ name: "Baru" })).rejects.toMatchObject({ status: 403, code: "CSRF_INVALID" })

    await issueCsrfToken()
    setMockSessionUserId(null)
    await expect(projects.createProject({ name: "Baru" })).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" })
  })
})

describe("GET /projects/{slug}", () => {
  it("objek proyek + is_locked, has_capi_access_token, pixel_id, setup_complete", async () => {
    const project = await projects.getProject(TOKO.slug)

    expect(Object.keys(project)).toEqual([
      ...PROJECT_KEYS,
      "is_locked",
      "has_capi_access_token",
      "pixel_id",
      "setup_complete",
    ])
    expect(project).toMatchObject({
      slug: TOKO.slug,
      is_locked: false,
      has_capi_access_token: true,
      pixel_id: "123456789012345",
      setup_complete: false,
    })
  })

  it("AC 7: slug milik user lain atau tidak ada → 404 NOT_FOUND (bukan 403)", async () => {
    await expect(projects.getProject(OTHER_SLUG)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" })
    await expect(projects.getProject("tidak-ada")).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" })
  })

  it("tanpa login → 401", async () => {
    setMockSessionUserId(null)

    await expect(projects.getProject(TOKO.slug)).rejects.toMatchObject({ status: 401 })
  })
})

describe("PATCH /projects/{slug}/status", () => {
  it("nonaktifkan lalu aktifkan kembali; bentuk respons persis PRD 7.4", async () => {
    const result = await projects.updateProjectStatus(TOKO.slug, { is_active: false })

    expect(Object.keys(result)).toEqual(["slug", "is_active", "updated_at"])
    expect(result).toMatchObject({ slug: TOKO.slug, is_active: false })
    expect((await projects.getProject(TOKO.slug)).is_active).toBe(false)

    await projects.updateProjectStatus(TOKO.slug, { is_active: true })
    expect((await projects.getProject(TOKO.slug)).is_active).toBe(true)
  })

  it("is_active bukan boolean → 422 di field is_active", async () => {
    await expect(
      projects.updateProjectStatus(TOKO.slug, { is_active: "false" } as unknown as { is_active: boolean }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR", details: [{ field: "is_active" }] })
  })

  it("proyek milik user lain → 404 dan statusnya tidak berubah", async () => {
    await expect(projects.updateProjectStatus(OTHER_SLUG, { is_active: false })).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    })

    setMockSessionUserId(projects.OTHER_USER_ID)
    await expect(projects.getProject(OTHER_SLUG)).resolves.toMatchObject({ is_active: true })
  })

  it("tanpa token CSRF → 403", async () => {
    setCsrfCookie(null)

    await expect(projects.updateProjectStatus(TOKO.slug, { is_active: false })).rejects.toMatchObject({
      status: 403,
      code: "CSRF_INVALID",
    })
  })
})

describe("DELETE /projects/{slug}", () => {
  it("nama konfirmasi tidak cocok (termasuk beda huruf besar/kecil) → 422 di field confirm_name", async () => {
    for (const confirm_name of ["Toko Dummy", "toko dummy & co. 2026!"]) {
      await expect(projects.deleteProject(TOKO.slug, { confirm_name })).rejects.toMatchObject({
        status: 422,
        code: "VALIDATION_ERROR",
        details: [{ field: "confirm_name", message: "Nama yang diketik tidak sama dengan nama proyek." }],
      })
    }
    await expect(projects.deleteProject(TOKO.slug, { confirm_name: "" })).rejects.toMatchObject({
      status: 422,
      details: [{ field: "confirm_name", message: "Ketik nama proyek untuk konfirmasi." }],
    })
    await expect(projects.getProject(TOKO.slug)).resolves.toMatchObject({ slug: TOKO.slug })
  })

  it("nama cocok → 204; proyek hilang dari daftar dan GET menjadi 404", async () => {
    await expect(projects.deleteProject(TOKO.slug, { confirm_name: ` ${TOKO.name} ` })).resolves.toBeUndefined()

    expect((await projects.listProjects()).map((project) => project.slug)).not.toContain(TOKO.slug)
    await expect(projects.getProject(TOKO.slug)).rejects.toMatchObject({ status: 404 })
  })

  it("proyek milik user lain → 404 walau nama cocok", async () => {
    await expect(projects.deleteProject(OTHER_SLUG, { confirm_name: "Butik Kebaya Ayu" })).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    })
  })

  it("tanpa login → 401; tanpa token CSRF → 403", async () => {
    setMockSessionUserId(null)
    await expect(projects.deleteProject(TOKO.slug, { confirm_name: TOKO.name })).rejects.toMatchObject({ status: 401 })

    setMockSessionUserId(RINA_ID)
    setCsrfCookie(null)
    await expect(projects.deleteProject(TOKO.slug, { confirm_name: TOKO.name })).rejects.toMatchObject({
      status: 403,
      code: "CSRF_INVALID",
    })
  })
})
