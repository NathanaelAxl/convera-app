import { describe, expect, it } from "vitest"

import type { ProjectSettings } from "@/lib/api/types"
import { BUSINESS_CATEGORIES, maskedSuffix, testConnectionBlocker, WA_PROVIDERS } from "@/lib/settings"
import {
  projectSettingsFormSchema,
  settingsToFormValues,
  toUpdateSettingsRequest,
  updateProjectSettingsRequestSchema,
  type ProjectSettingsFormValues,
} from "@/lib/validation/settings"

const SETTINGS: ProjectSettings = {
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
}

const VALID: ProjectSettingsFormValues = settingsToFormValues(SETTINGS)

/** Salinan objek tanpa key tertentu, untuk menguji field yang tidak dikirim. */
function omit<T extends object>(value: T, ...keys: (keyof T)[]) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key as keyof T)))
}

/** Pesan error per field dari skema, seperti `details` 422 dari server. */
function fieldErrors(schema: typeof projectSettingsFormSchema | typeof updateProjectSettingsRequestSchema, values: unknown) {
  const result = schema.safeParse(values)
  return result.success ? [] : result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }))
}

describe("daftar pilihan", () => {
  it("9 kategori bisnis (FR-19) dan provider dari enum WaProvider (Pertanyaan Terbuka 2: hanya generik)", () => {
    expect(BUSINESS_CATEGORIES).toEqual([
      "general",
      "health",
      "ecommerce",
      "education",
      "property",
      "fnb",
      "service",
      "travel",
      "finance",
    ])
    expect(WA_PROVIDERS).toEqual(["generic"])
  })
})

describe("projectSettingsFormSchema (aturan sama dengan server)", () => {
  it("nilai dari GET /settings lolos; string di-trim", () => {
    const result = projectSettingsFormSchema.parse({ ...VALID, name: "  Toko Baru  ", pixel_id: " 1234567890 " })
    expect(result).toMatchObject({ name: "Toko Baru", pixel_id: "1234567890" })
  })

  it("field opsional boleh kosong: Pixel ID, Access Token, Test Event Code, Webhook Secret", () => {
    const empty = { ...VALID, pixel_id: "", capi_access_token: "", test_event_code: "", webhook_secret: "" }
    expect(fieldErrors(projectSettingsFormSchema, empty)).toEqual([])
  })

  it.each([
    ["12345abc90", "Pixel ID hanya boleh berisi angka."],
    ["123-456-7890", "Pixel ID hanya boleh berisi angka."],
    ["１２３４５６７８９０", "Pixel ID hanya boleh berisi angka."],
    ["123456789", "Pixel ID harus 10 sampai 20 digit."],
    ["1".repeat(21), "Pixel ID harus 10 sampai 20 digit."],
  ])("AC 1: Pixel ID %j → %j (satu pesan per field)", (pixel_id, message) => {
    expect(fieldErrors(projectSettingsFormSchema, { ...VALID, pixel_id })).toEqual([{ field: "pixel_id", message }])
  })

  it("Pixel ID tepat 10 dan 20 digit lolos (default Pertanyaan Terbuka 3)", () => {
    expect(fieldErrors(projectSettingsFormSchema, { ...VALID, pixel_id: "1".repeat(10) })).toEqual([])
    expect(fieldErrors(projectSettingsFormSchema, { ...VALID, pixel_id: "1".repeat(20) })).toEqual([])
  })

  it.each([
    ["name", "", "Nama proyek wajib diisi."],
    ["name", "a".repeat(101), "Nama proyek maksimal 100 karakter."],
    ["business_category", "kuliner", "Pilih salah satu kategori bisnis."],
    ["capi_access_token", "EAAG abc", "Access Token tidak boleh mengandung spasi."],
    ["capi_access_token", "E".repeat(1001), "Access Token maksimal 1000 karakter."],
    ["test_event_code", "TEST-482", "Test Event Code hanya boleh berisi huruf dan angka."],
    ["test_event_code", "T".repeat(51), "Test Event Code maksimal 50 karakter."],
    ["wa_connection_type", "qr", "Koneksi lewat scan QR belum tersedia."],
    ["wa_connection_type", "sms", "Jenis koneksi tidak dikenal."],
    ["wa_provider", "qontak", "Provider tidak dikenal."],
    ["webhook_secret", "pendek-sekali", "Webhook Secret minimal 16 karakter."],
    ["webhook_secret", "s".repeat(257), "Webhook Secret maksimal 256 karakter."],
    ["webhook_secret", "rahasia dengan spasi", "Webhook Secret tidak boleh mengandung spasi."],
  ])("%s = %j → %j", (field, value, message) => {
    expect(fieldErrors(projectSettingsFormSchema, { ...VALID, [field]: value })).toEqual([{ field, message }])
  })
})

describe("updateProjectSettingsRequestSchema (body PUT /settings)", () => {
  const REQUEST = toUpdateSettingsRequest(projectSettingsFormSchema.parse(VALID))

  it("token dan secret boleh dihilangkan atau null; Pixel ID dan Test Event Code boleh null", () => {
    const withoutSecrets = omit(REQUEST, "capi_access_token", "webhook_secret")
    expect(fieldErrors(updateProjectSettingsRequestSchema, withoutSecrets)).toEqual([])
    expect(
      fieldErrors(updateProjectSettingsRequestSchema, { ...REQUEST, pixel_id: null, test_event_code: null }),
    ).toEqual([])
  })

  it("Pixel ID dan Test Event Code wajib dikirim (boleh null)", () => {
    const rest = omit(REQUEST, "pixel_id", "test_event_code")
    expect(fieldErrors(updateProjectSettingsRequestSchema, rest).map((detail) => detail.field)).toEqual([
      "pixel_id",
      "test_event_code",
    ])
  })

  it("aturan field sama dengan form", () => {
    expect(fieldErrors(updateProjectSettingsRequestSchema, { ...REQUEST, pixel_id: "abc" })).toEqual([
      { field: "pixel_id", message: "Pixel ID hanya boleh berisi angka." },
    ])
    expect(fieldErrors(updateProjectSettingsRequestSchema, { ...REQUEST, wa_connection_type: "qr" })).toEqual([
      { field: "wa_connection_type", message: "Koneksi lewat scan QR belum tersedia." },
    ])
  })
})

describe("settingsToFormValues / toUpdateSettingsRequest", () => {
  it("field token dan secret selalu kosong di form; null menjadi string kosong", () => {
    expect(settingsToFormValues({ ...SETTINGS, pixel_id: null, test_event_code: null })).toEqual({
      name: SETTINGS.name,
      business_category: "ecommerce",
      pixel_id: "",
      capi_access_token: "",
      test_event_code: "",
      wa_connection_type: "waba",
      wa_provider: "generic",
      webhook_secret: "",
    })
  })

  it("AC 2: token dan secret yang dibiarkan kosong dikirim null (nilai lama tetap); Test Event Code kosong → null", () => {
    const values = projectSettingsFormSchema.parse({ ...VALID, test_event_code: "  " })
    expect(toUpdateSettingsRequest(values)).toEqual({
      name: SETTINGS.name,
      business_category: "ecommerce",
      pixel_id: "123456789012345",
      capi_access_token: null,
      test_event_code: null,
      wa_connection_type: "waba",
      wa_provider: "generic",
      webhook_secret: null,
    })
  })

  it("token dan secret baru dikirim apa adanya (sudah di-trim)", () => {
    const values = projectSettingsFormSchema.parse({
      ...VALID,
      capi_access_token: " EAAGtokenbaru123 ",
      webhook_secret: "secret-dari-provider-123",
    })
    expect(toUpdateSettingsRequest(values)).toMatchObject({
      capi_access_token: "EAAGtokenbaru123",
      webhook_secret: "secret-dari-provider-123",
    })
  })
})

describe("maskedSuffix", () => {
  it("bagian token yang terlihat, untuk dibacakan screen reader", () => {
    expect(maskedSuffix("••••••••Zx9a")).toBe("Zx9a")
    expect(maskedSuffix("••••••••")).toBe("")
  })
})

describe("testConnectionBlocker (AC 6)", () => {
  it("bisa dipakai bila Pixel ID dan token tersimpan dan isian Meta CAPI tidak sedang diubah", () => {
    expect(testConnectionBlocker(SETTINGS, false)).toBeNull()
  })

  it("Pixel ID atau token belum tersimpan → keterangan menyebut yang kurang", () => {
    expect(testConnectionBlocker({ pixel_id: null, has_capi_access_token: true }, false)).toBe(
      "Isi dan simpan Pixel ID dulu untuk menguji koneksi.",
    )
    expect(testConnectionBlocker({ pixel_id: "123456789012345", has_capi_access_token: false }, false)).toBe(
      "Isi dan simpan Access Token dulu untuk menguji koneksi.",
    )
    expect(testConnectionBlocker({ pixel_id: null, has_capi_access_token: false }, true)).toBe(
      "Isi dan simpan Pixel ID dan Access Token dulu untuk menguji koneksi.",
    )
  })

  it("isian Meta CAPI belum disimpan → minta simpan dulu", () => {
    expect(testConnectionBlocker(SETTINGS, true)).toBe(
      "Simpan perubahan Meta CAPI dulu. Uji koneksi memakai pengaturan yang sudah tersimpan.",
    )
  })
})
