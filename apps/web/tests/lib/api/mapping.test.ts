import { beforeEach, describe, expect, it, vi } from "vitest"

import { CSRF_COOKIE } from "@/lib/api/cookies"
import { applyFieldErrors } from "@/lib/api/errors"
import { listEventSlots, updateEventSlots } from "@/lib/api/mapping"
import type { UpdateEventSlotsRequest } from "@/lib/api/types"
import { toSlotFormField } from "@/lib/validation/mapping"

// Fungsi lib/api/mapping.ts dengan modul `mapping` keluar dari daftar mock (tahap integrasi):
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

/** Contoh request PRD 7.6 tanpa field Fase 2. */
const BODY: UpdateEventSlotsRequest = {
  slots: [
    {
      id: "a1f3c9d2-4b5e-4c6d-8e7f-9a0b1c2d3e4f",
      is_active: true,
      meta_event: "Contact",
      custom_event_name: null,
      trigger_keywords: [],
      sender: "customer",
      value_mode: "none",
      fixed_value: null,
    },
    {
      is_active: true,
      meta_event: "CustomEvent",
      custom_event_name: "TanyaOngkir",
      trigger_keywords: ["ongkir", "ongkos kirim"],
      sender: "customer",
      value_mode: "none",
      fixed_value: null,
    },
  ],
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

describe("lib/api/mapping (mode API asli)", () => {
  it("GET /api/v1/projects/{slug}/event-slots → isi `data`", async () => {
    const slots = [{ id: "a1f3c9d2-4b5e-4c6d-8e7f-9a0b1c2d3e4f", position: 1, meta_event: "Contact" }]
    respond = () => json(200, { data: slots })

    await expect(listEventSlots("toko")).resolves.toEqual(slots)
    expect(calls).toEqual([{ method: "GET", path: "/api/v1/projects/toko/event-slots", csrf: null, body: null }])
  })

  it("PUT /api/v1/projects/{slug}/event-slots mengirim seluruh slot + X-CSRF-Token", async () => {
    respond = () => json(200, { data: [] })

    await expect(updateEventSlots("toko", BODY)).resolves.toEqual([])
    expect(calls).toEqual([{ method: "PUT", path: "/api/v1/projects/toko/event-slots", csrf: "tok-1", body: BODY }])
  })

  it("PUT 422 → `details` dengan field `slots[i].x` dipasang ke field form `slots.i.x`", async () => {
    const details = [
      { field: "slots[1].custom_event_name", message: "Nama custom event wajib diisi." },
      { field: "slots[0].id", message: "Slot tidak ditemukan. Muat ulang halaman lalu coba lagi." },
    ]
    respond = () => json(422, { error: { code: "VALIDATION_ERROR", message: "Data tidak valid.", details } })

    const error = await updateEventSlots("toko", BODY).catch((caught: unknown) => caught)
    expect(error).toMatchObject({ status: 422, code: "VALIDATION_ERROR", details })

    const setError = vi.fn()
    expect(applyFieldErrors(error, setError, toSlotFormField)).toBe(true)
    expect(setError.mock.calls).toEqual([
      ["slots.1.custom_event_name", { type: "server", message: "Nama custom event wajib diisi." }, { shouldFocus: true }],
      [
        "slots.0.id",
        { type: "server", message: "Slot tidak ditemukan. Muat ulang halaman lalu coba lagi." },
        { shouldFocus: false },
      ],
    ])
  })

  it("proyek milik user lain → 404 NOT_FOUND; belum login → 401", async () => {
    respond = () => json(404, { error: { code: "NOT_FOUND", message: "Proyek tidak ditemukan." } })
    await expect(listEventSlots("milik-orang-lain")).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" })

    respond = () => json(401, { error: { code: "UNAUTHORIZED", message: "Sesi berakhir." } })
    await expect(updateEventSlots("toko", BODY)).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" })
  })
})
