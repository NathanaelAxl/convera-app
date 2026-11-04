import { describe, expect, it } from "vitest"

import type { EventSlot, EventSlotInput } from "@/lib/api/types"
import {
  allowsNoValue,
  DEFAULT_SLOTS,
  formatNominal,
  hasMoreThanTwoDecimals,
  isValueEvent,
  META_EVENTS,
  parseNominal,
  slotEventName,
} from "@/lib/mapping"
import {
  eventMappingFormSchema,
  newSlotFormValues,
  slotsToFormValues,
  toSlotFormField,
  toUpdateEventSlotsRequest,
  updateEventSlotsRequestSchema,
  type SlotFormValues,
} from "@/lib/validation/mapping"

/** Contoh `GET /event-slots` PRD 7.6 tanpa field Fase 2. */
const SLOTS: EventSlot[] = [
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
  {
    id: "7f2b4d0e-6a8c-4e5d-8f1b-9c4a6e8d0f23",
    position: 2,
    is_active: false,
    meta_event: "AddToCart",
    custom_event_name: null,
    trigger_keywords: ["paket"],
    sender: "customer",
    value_mode: "fixed",
    fixed_value: 1250000.5,
  },
]

const SLOT: SlotFormValues = {
  id: null,
  is_active: true,
  meta_event: "Lead",
  custom_event_name: "",
  trigger_keywords: [],
  sender: "both",
  value_mode: "none",
  fixed_value: "",
}

const INPUT: EventSlotInput = {
  is_active: true,
  meta_event: "Contact",
  custom_event_name: null,
  trigger_keywords: [],
  sender: "customer",
  value_mode: "none",
  fixed_value: null,
}

/** Pesan error per field dari skema, dengan nama field seperti `details` 422 dari server. */
function fieldErrors(schema: typeof eventMappingFormSchema | typeof updateEventSlotsRequestSchema, values: unknown) {
  const result = schema.safeParse(values)
  return result.success ? [] : result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }))
}

const formErrors = (...slots: Partial<SlotFormValues>[]) =>
  fieldErrors(eventMappingFormSchema, { slots: slots.map((slot) => ({ ...SLOT, ...slot })) })

const requestErrors = (...slots: Partial<EventSlotInput>[]) =>
  fieldErrors(updateEventSlotsRequestSchema, { slots: slots.map((slot) => ({ ...INPUT, ...slot })) })

describe("daftar event dan event bernilai", () => {
  it("16 event standar + Custom Event, urutan PRD 3", () => {
    expect(META_EVENTS).toEqual([
      "Contact",
      "Lead",
      "InitiateCheckout",
      "Purchase",
      "CompleteRegistration",
      "AddToCart",
      "AddToWishlist",
      "AddPaymentInfo",
      "Search",
      "ViewContent",
      "Subscribe",
      "StartTrial",
      "SubmitApplication",
      "Schedule",
      "FindLocation",
      "CustomizeProduct",
      "CustomEvent",
    ])
  })

  it("event bernilai sesuai glosarium PRD 1.6; hanya Purchase yang wajib memilih cara mengambil nilai", () => {
    expect(META_EVENTS.filter(isValueEvent)).toEqual([
      "Purchase",
      "AddToCart",
      "AddToWishlist",
      "AddPaymentInfo",
      "Subscribe",
      "StartTrial",
      "CustomEvent",
    ])
    expect(META_EVENTS.filter((event) => !allowsNoValue(event))).toEqual(["Purchase"])
  })

  it("nama event yang dikirim: nama custom event untuk Custom Event", () => {
    expect(slotEventName({ meta_event: "Lead", custom_event_name: null })).toBe("Lead")
    expect(slotEventName({ meta_event: "CustomEvent", custom_event_name: "TanyaOngkir" })).toBe("TanyaOngkir")
    expect(slotEventName({ meta_event: "CustomEvent", custom_event_name: null })).toBe("Custom Event")
  })

  it("AC 4: slot default Contact aktif untuk customer, Lead/InitiateCheckout/Purchase templat tidak aktif", () => {
    expect(DEFAULT_SLOTS.map((slot) => [slot.meta_event, slot.is_active])).toEqual([
      ["Contact", true],
      ["Lead", false],
      ["InitiateCheckout", false],
      ["Purchase", false],
    ])
    expect(DEFAULT_SLOTS[0]).toMatchObject({ sender: "customer", trigger_keywords: [], value_mode: "none" })
    expect(updateEventSlotsRequestSchema.safeParse({ slots: DEFAULT_SLOTS }).success).toBe(true)
  })
})

describe("nominal nilai tetap", () => {
  it("format Indonesia: titik ribuan, koma desimal, awalan Rp", () => {
    expect(parseNominal("150000")).toBe(150000)
    expect(parseNominal("150.000")).toBe(150000)
    expect(parseNominal("Rp 1.250.000")).toBe(1250000)
    expect(parseNominal("rp1.250.000,50")).toBe(1250000.5)
    expect(parseNominal(" 99,9 ")).toBe(99.9)
  })

  it("format yang ambigu atau bukan angka → null", () => {
    for (const input of ["", "abc", "150000.5", "1.25.000", "1,250,000", "-5000", "12a"]) {
      expect(parseNominal(input), input).toBeNull()
    }
  })

  it("format tampilan dan batas 2 desimal", () => {
    expect(formatNominal(1250000)).toBe("1.250.000")
    expect(formatNominal(1250000.5)).toBe("1.250.000,5")
    expect(hasMoreThanTwoDecimals(0.29)).toBe(false)
    expect(hasMoreThanTwoDecimals(10.125)).toBe(true)
    expect(hasMoreThanTwoDecimals(1e-7)).toBe(true)
  })
})

describe("skema form Event Mapping (sama dengan server)", () => {
  it("slot valid dan daftar kosong lolos", () => {
    expect(formErrors(SLOT)).toEqual([])
    expect(fieldErrors(eventMappingFormSchema, { slots: [] })).toEqual([])
  })

  it("slot baru wajib memilih event Meta", () => {
    expect(formErrors(newSlotFormValues())).toEqual([{ field: "slots.0.meta_event", message: "Pilih event Meta." }])
  })

  it("AC 2: nama custom event wajib, huruf/angka/underscore, maksimal 50 karakter", () => {
    const custom = { meta_event: "CustomEvent" as const }
    expect(formErrors({ ...custom, custom_event_name: "  " })).toEqual([
      { field: "slots.0.custom_event_name", message: "Nama custom event wajib diisi." },
    ])
    expect(formErrors({ ...custom, custom_event_name: "Tanya Ongkir" })).toEqual([
      {
        field: "slots.0.custom_event_name",
        message: "Nama custom event hanya boleh berisi huruf, angka, dan underscore.",
      },
    ])
    expect(formErrors({ ...custom, custom_event_name: "A".repeat(51) })).toEqual([
      { field: "slots.0.custom_event_name", message: "Nama custom event maksimal 50 karakter." },
    ])
    expect(formErrors({ ...custom, custom_event_name: " Tanya_Ongkir_2 " })).toEqual([])
    // Nama custom event diabaikan untuk event standar.
    expect(formErrors({ custom_event_name: "Tanya Ongkir" })).toEqual([])
  })

  it("keyword trigger: maksimal 20, tiap keyword 1–100 karakter, tidak boleh sama tanpa membedakan huruf besar/kecil", () => {
    expect(formErrors({ trigger_keywords: Array.from({ length: 21 }, (_, index) => `kata${index}`) })).toEqual([
      { field: "slots.0.trigger_keywords", message: "Maksimal 20 keyword per slot." },
    ])
    expect(formErrors({ trigger_keywords: ["harga", " "] })).toEqual([
      { field: "slots.0.trigger_keywords", message: "Keyword tidak boleh kosong." },
    ])
    expect(formErrors({ trigger_keywords: ["a".repeat(101)] })).toEqual([
      { field: "slots.0.trigger_keywords", message: "Keyword maksimal 100 karakter." },
    ])
    expect(formErrors({ trigger_keywords: ["Harga", "HARGA"] })).toEqual([
      { field: "slots.0.trigger_keywords", message: 'Keyword "HARGA" ditulis lebih dari sekali.' },
    ])
  })

  it("AC 3: cara mengambil nilai hanya untuk event bernilai; hanya Purchase yang wajib memilih", () => {
    expect(formErrors({ meta_event: "Lead", value_mode: "auto" })).toEqual([
      { field: "slots.0.value_mode", message: "Cara mengambil nilai hanya untuk event bernilai." },
    ])
    expect(formErrors({ meta_event: "Purchase", value_mode: "none" })).toEqual([
      { field: "slots.0.value_mode", message: "Pilih cara mengambil nilai." },
    ])
    expect(formErrors({ meta_event: "CustomEvent", custom_event_name: "TanyaOngkir", value_mode: "none" })).toEqual([])
    for (const event of ["AddToCart", "AddToWishlist", "AddPaymentInfo", "Subscribe", "StartTrial"] as const) {
      expect(formErrors({ meta_event: event, value_mode: "none" }), event).toEqual([])
    }
    expect(formErrors({ meta_event: "Purchase", value_mode: "auto" })).toEqual([])
  })

  it("angka setelah keyword mewajibkan keyword trigger", () => {
    expect(formErrors({ meta_event: "Purchase", value_mode: "keyword" })).toEqual([
      {
        field: "slots.0.trigger_keywords",
        message: "Isi minimal satu keyword trigger untuk mengambil angka setelah keyword.",
      },
    ])
    expect(formErrors({ meta_event: "Purchase", value_mode: "keyword", trigger_keywords: ["total"] })).toEqual([])
  })

  it("AC 3: nilai tetap mewajibkan nominal > 0 dengan format yang dikenali", () => {
    const fixed = { meta_event: "Purchase" as const, value_mode: "fixed" as const }
    const error = (message: string) => [{ field: "slots.0.fixed_value", message }]
    expect(formErrors({ ...fixed, fixed_value: "" })).toEqual(error("Nominal wajib diisi untuk nilai tetap."))
    expect(formErrors({ ...fixed, fixed_value: "0" })).toEqual(error("Nominal harus lebih dari 0."))
    expect(formErrors({ ...fixed, fixed_value: "abc" })).toEqual(
      error("Tulis nominal dengan angka, misalnya 150000 atau 150.000."),
    )
    expect(formErrors({ ...fixed, fixed_value: "1.000.000.000.000" })).toEqual(
      error("Nominal maksimal Rp 999.999.999.999,99."),
    )
    expect(formErrors({ ...fixed, fixed_value: "10,125" })).toEqual(error("Nominal maksimal 2 angka di belakang koma."))
    expect(formErrors({ ...fixed, fixed_value: "150.000" })).toEqual([])
    // Nominal diabaikan untuk mode lain.
    expect(formErrors({ meta_event: "Purchase", value_mode: "auto", fixed_value: "abc" })).toEqual([])
  })

  it("error dipasang di slot yang bersangkutan (AC 5), maksimal 20 slot", () => {
    expect(formErrors(SLOT, { meta_event: "CustomEvent" })).toEqual([
      { field: "slots.1.custom_event_name", message: "Nama custom event wajib diisi." },
    ])
    expect(fieldErrors(eventMappingFormSchema, { slots: Array.from({ length: 21 }, () => SLOT) })).toEqual([
      { field: "slots", message: "Maksimal 20 slot per proyek." },
    ])
  })
})

describe("skema request PUT /event-slots (dipakai mock sebagai server)", () => {
  it("contoh request PRD 7.6 lolos (tanpa field Fase 2)", () => {
    const body = {
      slots: [
        { id: "a1f3c9d2-4b5e-4c6d-8e7f-9a0b1c2d3e4f", ...INPUT },
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
    expect(fieldErrors(updateEventSlotsRequestSchema, body)).toEqual([])
  })

  it("aturan yang sama dengan form, dengan nominal berupa angka", () => {
    expect(requestErrors(INPUT, { meta_event: "CustomEvent", custom_event_name: null })).toEqual([
      { field: "slots.1.custom_event_name", message: "Nama custom event wajib diisi." },
    ])
    expect(requestErrors({ meta_event: "Purchase", value_mode: "fixed", fixed_value: 0 })).toEqual([
      { field: "slots.0.fixed_value", message: "Nominal harus lebih dari 0." },
    ])
    expect(requestErrors({ meta_event: "Purchase", value_mode: "fixed", fixed_value: null })).toEqual([
      { field: "slots.0.fixed_value", message: "Nominal wajib diisi untuk nilai tetap." },
    ])
  })

  it("nilai enum dan tipe yang salah ditolak per field", () => {
    expect(
      requestErrors({
        meta_event: "Pembelian" as EventSlotInput["meta_event"],
        sender: "admin" as EventSlotInput["sender"],
        value_mode: "manual" as EventSlotInput["value_mode"],
      }),
    ).toEqual([
      { field: "slots.0.meta_event", message: "Pilih event Meta." },
      { field: "slots.0.sender", message: "Pilih pengirim." },
      { field: "slots.0.value_mode", message: "Pilih cara mengambil nilai." },
    ])
    expect(fieldErrors(updateEventSlotsRequestSchema, {})).toEqual([
      { field: "slots", message: "Daftar slot wajib diisi." },
    ])
  })

  it("ID yang muncul dua kali ditolak; ID harus berbentuk UUID", () => {
    const id = "a1f3c9d2-4b5e-4c6d-8e7f-9a0b1c2d3e4f"
    expect(requestErrors({ id }, { id })).toEqual([
      { field: "slots.1.id", message: "Slot ini muncul lebih dari sekali." },
    ])
    expect(requestErrors({ id: "slot-1" })).toEqual([{ field: "slots.0.id", message: "ID slot tidak valid." }])
  })
})

describe("konversi form ↔ API", () => {
  it("nilai awal form urut sesuai position; nominal tampil berformat Indonesia", () => {
    const values = slotsToFormValues(SLOTS)
    expect(values.slots.map((slot) => slot.meta_event)).toEqual(["Contact", "AddToCart", "Purchase"])
    expect(values.slots[1]).toEqual({
      id: "7f2b4d0e-6a8c-4e5d-8f1b-9c4a6e8d0f23",
      is_active: false,
      meta_event: "AddToCart",
      custom_event_name: "",
      trigger_keywords: ["paket"],
      sender: "customer",
      value_mode: "fixed",
      fixed_value: "1.250.000,5",
    })
  })

  it("body PUT: slot baru tanpa id, nama custom dan nominal hanya bila berlaku, string di-trim", () => {
    const request = toUpdateEventSlotsRequest({
      slots: [
        ...slotsToFormValues(SLOTS).slots,
        {
          ...newSlotFormValues(),
          meta_event: "CustomEvent",
          custom_event_name: " TanyaOngkir ",
          trigger_keywords: [" ongkir "],
          fixed_value: "50.000",
        },
        { ...newSlotFormValues(), meta_event: "Lead", custom_event_name: "sisa ketikan" },
      ],
    })

    expect(request.slots[1]).toMatchObject({ id: SLOTS[2].id, value_mode: "fixed", fixed_value: 1250000.5 })
    expect(request.slots[3]).toEqual({
      is_active: true,
      meta_event: "CustomEvent",
      custom_event_name: "TanyaOngkir",
      trigger_keywords: ["ongkir"],
      sender: "both",
      value_mode: "none",
      fixed_value: null,
    })
    expect(request.slots[4]).not.toHaveProperty("id")
    expect(request.slots[4].custom_event_name).toBeNull()
    expect(updateEventSlotsRequestSchema.safeParse(request).success).toBe(true)
  })

  it("nama field dari server `slots[1].x` → nama field form `slots.1.x`", () => {
    expect(toSlotFormField("slots[1].custom_event_name")).toBe("slots.1.custom_event_name")
    expect(toSlotFormField("slots[12].id")).toBe("slots.12.id")
    expect(toSlotFormField("slots")).toBe("slots")
  })
})
