import { beforeEach, describe, expect, it, vi } from "vitest"

import { CSRF_COOKIE } from "@/lib/api/cookies"
import { issueCsrfToken } from "@/lib/api/mocks/csrf"
import * as mapping from "@/lib/api/mocks/mapping"
import * as projects from "@/lib/api/mocks/projects"
import { setMockSessionUserId } from "@/lib/api/mocks/session"
import type { EventSlotInput } from "@/lib/api/types"

// Uji lapisan mock mapping seperti menguji server: status, kode error, detail field, dan bentuk respons PRD 7.6.

vi.mock(import("@/lib/api/mocks/utils"), async (importOriginal) => ({
  ...(await importOriginal()),
  mockDelay: () => Promise.resolve(),
}))

const TOKO = "toko-dummy-co-2026"
/** Proyek contoh milik user lain. */
const OTHER = "butik-kebaya-ayu"

const CONTACT_ID = "a1f3c9d2-4b5e-4c6d-8e7f-9a0b1c2d3e4f"
const LEAD_ID = "b2e4d0c3-5c6f-4d7e-9f80-0b1c2d3e4f5a"
const PURCHASE_ID = "e5b7a3f6-8f9c-4a0b-c2b3-3e4f5a6b7c8d"

/** Field slot di respons (tanpa field Fase 2), urutan sama dengan contoh PRD 7.6. */
const SLOT_KEYS = [
  "id",
  "position",
  "is_active",
  "meta_event",
  "custom_event_name",
  "trigger_keywords",
  "sender",
  "value_mode",
  "fixed_value",
]

/** Slot baru Custom Event dari contoh request PRD 7.6. */
const TANYA_ONGKIR: EventSlotInput = {
  is_active: true,
  meta_event: "CustomEvent",
  custom_event_name: "TanyaOngkir",
  trigger_keywords: ["ongkir", "ongkos kirim"],
  sender: "customer",
  value_mode: "none",
  fixed_value: null,
}

/** Slot dari `GET` → bentuk request (tanpa `position`). */
async function currentInputs(slug = TOKO): Promise<EventSlotInput[]> {
  const slots = await mapping.listEventSlots(slug)
  return slots.map(({ id, is_active, meta_event, custom_event_name, trigger_keywords, sender, value_mode, fixed_value }) => ({
    id,
    is_active,
    meta_event,
    custom_event_name,
    trigger_keywords,
    sender,
    value_mode,
    fixed_value,
  }))
}

function setCsrfCookie(value: string | null) {
  document.cookie = value === null ? `${CSRF_COOKIE}=; Max-Age=0; Path=/` : `${CSRF_COOKIE}=${value}; Path=/`
}

beforeEach(async () => {
  window.localStorage.clear()
  setCsrfCookie(null)
  await issueCsrfToken()
})

describe("GET /projects/{slug}/event-slots", () => {
  it("bentuk persis contoh PRD 7.6 (tanpa field Fase 2), urut sesuai position", async () => {
    const slots = await mapping.listEventSlots(TOKO)

    for (const slot of slots) expect(Object.keys(slot)).toEqual(SLOT_KEYS)
    expect(slots).toEqual([
      {
        id: CONTACT_ID,
        position: 1,
        is_active: true,
        meta_event: "Contact",
        custom_event_name: null,
        trigger_keywords: [],
        sender: "customer",
        value_mode: "none",
        fixed_value: null,
      },
      {
        id: LEAD_ID,
        position: 2,
        is_active: true,
        meta_event: "Lead",
        custom_event_name: null,
        trigger_keywords: ["harga", "transfer"],
        sender: "customer",
        value_mode: "none",
        fixed_value: null,
      },
      {
        id: PURCHASE_ID,
        position: 3,
        is_active: true,
        meta_event: "Purchase",
        custom_event_name: null,
        trigger_keywords: ["total transfer"],
        sender: "cs",
        value_mode: "keyword",
        fixed_value: null,
      },
    ])
  })

  it("proyek milik user lain atau tidak ada → 404; tanpa login → 401", async () => {
    await expect(mapping.listEventSlots(OTHER)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" })
    await expect(mapping.listEventSlots("tidak-ada")).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" })

    setMockSessionUserId(null)
    await expect(mapping.listEventSlots(TOKO)).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" })
  })
})

describe("AC 4: slot default proyek baru", () => {
  it("proyek baru mendapat Contact aktif + Lead, InitiateCheckout, Purchase tidak aktif; ikut terhapus bersama proyek", async () => {
    const project = await projects.createProject({ name: "Kopi Senja Nusantara" })
    const slots = await mapping.listEventSlots(project.slug)

    expect(slots.map(({ position, meta_event, is_active }) => [position, meta_event, is_active])).toEqual([
      [1, "Contact", true],
      [2, "Lead", false],
      [3, "InitiateCheckout", false],
      [4, "Purchase", false],
    ])
    expect(slots[0]).toMatchObject({ sender: "customer", trigger_keywords: [], value_mode: "none" })
    expect(new Set(slots.map((slot) => slot.id)).size).toBe(4)
    // Slot proyek lain tidak tersentuh.
    await expect(mapping.listEventSlots(TOKO)).resolves.toHaveLength(3)

    await projects.deleteProject(project.slug, { confirm_name: "Kopi Senja Nusantara" })
    expect(window.localStorage.getItem("convera.mock-event-slots.v1")).not.toContain(project.id)
    await expect(mapping.listEventSlots(TOKO)).resolves.toHaveLength(3)
  })
})

describe("PUT /projects/{slug}/event-slots", () => {
  it("contoh PRD 7.6: slot dengan id diperbarui (ID tetap), slot tanpa id dibuat, slot yang tidak dikirim dihapus", async () => {
    const [contact] = await currentInputs()
    const result = await mapping.updateEventSlots(TOKO, { slots: [contact, TANYA_ONGKIR] })

    expect(result).toHaveLength(2)
    for (const slot of result) expect(Object.keys(slot)).toEqual(SLOT_KEYS)
    expect(result[0]).toEqual({ ...contact, position: 1 })
    expect(result[1]).toMatchObject({ ...TANYA_ONGKIR, position: 2 })
    expect(result[1].id).toMatch(/^[0-9a-f-]{36}$/)
    expect([CONTACT_ID, LEAD_ID, PURCHASE_ID]).not.toContain(result[1].id)
    await expect(mapping.listEventSlots(TOKO)).resolves.toEqual(result)
  })

  it("AC 1 + AC 6: urutan baru mengikuti array, ID slot tetap saat dipindah dan diedit", async () => {
    const [contact, lead, purchase] = await currentInputs()
    const result = await mapping.updateEventSlots(TOKO, {
      slots: [contact, purchase, { ...lead, is_active: false, trigger_keywords: ["harga", "pricelist"] }],
    })

    expect(result.map(({ id, position }) => [id, position])).toEqual([
      [CONTACT_ID, 1],
      [PURCHASE_ID, 2],
      [LEAD_ID, 3],
    ])
    expect(result[2]).toMatchObject({ is_active: false, trigger_keywords: ["harga", "pricelist"] })
  })

  it("string di-trim; nama custom event dan nominal yang tidak berlaku disimpan null", async () => {
    const result = await mapping.updateEventSlots(TOKO, {
      slots: [
        {
          ...TANYA_ONGKIR,
          meta_event: "Lead",
          custom_event_name: "SisaKetikan",
          trigger_keywords: ["  harga  "],
          value_mode: "none",
          fixed_value: 5000,
        },
        { ...TANYA_ONGKIR, meta_event: "Purchase", value_mode: "fixed", fixed_value: 150000, custom_event_name: " X " },
      ],
    })

    expect(result[0]).toMatchObject({ custom_event_name: null, trigger_keywords: ["harga"], fixed_value: null })
    expect(result[1]).toMatchObject({ custom_event_name: null, value_mode: "fixed", fixed_value: 150000 })
  })

  it("hanya Purchase yang wajib memilih cara mengambil nilai; event bernilai lain boleh tanpa nilai", async () => {
    const result = await mapping.updateEventSlots(TOKO, {
      slots: [{ ...TANYA_ONGKIR, meta_event: "AddToCart", custom_event_name: null }],
    })
    expect(result[0]).toMatchObject({ meta_event: "AddToCart", value_mode: "none", fixed_value: null })

    await expect(
      mapping.updateEventSlots(TOKO, { slots: [{ ...TANYA_ONGKIR, meta_event: "Purchase", custom_event_name: null }] }),
    ).rejects.toMatchObject({
      status: 422,
      details: [{ field: "slots[0].value_mode", message: "Pilih cara mengambil nilai." }],
    })
  })

  it("daftar kosong menghapus semua slot", async () => {
    await expect(mapping.updateEventSlots(TOKO, { slots: [] })).resolves.toEqual([])
    await expect(mapping.listEventSlots(TOKO)).resolves.toEqual([])
  })

  it("AC 5: satu slot tidak valid → 422 dengan field `slots[i].x`, tidak ada yang tersimpan", async () => {
    const before = await mapping.listEventSlots(TOKO)
    const [contact, lead] = await currentInputs()

    await expect(
      mapping.updateEventSlots(TOKO, {
        slots: [
          { ...contact, is_active: false },
          { ...TANYA_ONGKIR, custom_event_name: "" },
          { ...lead, meta_event: "Purchase", value_mode: "fixed", fixed_value: 0 },
        ],
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      details: [
        { field: "slots[1].custom_event_name", message: "Nama custom event wajib diisi." },
        { field: "slots[2].fixed_value", message: "Nominal harus lebih dari 0." },
      ],
    })
    await expect(mapping.listEventSlots(TOKO)).resolves.toEqual(before)
  })

  it("ID slot yang sudah dihapus atau milik proyek lain → 422 di `slots[i].id`, tidak ada yang tersimpan", async () => {
    const before = await mapping.listEventSlots(TOKO)
    const [klinikContact] = await currentInputs("klinik-gigi-senyum-sehat")

    await expect(
      mapping.updateEventSlots(TOKO, { slots: [{ ...before[0], is_active: false }, klinikContact] }),
    ).rejects.toMatchObject({
      status: 422,
      details: [{ field: "slots[1].id", message: "Slot tidak ditemukan. Muat ulang halaman lalu coba lagi." }],
    })
    await expect(mapping.listEventSlots(TOKO)).resolves.toEqual(before)
  })

  it("ID ganda dan lebih dari 20 slot ditolak", async () => {
    const [contact] = await currentInputs()
    await expect(mapping.updateEventSlots(TOKO, { slots: [contact, contact] })).rejects.toMatchObject({
      status: 422,
      details: [{ field: "slots[1].id", message: "Slot ini muncul lebih dari sekali." }],
    })
    await expect(
      mapping.updateEventSlots(TOKO, { slots: Array.from({ length: 21 }, () => TANYA_ONGKIR) }),
    ).rejects.toMatchObject({ status: 422, details: [{ field: "slots", message: "Maksimal 20 slot per proyek." }] })
  })

  it("proyek milik user lain → 404 dan tidak berubah; tanpa login → 401; tanpa token CSRF → 403", async () => {
    await expect(mapping.updateEventSlots(OTHER, { slots: [] })).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    })
    setMockSessionUserId(projects.OTHER_USER_ID)
    await expect(mapping.listEventSlots(OTHER)).resolves.toHaveLength(4)

    setMockSessionUserId(null)
    await expect(mapping.updateEventSlots(TOKO, { slots: [] })).rejects.toMatchObject({ status: 401 })

    setMockSessionUserId(projects.OTHER_USER_ID)
    setCsrfCookie(null)
    await expect(mapping.updateEventSlots(OTHER, { slots: [] })).rejects.toMatchObject({
      status: 403,
      code: "CSRF_INVALID",
    })
    await expect(mapping.listEventSlots(OTHER)).resolves.toHaveLength(4)
  })
})
