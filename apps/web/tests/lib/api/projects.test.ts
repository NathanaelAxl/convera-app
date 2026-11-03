import { beforeEach, describe, expect, it, vi } from "vitest"

import { CSRF_COOKIE } from "@/lib/api/cookies"
import { createProject, deleteProject, getProject, listProjects, updateProjectStatus } from "@/lib/api/projects"

// Fungsi lib/api/projects.ts dengan modul `projects` keluar dari daftar mock (tahap integrasi):
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

describe("lib/api/projects (mode API asli)", () => {
  it("GET /api/v1/projects → isi `data`", async () => {
    respond = () => json(200, { data: [{ slug: "toko" }] })

    await expect(listProjects()).resolves.toEqual([{ slug: "toko" }])
    expect(calls).toMatchObject([{ method: "GET", path: "/api/v1/projects", csrf: null }])
  })

  it("POST /api/v1/projects mengirim nama + X-CSRF-Token", async () => {
    respond = () => json(201, { data: { slug: "toko-kue" } })

    await expect(createProject({ name: "Toko Kue" })).resolves.toEqual({ slug: "toko-kue" })
    expect(calls).toEqual([{ method: "POST", path: "/api/v1/projects", csrf: "tok-1", body: { name: "Toko Kue" } }])
  })

  it("GET /api/v1/projects/{slug}: 404 → ApiError NOT_FOUND", async () => {
    respond = () => json(404, { error: { code: "NOT_FOUND", message: "Proyek tidak ditemukan." } })

    await expect(getProject("milik-orang-lain")).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" })
    expect(calls[0].path).toBe("/api/v1/projects/milik-orang-lain")
  })

  it("PATCH /api/v1/projects/{slug}/status", async () => {
    respond = () => json(200, { data: { slug: "toko", is_active: false, updated_at: "2026-11-02T04:00:00Z" } })

    await expect(updateProjectStatus("toko", { is_active: false })).resolves.toMatchObject({ is_active: false })
    expect(calls).toEqual([
      { method: "PATCH", path: "/api/v1/projects/toko/status", csrf: "tok-1", body: { is_active: false } },
    ])
  })

  it("DELETE /api/v1/projects/{slug} mengirim confirm_name di body; 204 → undefined", async () => {
    await expect(deleteProject("toko", { confirm_name: "Toko" })).resolves.toBeUndefined()
    expect(calls).toEqual([
      { method: "DELETE", path: "/api/v1/projects/toko", csrf: "tok-1", body: { confirm_name: "Toko" } },
    ])
  })

  it("DELETE 422 → detail per field dari error.details", async () => {
    respond = () =>
      json(422, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data tidak valid.",
          details: [{ field: "confirm_name", message: "Nama yang diketik tidak sama dengan nama proyek." }],
        },
      })

    await expect(deleteProject("toko", { confirm_name: "Tok" })).rejects.toMatchObject({
      status: 422,
      details: [{ field: "confirm_name" }],
    })
  })

  it("slug di-encode di path", async () => {
    respond = () => json(404, { error: { code: "NOT_FOUND", message: "Proyek tidak ditemukan." } })

    await expect(getProject("a/b")).rejects.toMatchObject({ status: 404 })
    expect(calls[0].path).toBe("/api/v1/projects/a%2Fb")
  })
})
