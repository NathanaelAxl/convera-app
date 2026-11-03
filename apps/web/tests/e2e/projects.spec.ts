import type { Page } from "@playwright/test"

import { expect, gotoReady, SIGNED_OUT, test } from "./fixtures"

// Fase 1 — Manajemen Proyek, dengan modul `auth` dan `projects` di-mock (lib/api/config.ts).
// Data mock disimpan di localStorage; setiap uji mulai dari konteks browser baru (data contoh PRD 7.4).

const TOKO = {
  name: "Toko Dummy & Co. 2026!",
  slug: "toko-dummy-co-2026",
  webhookUrl: "https://api.example.com/api/v1/webhooks/wa/k7Qm2xPz9LwR4tVb8NcY1sDf6GhJ3aEu",
}
const KLINIK = { name: "Klinik Gigi Senyum Sehat", slug: "klinik-gigi-senyum-sehat" }
const WARUNG = { name: "Warung Makan Bu Sari", slug: "warung-makan-bu-sari" }

function projectCards(page: Page) {
  return page.getByRole("list", { name: "Daftar proyek" }).getByRole("listitem")
}

function projectCard(page: Page, name: string) {
  return projectCards(page).filter({ has: page.getByRole("heading", { name, exact: true }) })
}

function switcher(page: Page) {
  return page.getByRole("complementary").getByRole("button", { name: /^Proyek: / })
}

async function openCardAction(page: Page, name: string, action: "Nonaktifkan" | "Aktifkan" | "Hapus") {
  await page.getByRole("button", { name: `Aksi proyek ${name}` }).click()
  await page.getByRole("menuitem", { name: action }).click()
}

test.describe("UF-01: dari registrasi sampai proyek pertama", () => {
  test.use({ storageState: SIGNED_OUT })

  test("daftar → Kelola Proyek kosong → Proyek baru (validasi, pratinjau slug) → Pengaturan proyek", async ({
    page,
  }) => {
    await gotoReady(page, "/register")
    await page.getByLabel("Nama lengkap").fill("Dewi Lestari")
    await page.getByLabel("Email", { exact: true }).fill("dewi@contoh.id")
    await page.getByLabel("Nomor HP").fill("081255551234")
    await page.getByLabel("Password", { exact: true }).fill("rahasia-dewi-1")
    await page.getByLabel("Konfirmasi password").fill("rahasia-dewi-1")
    await page.getByRole("button", { name: "Daftar", exact: true }).click()

    // Langkah 3: akun baru belum punya proyek.
    await expect(page).toHaveURL(/\/projects$/)
    await expect(page.getByRole("heading", { name: "Belum ada proyek" })).toBeVisible()
    await expect(switcher(page)).toHaveAccessibleName("Proyek: Belum ada proyek")

    // Langkah 4: isi nama, lihat pratinjau slug. AC 2: kosong dan > 100 karakter ditolak di client.
    await page.getByRole("button", { name: "Buat proyek pertama" }).click()
    const dialog = page.getByRole("dialog", { name: "Proyek baru" })
    const name = dialog.getByLabel("Nama proyek")
    const submit = dialog.getByRole("button", { name: "Buat proyek" })

    await submit.click()
    await expect(name).toHaveAttribute("aria-invalid", "true")
    await expect(name).toHaveAccessibleDescription(/Nama proyek wajib diisi\./)

    await name.fill("a".repeat(101))
    await submit.click()
    await expect(name).toHaveAccessibleDescription(/Nama proyek maksimal 100 karakter\./)

    // AC 1: pratinjau slug tampil sebelum disimpan.
    await name.fill(TOKO.name)
    await expect(dialog.getByText(TOKO.slug, { exact: true })).toBeVisible()
    await expect(name).toHaveAccessibleDescription(new RegExp(`Pratinjau slug: ${TOKO.slug}`))

    // Langkah 5 + AC 3, AC 4: slug sudah dipakai (proyek contoh milik Rina) → -2; diarahkan ke Pengaturan.
    await submit.click()
    // Toast dicek dulu: tampil 4 detik, bisa lebih singkat dari kompilasi halaman pertama di dev server.
    await expect(page.getByText(`Proyek “${TOKO.name}” dibuat dengan slug ${TOKO.slug}-2.`)).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/projects/${TOKO.slug}-2/settings$`))
    await expect(page.getByRole("heading", { name: "Pengaturan Proyek" })).toBeVisible()
    await expect(switcher(page)).toHaveAccessibleName(`Proyek: ${TOKO.name}`)

    await page.getByRole("link", { name: "Kelola Proyek", exact: true }).click()
    await expect(projectCards(page)).toHaveCount(1)
    await expect(projectCard(page, TOKO.name)).toContainText(`/${TOKO.slug}-2`)
    await expect(projectCard(page, TOKO.name)).toContainText("Umum")
  })
})

test.describe("Kelola Proyek", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] })

  test("kartu: nama, slug, status, kategori, provider, Webhook URL (salin), tautan; tanpa info langganan (Fase 3)", async ({
    page,
  }) => {
    await gotoReady(page, "/projects")
    await expect(projectCards(page).getByRole("heading")).toHaveText([TOKO.name, KLINIK.name, WARUNG.name])

    const toko = projectCard(page, TOKO.name)
    await expect(toko).toContainText(`/${TOKO.slug}`)
    await expect(toko).toContainText("Aktif")
    await expect(toko).toContainText("Kategori: E-commerce")
    await expect(toko).toContainText("Koneksi WhatsApp: WABA · Generik")
    await expect(toko.getByLabel("Webhook URL")).toHaveValue(TOKO.webhookUrl)
    await expect(toko.getByRole("link", { name: `Pengaturan ${TOKO.name}` })).toHaveAttribute(
      "href",
      `/projects/${TOKO.slug}/settings`,
    )
    await expect(toko.getByRole("link", { name: `Event Log ${TOKO.name}` })).toHaveAttribute(
      "href",
      `/projects/${TOKO.slug}/events`,
    )

    await toko.getByRole("button", { name: "Salin" }).click()
    await expect(page.getByText("Tersalin")).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(TOKO.webhookUrl)

    const warung = projectCard(page, WARUNG.name)
    await expect(warung).toContainText("Nonaktif")
    await expect(warung).toContainText("Kategori: F&B")

    await expect(page.getByRole("main")).not.toContainText(/trial|langganan/i)

    await toko.getByRole("link", { name: `Pengaturan ${TOKO.name}` }).click()
    await expect(page).toHaveURL(new RegExp(`/projects/${TOKO.slug}/settings$`))
  })

  test("UF-08 nonaktifkan: Batal tidak mengubah apa pun; konfirmasi mengubah status, sidebar, dan tersimpan; aktifkan kembali", async ({
    page,
  }) => {
    await gotoReady(page, "/projects")
    const toko = projectCard(page, TOKO.name)
    const actions = page.getByRole("button", { name: `Aksi proyek ${TOKO.name}` })

    await openCardAction(page, TOKO.name, "Nonaktifkan")
    const dialog = page.getByRole("alertdialog", { name: "Nonaktifkan proyek?" })
    await expect(dialog).toContainText("tidak akan diproses")
    await dialog.getByRole("button", { name: "Batal" }).click()
    await expect(dialog).toBeHidden()
    await expect(actions).toBeFocused()
    await expect(toko).toContainText("Aktif")

    await openCardAction(page, TOKO.name, "Nonaktifkan")
    await dialog.getByRole("button", { name: "Nonaktifkan" }).click()
    await expect(page.getByText(`Proyek “${TOKO.name}” dinonaktifkan.`)).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect(toko).toContainText("Nonaktif")
    await expect(actions).toBeFocused()

    await switcher(page).click()
    await expect(page.getByRole("menuitemradio", { name: /^Toko Dummy & Co\. 2026!\s*, nonaktif$/ })).toBeVisible()
    await page.keyboard.press("Escape")

    await page.reload()
    await expect(projectCard(page, TOKO.name)).toContainText("Nonaktif")

    await openCardAction(page, TOKO.name, "Aktifkan")
    const activate = page.getByRole("alertdialog", { name: "Aktifkan kembali proyek?" })
    await activate.getByRole("button", { name: "Aktifkan" }).click()
    await expect(page.getByText(`Proyek “${TOKO.name}” diaktifkan kembali.`)).toBeVisible()
    await expect(projectCard(page, TOKO.name).getByText("Aktif", { exact: true })).toBeVisible()
  })

  test("UF-08 hapus: wajib ketik ulang nama; cocok + Enter → terhapus, tetap di Kelola Proyek; slug-nya jadi 404", async ({
    page,
  }) => {
    await gotoReady(page, "/projects")
    await openCardAction(page, KLINIK.name, "Hapus")
    const dialog = page.getByRole("alertdialog", { name: "Hapus proyek permanen?" })
    const confirm = dialog.getByLabel(/untuk konfirmasi/)
    const remove = dialog.getByRole("button", { name: "Hapus permanen" })

    await expect(dialog).toContainText(KLINIK.name)
    await expect(remove).toBeDisabled()

    await confirm.fill(KLINIK.name.toLowerCase())
    await expect(remove).toBeDisabled()
    await confirm.press("Enter")
    await expect(dialog).toBeVisible()

    await confirm.fill(KLINIK.name)
    await expect(remove).toBeEnabled()
    await confirm.press("Enter")
    await expect(page.getByText(`Proyek “${KLINIK.name}” dan seluruh datanya sudah dihapus.`)).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/projects$/)
    await expect(projectCards(page).getByRole("heading")).toHaveText([TOKO.name, WARUNG.name])
    await expect(page.getByRole("main")).toBeFocused()

    await switcher(page).click()
    await expect(page.getByRole("menuitemradio")).toHaveCount(2)
    await page.keyboard.press("Escape")

    await gotoReady(page, `/projects/${KLINIK.slug}/dashboard`)
    await expect(page.getByRole("heading", { name: "Halaman tidak ditemukan" })).toBeVisible()
  })

  test("AC 7: slug milik user lain atau yang tidak ada → 404 di URL yang sama", async ({ page }) => {
    for (const path of ["/projects/butik-kebaya-ayu/dashboard", "/projects/tidak-ada/settings"]) {
      await gotoReady(page, path)
      await expect(page.getByRole("heading", { name: "Halaman tidak ditemukan" })).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`${path}$`))
    }

    await gotoReady(page, `/projects/${TOKO.slug}/settings`)
    await expect(page.getByRole("heading", { name: "Pengaturan Proyek" })).toBeVisible()
    await expect(page.getByRole("main")).toContainText(`Proyek: ${TOKO.name}`)
  })

  test("Proyek baru dari sidebar dengan keyboard: Escape mengembalikan fokus, Enter membuat proyek", async ({ page }) => {
    await gotoReady(page, `/projects/${TOKO.slug}/dashboard`)
    const trigger = switcher(page)
    const dialog = page.getByRole("dialog", { name: "Proyek baru" })

    async function openFromMenu() {
      await trigger.focus()
      await page.keyboard.press("Enter")
      await expect(page.getByRole("menu")).toBeVisible()
      await page.keyboard.press("End")
      await expect(page.getByRole("menuitem", { name: "Proyek baru" })).toBeFocused()
      await page.keyboard.press("Enter")
      await expect(dialog.getByLabel("Nama proyek")).toBeFocused()
    }

    await openFromMenu()
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()

    await openFromMenu()
    await page.keyboard.type("Klinik Gigi Senyum Sehat")
    await expect(dialog.getByText(KLINIK.slug, { exact: true })).toBeVisible()
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(new RegExp(`/projects/${KLINIK.slug}-2/settings$`))
    await expect(trigger).toHaveAccessibleName(`Proyek: ${KLINIK.name}`)

    await trigger.click()
    await expect(page.getByRole("menuitemradio")).toHaveCount(4)
  })
})

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

  test("Kelola Proyek di 375 px: target sentuh ≥ 44 px, tanpa scroll horizontal; buat proyek dari menu Sheet", async ({
    page,
  }) => {
    await gotoReady(page, "/projects")
    await expect(projectCards(page)).toHaveCount(3)

    const heights = await page.evaluate(() =>
      [...document.querySelectorAll("main input, main button, main a")].map((element) =>
        Math.round(element.getBoundingClientRect().height),
      ),
    )
    expect(heights.length).toBeGreaterThan(0)
    expect(heights.filter((height) => height < 44)).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)

    await page.getByRole("button", { name: "Buka menu" }).click()
    const menu = page.getByRole("dialog", { name: "Menu" })
    await menu.getByRole("button", { name: /^Proyek: / }).click()
    await page.getByRole("menuitem", { name: "Proyek baru" }).click()
    const dialog = page.getByRole("dialog", { name: "Proyek baru" })
    await dialog.getByLabel("Nama proyek").fill("Apotek Sehat Sentosa")
    await dialog.getByRole("button", { name: "Buat proyek" }).click()

    await expect(page).toHaveURL(/\/projects\/apotek-sehat-sentosa\/settings$/)
    await expect(menu).toBeHidden()
    await expect(dialog).toBeHidden()
  })
})
