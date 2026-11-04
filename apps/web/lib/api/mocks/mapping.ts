import { DEFAULT_SLOTS } from "@/lib/mapping"
import { updateEventSlotsRequestSchema } from "@/lib/validation/mapping"

import type { EventSlot, EventSlotInput, UpdateEventSlotsRequest } from "../types"
import { mockRequireCsrf } from "./csrf"
import { currentUserIdOr401, findOwnedOr404 } from "./projects"
import { mockDelay, mockError, mockValidate } from "./utils"

// "Tabel" event_slots tiruan di localStorage, dikelompokkan per `project_id`. Proyek yang dibuat lewat
// mocks/projects.ts langsung mendapat slot default (AC 4), dan slotnya ikut terhapus bersama proyek.

type MockSlotRecord = EventSlot & { created_at: string; updated_at: string }
type MockSlotTable = Record<string, MockSlotRecord[]>

const SLOTS_KEY = "convera.mock-event-slots.v1"

/** Proyek contoh di mocks/projects.ts. */
const TOKO_ID = "0f8e2c1a-6b3d-4f5e-8a9b-7c6d5e4f3a2b"
const KLINIK_ID = "3a7b9c1d-2e4f-4a6b-8c0d-1e3f5a7b9c2d"
const WARUNG_ID = "6c8d0e2f-4a5b-4c7d-9e1f-3a5b7c9d1e3f"
const BUTIK_ID = "b2d4f6a8-0c1e-4a3b-9d5f-7e9a1c3e5b7d"

function seedSlot(slot: Omit<MockSlotRecord, "created_at" | "updated_at">, createdAt: string): MockSlotRecord {
  return { ...slot, created_at: createdAt, updated_at: createdAt }
}

/** Contoh `GET /event-slots` PRD 7.6, tanpa field Fase 2 (keyword scoring Lead dipakai sebagai keyword trigger). */
const SEED_SLOTS: MockSlotTable = {
  [TOKO_ID]: [
    seedSlot(
      {
        id: "a1f3c9d2-4b5e-4c6d-8e7f-9a0b1c2d3e4f",
        position: 1,
        is_active: true,
        meta_event: "Contact",
        custom_event_name: null,
        trigger_keywords: [],
        sender: "customer",
        value_mode: "none",
        fixed_value: null,
      },
      "2026-11-02T03:16:00Z",
    ),
    seedSlot(
      {
        id: "b2e4d0c3-5c6f-4d7e-9f80-0b1c2d3e4f5a",
        position: 2,
        is_active: true,
        meta_event: "Lead",
        custom_event_name: null,
        trigger_keywords: ["harga", "transfer"],
        sender: "customer",
        value_mode: "none",
        fixed_value: null,
      },
      "2026-11-02T03:16:00Z",
    ),
    seedSlot(
      {
        id: "e5b7a3f6-8f9c-4a0b-c2b3-3e4f5a6b7c8d",
        position: 3,
        is_active: true,
        meta_event: "Purchase",
        custom_event_name: null,
        trigger_keywords: ["total transfer"],
        sender: "cs",
        value_mode: "keyword",
        fixed_value: null,
      },
      "2026-11-02T03:16:00Z",
    ),
  ],
  [KLINIK_ID]: [
    seedSlot(
      {
        id: "4c9e1a7b-3d5f-4b2a-9c8e-6f1d3b5a7c90",
        position: 1,
        is_active: true,
        meta_event: "Contact",
        custom_event_name: null,
        trigger_keywords: [],
        sender: "customer",
        value_mode: "none",
        fixed_value: null,
      },
      "2026-10-05T04:30:00Z",
    ),
    seedSlot(
      {
        id: "5d0f2b8c-4e6a-4c3b-8d9f-7a2e4c6b8d01",
        position: 2,
        is_active: true,
        meta_event: "Schedule",
        custom_event_name: null,
        trigger_keywords: ["jadwal", "booking", "reservasi"],
        sender: "customer",
        value_mode: "none",
        fixed_value: null,
      },
      "2026-10-05T04:30:00Z",
    ),
    seedSlot(
      {
        id: "6e1a3c9d-5f7b-4d4c-9e0a-8b3f5d7c9e12",
        position: 3,
        is_active: true,
        meta_event: "CustomEvent",
        custom_event_name: "TanyaPromo",
        trigger_keywords: ["promo", "diskon"],
        sender: "customer",
        value_mode: "none",
        fixed_value: null,
      },
      "2026-10-05T04:30:00Z",
    ),
    seedSlot(
      {
        id: "7f2b4d0e-6a8c-4e5d-8f1b-9c4a6e8d0f23",
        position: 4,
        is_active: true,
        meta_event: "Purchase",
        custom_event_name: null,
        trigger_keywords: ["sudah transfer"],
        sender: "customer",
        value_mode: "fixed",
        fixed_value: 350000,
      },
      "2026-10-05T04:30:00Z",
    ),
  ],
  [WARUNG_ID]: defaultSlots("2026-09-14T01:00:00Z", [
    "8a3c5e1f-7b9d-4f6e-9a2c-0d5b7f9e1a34",
    "9b4d6f2a-8c0e-4a7f-8b3d-1e6c8a0f2b45",
    "0c5e7a3b-9d1f-4b8a-9c4e-2f7d9b1a3c56",
    "1d6f8b4c-0e2a-4c9b-8d5f-3a8e0c2b4d67",
  ]),
  [BUTIK_ID]: defaultSlots("2026-11-01T07:00:00Z", [
    "2e7a9c5d-1f3b-4dac-9e6a-4b9f1d3c5e78",
    "3f8b0d6e-2a4c-4ebd-8f7b-5c0a2e4d6f89",
    "4a9c1e7f-3b5d-4fce-9a8c-6d1b3f5e7a90",
    "5b0d2f8a-4c6e-4adf-8b9d-7e2c4a6f8b01",
  ]),
}

function defaultSlots(createdAt: string, ids: string[] = DEFAULT_SLOTS.map(() => crypto.randomUUID())) {
  return DEFAULT_SLOTS.map((slot, index) => toRecord(ids[index], index + 1, slot, createdAt, createdAt))
}

function toRecord(id: string, position: number, input: EventSlotInput, createdAt: string, updatedAt: string): MockSlotRecord {
  return {
    id,
    position,
    is_active: input.is_active,
    meta_event: input.meta_event,
    custom_event_name: input.meta_event === "CustomEvent" ? (input.custom_event_name ?? null) : null,
    trigger_keywords: input.trigger_keywords,
    sender: input.sender,
    value_mode: input.value_mode,
    fixed_value: input.value_mode === "fixed" ? (input.fixed_value ?? null) : null,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

function toSlot(record: MockSlotRecord): EventSlot {
  const { id, position, is_active, meta_event, custom_event_name, trigger_keywords, sender, value_mode, fixed_value } = record
  return { id, position, is_active, meta_event, custom_event_name, trigger_keywords, sender, value_mode, fixed_value }
}

function readTable(): MockSlotTable {
  const raw = window.localStorage.getItem(SLOTS_KEY)
  return raw ? (JSON.parse(raw) as MockSlotTable) : SEED_SLOTS
}

function writeTable(table: MockSlotTable) {
  window.localStorage.setItem(SLOTS_KEY, JSON.stringify(table))
}

function readProjectSlots(projectId: string) {
  return [...(readTable()[projectId] ?? [])].sort((a, b) => a.position - b.position)
}

/** Dipanggil mocks/projects.ts saat proyek dibuat (AC 4). */
export function insertDefaultSlots(projectId: string, createdAt: string) {
  writeTable({ ...readTable(), [projectId]: defaultSlots(createdAt) })
}

/** Dipanggil mocks/projects.ts saat proyek dihapus (ON DELETE CASCADE). */
export function deleteProjectSlots(projectId: string) {
  writeTable(Object.fromEntries(Object.entries(readTable()).filter(([id]) => id !== projectId)))
}

export async function listEventSlots(slug: string): Promise<EventSlot[]> {
  await mockDelay()
  const userId = currentUserIdOr401()
  const project = findOwnedOr404(userId, slug)
  return readProjectSlots(project.id).map(toSlot)
}

/**
 * Seperti server: seluruh slot divalidasi dulu, lalu disimpan sekaligus (AC 5). Slot dengan `id` diperbarui dan ID-nya
 * tetap (AC 6), slot tanpa `id` dibuat, slot yang tidak dikirim dihapus. `position` mengikuti urutan array.
 */
export async function updateEventSlots(slug: string, body: UpdateEventSlotsRequest): Promise<EventSlot[]> {
  await mockDelay()
  mockRequireCsrf()
  const userId = currentUserIdOr401()
  const project = findOwnedOr404(userId, slug)
  const input = mockValidate(updateEventSlotsRequestSchema, body)

  const existing = new Map(readProjectSlots(project.id).map((slot) => [slot.id, slot]))
  // Slot yang sudah dihapus (misalnya di tab lain) atau milik proyek lain tidak boleh diperbarui.
  const unknown = input.slots.flatMap((slot, index) =>
    slot.id && !existing.has(slot.id)
      ? [{ field: `slots[${index}].id`, message: "Slot tidak ditemukan. Muat ulang halaman lalu coba lagi." }]
      : [],
  )
  if (unknown.length > 0) mockError(422, "VALIDATION_ERROR", "Data tidak valid.", unknown)

  const now = new Date().toISOString()
  const saved = input.slots.map((slot, index) => {
    const previous = slot.id ? existing.get(slot.id) : undefined
    return toRecord(previous?.id ?? crypto.randomUUID(), index + 1, slot, previous?.created_at ?? now, now)
  })
  writeTable({ ...readTable(), [project.id]: saved })
  return saved.map(toSlot)
}
