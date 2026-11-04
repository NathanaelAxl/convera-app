import type { Page } from "@playwright/test"

import { expect, gotoReady, test } from "./fixtures"

// Fase 1 — Event Mapping (kartu di Pengaturan Proyek), dengan modul `auth`, `projects`, `settings`, dan `mapping`
// di-mock (lib/api/config.ts). Setiap uji mulai dari konteks browser baru (data contoh PRD 7.6).

const TOKO = { id: "0f8e2c1a-6b3d-4f5e-8a9b-7c6d5e4f3a2b", name: "Toko Dummy & Co. 2026!", slug: "toko-dummy-co-2026" }
/** Slot: Contact, Schedule, Custom Event TanyaPromo, Purchase nilai tetap Rp 350.000. */
const KLINIK = { slug: "klinik-gigi-senyum-sehat" }

const SLOTS_KEY = "convera.mock-event-slots.v1"
const LEAD_ID = "b2e4d0c3-5c6f-4d7e-9f80-0b1c2d3e4f5a"

const settingsUrl = (slug: string) => `/projects/${slug}/settings`

function mapping(page: Page) {
  const main = page.getByRole("main")
  const slot = (position: number) => main.getByRole("region", { name: `Slot ${position}`, exact: true })
  return {
    main,
    slot,
    slots: main.getByRole("list", { name: "Slot event, urut sesuai funnel" }).getByRole("region"),
    add: main.getByRole("button", { name: "Tambah slot" }),
    save: main.getByRole("button", { name: "Simpan", exact: true }),
    discard: main.getByRole("button", { name: "Batalkan perubahan" }),
    event: (position: number) => slot(position).getByRole("combobox", { name: "Event Meta" }),
    customName: (position: number) => slot(position).getByLabel("Nama custom event"),
    keywords: (position: number) => slot(position).getByLabel("Keyword trigger"),
    fixedValue: (position: number) => slot(position).getByLabel("Nominal (Rp)"),
    valueModes: (position: number) => slot(position).getByRole("group", { name: "Cara mengambil nilai" }),
    button: (position: number, name: string) =>
      slot(position).getByRole("button", { name: `${name} slot ${position}`, exact: true }),
  }
}

/** Nama event di badge tiap slot, urut dari atas. */
async function eventBadges(page: Page) {
  const regions = await mapping(page).slots.all()
  return Promise.all(regions.map((region) => region.locator("[data-slot=badge]").first().innerText()))
}

/** Status di bilah Simpan; berubah setelah request simpan selesai. */
function saveStatus(page: Page, text: string) {
  return page.getByRole("main").getByRole("status").filter({ hasText: text })
}

async function save(page: Page) {
  await mapping(page).save.click()
  await expect(saveStatus(page, "Belum ada perubahan.")).toBeVisible()
}

async function chooseEvent(page: Page, position: number, event: string) {
  await mapping(page).event(position).click()
  await page.getByRole("option", { name: event, exact: true }).click()
}

/** Slot tersimpan di "database" mock untuk satu proyek. */
async function storedSlots(page: Page, projectId: string) {
  return page.evaluate(
    ({ key, id }) => (JSON.parse(window.localStorage.getItem(key) ?? "{}")[id] ?? []) as { id: string; meta_event: string }[],
    { key: SLOTS_KEY, id: projectId },
  )
}

test.describe("UF-04: mengatur Event Mapping", () => {
  test("tambah slot Custom Event, isi keyword dan pengirim, validasi nama event, simpan; tetap setelah muat ulang", async ({
    page,
  }) => {
    await gotoReady(page, settingsUrl(TOKO.slug))
    const m = mapping(page)
    await expect(m.slots).toHaveCount(3)
    await expect.poll(() => eventBadges(page)).toEqual(["Contact", "Lead", "Purchase"])
    await expect(m.keywords(2)).toHaveAccessibleDescription(/Kosongkan agar semua pesan memicu slot ini/)
    await expect(m.slot(2).getByRole("listitem")).toHaveText(["harga", "transfer"])
    await expect(m.slot(3).getByRole("radio", { name: "CS" })).toHaveAttribute("aria-checked", "true")
    await expect(m.slot(3).getByRole("radio", { name: "Angka setelah keyword" })).toBeChecked()

    // Langkah 2: Tambah slot → fokus ke pilihan event Meta slot baru.
    await m.add.click()
    await expect(m.slots).toHaveCount(4)
    await expect(m.event(4)).toBeFocused()
    await expect(m.slot(4)).toContainText("Event belum dipilih")
    await expect(m.slot(4).getByRole("radio", { name: "Keduanya" })).toHaveAttribute("aria-checked", "true")
    await expect(m.main).toContainText("4 dari 20 slot.")

    // Simpan tanpa memilih event → error di slot 4, fokus ke field-nya.
    await m.save.click()
    await expect(m.event(4)).toHaveAttribute("aria-invalid", "true")
    await expect(m.event(4)).toHaveAccessibleDescription(/Pilih event Meta\./)
    await expect(m.event(4)).toBeFocused()

    // AC 2: Custom Event memunculkan field nama wajib (huruf, angka, underscore).
    await chooseEvent(page, 4, "Custom Event")
    await expect(m.event(4)).toHaveAttribute("aria-invalid", "false")
    await expect(m.customName(4)).toBeVisible()
    await m.save.click()
    await expect(m.customName(4)).toHaveAccessibleDescription(/Nama custom event wajib diisi\./)
    await expect(m.customName(4)).toBeFocused()
    await m.customName(4).fill("Tanya Ongkir")
    await expect(m.customName(4)).toHaveAccessibleDescription(
      /Nama custom event hanya boleh berisi huruf, angka, dan underscore\./,
    )
    await m.customName(4).fill("TanyaOngkir")
    await expect(m.customName(4)).toHaveAttribute("aria-invalid", "false")
    await expect(m.slot(4).locator("[data-slot=badge]").first()).toHaveText("TanyaOngkir")

    // Langkah 3: keyword trigger (Enter, koma, keyword ganda) dan pengirim.
    await m.keywords(4).fill("ongkir")
    await m.keywords(4).press("Enter")
    await m.keywords(4).pressSequentially("ongkos kirim,")
    await m.keywords(4).fill("ONGKIR")
    await m.keywords(4).press("Enter")
    await expect(m.slot(4)).toContainText('Keyword "ONGKIR" sudah ada.')
    await expect(m.slot(4).getByRole("listitem")).toHaveText(["ongkir", "ongkos kirim"])
    await m.slot(4).getByRole("radio", { name: "Customer" }).click()
    await expect(m.slot(4).getByRole("radio", { name: "Customer" })).toHaveAttribute("aria-checked", "true")

    // Langkah 4: Custom Event termasuk event bernilai dan boleh tanpa nilai.
    await expect(m.valueModes(4).getByRole("radio", { name: "Tanpa nilai" })).toBeChecked()

    // Langkah 7: tersimpan → notifikasi, form bersih.
    await save(page)
    await expect(page.getByText("Pengaturan disimpan.").first()).toBeVisible()

    await page.reload()
    await expect(m.slots).toHaveCount(4)
    await expect.poll(() => eventBadges(page)).toEqual(["Contact", "Lead", "Purchase", "TanyaOngkir"])
    await expect(m.customName(4)).toHaveValue("TanyaOngkir")
    await expect(m.slot(4).getByRole("listitem")).toHaveText(["ongkir", "ongkos kirim"])
    await expect(m.slot(4).getByRole("radio", { name: "Customer" })).toHaveAttribute("aria-checked", "true")
  })

  test("AC 3: cara mengambil nilai hanya untuk event bernilai; nilai tetap wajib nominal > 0", async ({ page }) => {
    await gotoReady(page, settingsUrl(KLINIK.slug))
    const m = mapping(page)
    await expect.poll(() => eventBadges(page)).toEqual(["Contact", "Schedule", "TanyaPromo", "Purchase"])
    await expect(m.valueModes(4).getByRole("radio", { name: "Nilai tetap" })).toBeChecked()
    await expect(m.fixedValue(4)).toHaveValue("350.000")
    // Event standar bernilai tidak punya pilihan "Tanpa nilai".
    await expect(m.valueModes(4).getByRole("radio")).toHaveCount(3)

    // Schedule bukan event bernilai.
    await expect(m.valueModes(2)).toHaveCount(0)

    // Ganti ke AddToCart → pilihan muncul, Otomatis terpilih.
    await chooseEvent(page, 2, "AddToCart")
    await expect(m.valueModes(2).getByRole("radio", { name: "Otomatis" })).toBeChecked()
    await expect(m.valueModes(2).getByRole("radio", { name: /Otomatis/ })).toHaveAccessibleDescription(
      /Mengenali 1\.250\.000, 1,25 jt, 250rb, dan 250k\./,
    )
    await m.valueModes(2).getByRole("radio", { name: "Nilai tetap" }).click()
    await m.fixedValue(2).fill("0")
    await m.save.click()
    await expect(m.fixedValue(2)).toHaveAccessibleDescription(/Nominal harus lebih dari 0\./)
    await expect(m.fixedValue(2)).toBeFocused()
    // Setelah Simpan pertama, error diperiksa ulang saat mengetik.
    await m.fixedValue(2).fill("seratus ribu")
    await expect(m.fixedValue(2)).toHaveAccessibleDescription(/Tulis nominal dengan angka/)
    await m.fixedValue(2).fill("125.000")
    await expect(m.fixedValue(2)).toHaveAttribute("aria-invalid", "false")

    // Kembali ke event tidak bernilai → pilihan nilai hilang lagi; nominal yang diketik tidak hilang.
    await chooseEvent(page, 2, "Schedule")
    await expect(m.valueModes(2)).toHaveCount(0)
    await chooseEvent(page, 2, "AddToCart")
    await m.valueModes(2).getByRole("radio", { name: "Nilai tetap" }).click()
    await expect(m.fixedValue(2)).toHaveValue("125.000")

    await save(page)
    await page.reload()
    await expect(m.fixedValue(2)).toHaveValue("125.000")
  })

  test("angka setelah keyword mewajibkan keyword trigger; pesan di field keyword", async ({ page }) => {
    await gotoReady(page, settingsUrl(KLINIK.slug))
    const m = mapping(page)

    await m.slot(4).getByRole("button", { name: 'Hapus keyword "sudah transfer"' }).click()
    await expect(m.keywords(4)).toBeFocused()
    await m.valueModes(4).getByRole("radio", { name: "Angka setelah keyword" }).click()
    await m.save.click()
    await expect(m.keywords(4)).toHaveAccessibleDescription(
      /Isi minimal satu keyword trigger untuk mengambil angka setelah keyword\./,
    )
    await expect(m.keywords(4)).toBeFocused()
    await m.keywords(4).fill("total biaya")
    await m.keywords(4).press("Enter")
    await expect(m.keywords(4)).toHaveAttribute("aria-invalid", "false")

    // Enter di input keyword yang kosong menyimpan form; kartu slot dipasang ulang, fokus tetap di field yang sama.
    await m.keywords(4).press("Enter")
    await expect(saveStatus(page, "Belum ada perubahan.")).toBeVisible()
    await expect(m.keywords(4)).toBeFocused()
    await page.reload()
    await expect(m.valueModes(4).getByRole("radio", { name: "Angka setelah keyword" })).toBeChecked()
    await expect(m.slot(4).getByRole("listitem")).toHaveText(["total biaya"])
  })
})

test.describe("AC 1: urutan, hapus, dan Batalkan perubahan", () => {
  test("tombol naik/turun dengan keyboard; fokus mengikuti slot; perubahan baru permanen setelah disimpan (AC 6: ID tetap)", async ({
    page,
  }) => {
    await gotoReady(page, settingsUrl(TOKO.slug))
    const m = mapping(page)
    await expect(m.button(1, "Naikkan")).toBeDisabled()
    await expect(m.button(3, "Turunkan")).toBeDisabled()

    await m.button(1, "Turunkan").focus()
    await page.keyboard.press("Enter")
    await expect.poll(() => eventBadges(page)).toEqual(["Lead", "Contact", "Purchase"])
    await expect(m.button(2, "Turunkan")).toBeFocused()
    await expect(m.main.getByText("Slot 1 (Contact) dipindah ke posisi 2 dari 3.")).toBeAttached()

    // Sampai di posisi terakhir: tombol Turunkan nonaktif, fokus pindah ke Naikkan.
    await page.keyboard.press("Enter")
    await expect.poll(() => eventBadges(page)).toEqual(["Lead", "Purchase", "Contact"])
    await expect(m.button(3, "Naikkan")).toBeFocused()
    await expect(saveStatus(page, "Ada perubahan yang belum disimpan.")).toBeVisible()

    // Batalkan perubahan → urutan tersimpan kembali.
    await m.discard.click()
    await expect.poll(() => eventBadges(page)).toEqual(["Contact", "Lead", "Purchase"])
    await expect(saveStatus(page, "Belum ada perubahan.")).toBeFocused()

    // Pindah + edit lalu simpan: ID slot tetap.
    await m.button(3, "Naikkan").click()
    await m.slot(3).getByRole("switch", { name: "Aktif" }).click()
    await expect(m.slot(3)).toContainText("Nonaktif")
    await save(page)
    await page.reload()
    await expect.poll(() => eventBadges(page)).toEqual(["Contact", "Purchase", "Lead"])
    await expect(m.slot(3).getByRole("switch", { name: "Aktif" })).not.toBeChecked()
    const stored = await storedSlots(page, TOKO.id)
    expect(stored.map((slot) => slot.meta_event)).toEqual(["Contact", "Purchase", "Lead"])
    expect(stored[2].id).toBe(LEAD_ID)
  })

  test("drag-and-drop dengan mouse dan dengan keyboard (handle seret)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 2000 })
    await gotoReady(page, settingsUrl(TOKO.slug))
    const m = mapping(page)
    await page.getByRole("heading", { name: "Event Mapping" }).evaluate((heading) => heading.scrollIntoView())

    // Mouse: seret handle slot 3 ke posisi slot 1.
    const handle = m.slot(3).getByRole("button", { name: "Seret untuk memindahkan slot 3" })
    const from = await handle.boundingBox()
    const target = await m.slot(1).boundingBox()
    const source = await m.slot(3).boundingBox()
    if (!from || !target || !source) throw new Error("slot tidak terlihat")
    const startX = from.x + from.width / 2
    const startY = from.y + from.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX, startY - 10, { steps: 5 })
    await page.mouse.move(startX, startY - (source.y - target.y), { steps: 20 })
    await page.mouse.up()
    await expect.poll(() => eventBadges(page)).toEqual(["Purchase", "Contact", "Lead"])

    // Keyboard: spasi mengangkat, panah bawah memindahkan, spasi meletakkan.
    const keyboardHandle = m.slot(1).getByRole("button", { name: "Seret untuk memindahkan slot 1" })
    await keyboardHandle.focus()
    await page.keyboard.press("Space")
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("Space")
    await expect.poll(() => eventBadges(page)).toEqual(["Contact", "Purchase", "Lead"])
    await expect(saveStatus(page, "Ada perubahan yang belum disimpan.")).toBeVisible()
  })

  test("hapus slot: fokus ke slot berikutnya; semua slot dihapus → EmptyState dengan Tambah slot; tersimpan kosong", async ({
    page,
  }) => {
    await gotoReady(page, settingsUrl(TOKO.slug))
    const m = mapping(page)

    await m.button(2, "Hapus").click()
    await expect.poll(() => eventBadges(page)).toEqual(["Contact", "Purchase"])
    await expect(m.slot(2).getByRole("heading", { name: "Slot 2" })).toBeFocused()
    await expect(m.main.getByText("Slot 2 (Lead) dihapus. Perubahan permanen setelah disimpan.")).toBeAttached()

    await m.button(2, "Hapus").click()
    await expect(m.slot(1).getByRole("heading", { name: "Slot 1" })).toBeFocused()
    await m.button(1, "Hapus").click()
    await expect(m.main.getByRole("heading", { name: "Belum ada slot" })).toBeVisible()
    await expect(m.add).toBeFocused()

    await save(page)
    await page.reload()
    await expect(m.main.getByRole("heading", { name: "Belum ada slot" })).toBeVisible()

    // Tambah slot dari EmptyState.
    await m.add.click()
    await expect(m.event(1)).toBeFocused()
    await chooseEvent(page, 1, "Contact")
    await save(page)
    await page.reload()
    await expect.poll(() => eventBadges(page)).toEqual(["Contact"])
  })

  test("perubahan Event Mapping yang belum disimpan ikut ditahan UnsavedChangesGuard", async ({ page }) => {
    await gotoReady(page, settingsUrl(TOKO.slug))
    const m = mapping(page)
    await m.button(1, "Turunkan").click()

    await page.getByRole("complementary").getByRole("link", { name: "Dashboard" }).click()
    const dialog = page.getByRole("alertdialog", { name: "Tinggalkan halaman tanpa menyimpan?" })
    await dialog.getByRole("button", { name: "Tinggalkan" }).click()
    await expect(page).toHaveURL(new RegExp(`/projects/${TOKO.slug}/dashboard$`))

    // Draf dibuang: kembali lewat menu menampilkan urutan tersimpan.
    await page.getByRole("complementary").getByRole("link", { name: "Pengaturan" }).click()
    await expect.poll(() => eventBadges(page)).toEqual(["Contact", "Lead", "Purchase"])
  })
})

test.describe("AC 4 dan AC 5", () => {
  test("AC 4: proyek baru mendapat slot default Contact aktif + 3 templat tidak aktif", async ({ page }) => {
    await gotoReady(page, "/projects")
    await page.getByRole("button", { name: "Proyek baru" }).click()
    await page.getByRole("dialog", { name: "Proyek baru" }).getByLabel("Nama proyek").fill("Kopi Senja Nusantara")
    await page.getByRole("button", { name: "Buat proyek" }).click()
    await expect(page).toHaveURL(/\/projects\/kopi-senja-nusantara\/settings$/)

    const m = mapping(page)
    await expect(m.slots).toHaveCount(4)
    await expect.poll(() => eventBadges(page)).toEqual(["Contact", "Lead", "InitiateCheckout", "Purchase"])
    await expect(m.slot(1).getByRole("switch", { name: "Aktif" })).toBeChecked()
    await expect(m.slot(1).getByRole("radio", { name: "Customer" })).toHaveAttribute("aria-checked", "true")
    await expect(m.slot(1).getByRole("listitem")).toHaveCount(0)
    for (const position of [2, 3, 4]) {
      await expect(m.slot(position).getByRole("switch", { name: "Aktif" })).not.toBeChecked()
      await expect(m.slot(position)).toContainText("Nonaktif")
    }
    await expect(m.valueModes(4).getByRole("radio", { name: "Otomatis" })).toBeChecked()
  })

  test("AC 5: slot yang ditolak server → error di slot itu, Event Mapping tidak tersimpan; kartu lain tetap tersimpan", async ({
    page,
  }) => {
    await gotoReady(page, settingsUrl(TOKO.slug))
    const m = mapping(page)
    // Simpan sekali agar tabel slot tersimpan di localStorage.
    await m.keywords(2).fill("pricelist")
    await m.keywords(2).press("Enter")
    await save(page)

    // Slot Lead dihapus dari tab lain.
    await page.evaluate(
      ({ key, projectId, leadId }) => {
        const table = JSON.parse(window.localStorage.getItem(key) ?? "{}")
        table[projectId] = table[projectId].filter((slot: { id: string }) => slot.id !== leadId)
        window.localStorage.setItem(key, JSON.stringify(table))
      },
      { key: SLOTS_KEY, projectId: TOKO.id, leadId: LEAD_ID },
    )

    await m.slot(1).getByRole("switch", { name: "Aktif" }).click()
    await m.keywords(2).fill("katalog")
    await m.keywords(2).press("Enter")
    await m.main.getByLabel("Nama proyek").fill("Toko Dummy Jaya")
    await m.save.click()

    await expect(m.slot(2).getByRole("alert")).toHaveText("Slot tidak ditemukan. Muat ulang halaman lalu coba lagi.")
    await expect(m.slot(2).getByRole("heading", { name: "Slot 2" })).toBeFocused()
    await expect(
      page.getByText(
        "Event Mapping belum tersimpan; perubahan lain sudah tersimpan. Periksa kembali isian yang ditandai.",
      ),
    ).toBeVisible()
    await expect(saveStatus(page, "Ada perubahan yang belum disimpan.")).toBeVisible()
    await expect(m.main).toContainText("Proyek: Toko Dummy Jaya")

    // Tidak ada slot yang berubah: Contact tetap aktif, Lead sudah hilang (dihapus di tab lain).
    await page.reload()
    await expect(m.main.getByLabel("Nama proyek").filter({ visible: true })).toHaveValue("Toko Dummy Jaya")
    await expect.poll(() => eventBadges(page)).toEqual(["Contact", "Purchase"])
    await expect(m.slot(1).getByRole("switch", { name: "Aktif" })).toBeChecked()
  })
})

test.describe("mobile", () => {
  test.use({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true })

  test("Event Mapping di 360 px: tanpa scroll horizontal, tombol slot ≥ 44 px", async ({ page }) => {
    await gotoReady(page, settingsUrl(KLINIK.slug))
    const m = mapping(page)
    await expect(m.slots).toHaveCount(4)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)

    for (const target of [
      m.slot(1).getByRole("button", { name: "Seret untuk memindahkan slot 1" }),
      m.button(1, "Turunkan"),
      m.button(1, "Hapus"),
      m.slot(1).locator("label").filter({ has: page.getByRole("switch") }),
      m.slot(3).getByRole("button", { name: 'Hapus keyword "promo"' }),
      m.keywords(3),
    ]) {
      const box = await target.boundingBox()
      expect(box?.height, await target.evaluate((element) => element.outerHTML.slice(0, 80))).toBeGreaterThanOrEqual(44)
    }

    // Tombol naik/turun juga jalan dengan sentuhan.
    await m.button(1, "Turunkan").tap()
    await expect.poll(() => eventBadges(page)).toEqual(["Schedule", "Contact", "TanyaPromo", "Purchase"])
  })
})
