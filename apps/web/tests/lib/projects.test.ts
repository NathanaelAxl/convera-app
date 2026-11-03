import { describe, expect, it } from "vitest"

import {
  FALLBACK_SLUG,
  isProjectNameConfirmed,
  slugifyProjectName,
  uniqueSlug,
  waConnectionLabel,
} from "@/lib/projects"
import { createProjectRequestSchema, deleteProjectRequestSchema } from "@/lib/validation/projects"

describe("slugifyProjectName (FR-07)", () => {
  it.each([
    // Manajemen Proyek AC 1.
    ["Toko Dummy & Co. 2026!", "toko-dummy-co-2026"],
    ["  Klinik Gigi Senyum Sehat  ", "klinik-gigi-senyum-sehat"],
    ["---Warung---Makan---", "warung-makan"],
    ["Kopi Café Déjà Vu", "kopi-cafe-deja-vu"],
    ["PT. Maju_Jaya (Persero)", "pt-maju-jaya-persero"],
    ["Toko 123", "toko-123"],
  ])("%j → %j", (name, slug) => {
    expect(slugifyProjectName(name)).toBe(slug)
  })

  it("nama tanpa huruf/angka Latin → slug cadangan", () => {
    expect(slugifyProjectName("日本料理")).toBe(FALLBACK_SLUG)
    expect(slugifyProjectName("!!!")).toBe(FALLBACK_SLUG)
  })

  it("dipotong 100 karakter tanpa `-` di akhir", () => {
    const slug = slugifyProjectName(`${"a".repeat(99)} b`)

    expect(slug).toBe("a".repeat(99))
    expect(slugifyProjectName("x".repeat(150))).toHaveLength(100)
  })
})

describe("uniqueSlug (FR-08)", () => {
  it("belum dipakai → slug dasar", () => {
    expect(uniqueSlug("toko", () => false)).toBe("toko")
  })

  it("sudah dipakai → -2, -3, dan seterusnya", () => {
    const taken = new Set(["toko", "toko-2", "toko-3"])

    expect(uniqueSlug("toko", (slug) => taken.has(slug))).toBe("toko-4")
    expect(uniqueSlug("baru", (slug) => slug === "baru")).toBe("baru-2")
  })
})

describe("isProjectNameConfirmed (AC 6)", () => {
  it("sama persis setelah trim → cocok", () => {
    expect(isProjectNameConfirmed("Toko Dummy & Co. 2026!", "Toko Dummy & Co. 2026!")).toBe(true)
    expect(isProjectNameConfirmed("Toko Dummy & Co. 2026!", "  Toko Dummy & Co. 2026!  ")).toBe(true)
  })

  it("beda huruf besar/kecil, sebagian, atau kosong → tidak cocok", () => {
    expect(isProjectNameConfirmed("Toko Dummy & Co. 2026!", "toko dummy & co. 2026!")).toBe(false)
    expect(isProjectNameConfirmed("Toko Dummy & Co. 2026!", "Toko Dummy")).toBe(false)
    expect(isProjectNameConfirmed("Toko Dummy & Co. 2026!", "   ")).toBe(false)
  })
})

describe("waConnectionLabel", () => {
  it("WABA + provider generik", () => {
    expect(waConnectionLabel({ wa_connection_type: "waba", wa_provider: "generic" })).toBe("WABA · Generik")
  })

  it("kode provider yang belum dikenal tampil apa adanya", () => {
    expect(waConnectionLabel({ wa_connection_type: "waba", wa_provider: "provider-x" })).toBe("WABA · provider-x")
  })
})

describe("validasi nama proyek (AC 2, sama dengan server)", () => {
  const nameError = (name: unknown) =>
    createProjectRequestSchema.safeParse({ name }).error?.issues.map((issue) => issue.message)

  it("kosong atau hanya spasi → wajib diisi", () => {
    expect(nameError("")).toEqual(["Nama proyek wajib diisi."])
    expect(nameError("   ")).toEqual(["Nama proyek wajib diisi."])
    expect(nameError(undefined)).toEqual(["Nama proyek wajib diisi."])
  })

  it("100 karakter lolos, 101 ditolak; spasi di tepi tidak dihitung", () => {
    expect(nameError("a".repeat(100))).toBeUndefined()
    expect(nameError(` ${"a".repeat(100)} `)).toBeUndefined()
    expect(nameError("a".repeat(101))).toEqual(["Nama proyek maksimal 100 karakter."])
  })

  it("nama di-trim sebelum dikirim", () => {
    expect(createProjectRequestSchema.parse({ name: "  Toko Kue  " })).toEqual({ name: "Toko Kue" })
  })

  it("konfirmasi hapus wajib diisi", () => {
    expect(deleteProjectRequestSchema.safeParse({ confirm_name: " " }).error?.issues[0].message).toBe(
      "Ketik nama proyek untuk konfirmasi.",
    )
  })
})
