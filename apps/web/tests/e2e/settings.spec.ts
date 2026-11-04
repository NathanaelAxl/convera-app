import type { Page } from "@playwright/test"

import { expect, gotoReady, test } from "./fixtures"

// Fase 1 — Konfigurasi Meta CAPI & Koneksi WhatsApp, dengan modul `auth`, `projects`, dan `settings` di-mock
// (lib/api/config.ts). Setiap uji mulai dari konteks browser baru (data contoh PRD 7.4/7.5).

const TOKO = {
  name: "Toko Dummy & Co. 2026!",
  slug: "toko-dummy-co-2026",
  webhookUrl: "https://api.example.com/api/v1/webhooks/wa/k7Qm2xPz9LwR4tVb8NcY1sDf6GhJ3aEu",
}
/** Belum ada Pixel ID, token, maupun secret; langganannya habis (terkunci). */
const WARUNG = { name: "Warung Makan Bu Sari", slug: "warung-makan-bu-sari" }

const settingsUrl = (slug: string) => `/projects/${slug}/settings`

function fields(page: Page) {
  const main = page.getByRole("main")
  // Next.js menyimpan halaman sebelumnya di DOM (tersembunyi, `<Activity>`): getByLabel dibatasi ke yang terlihat.
  const field = (label: string, exact = false) => main.getByLabel(label, { exact }).filter({ visible: true })
  return {
    name: field("Nama proyek"),
    category: main.getByRole("combobox", { name: "Kategori bisnis" }),
    pixelId: field("Pixel ID"),
    token: field("Access Token", true),
    testEventCode: field("Test Event Code"),
    webhookUrl: field("Webhook URL"),
    webhookSecret: field("Webhook Secret", true),
    save: main.getByRole("button", { name: "Simpan", exact: true }),
    discard: main.getByRole("button", { name: "Batalkan perubahan" }),
    test: main.getByRole("button", { name: "Uji koneksi" }),
    generateSecret: main.getByRole("button", { name: "Buat secret baru" }),
  }
}

/** Status di bilah Simpan; berubah setelah request simpan selesai. */
function saveStatus(page: Page, text: string) {
  return page.getByRole("main").getByRole("status").filter({ hasText: text })
}

async function save(page: Page) {
  await fields(page).save.click()
  await expect(saveStatus(page, "Belum ada perubahan.")).toBeVisible()
}

/** Buat proyek lewat dialog "Proyek baru"; sistem langsung membuka Pengaturan proyek tersebut. */
async function createProject(page: Page, name: string, slug: string) {
  await gotoReady(page, "/projects")
  await page.getByRole("button", { name: "Proyek baru" }).click()
  await page.getByRole("dialog", { name: "Proyek baru" }).getByLabel("Nama proyek").fill(name)
  await page.getByRole("button", { name: "Buat proyek" }).click()
  await expect(page).toHaveURL(new RegExp(`${settingsUrl(slug)}$`))
}

// UF-01 dipecah menjadi tiga uji (langkah 6 + 8, langkah 7, langkah 9) agar masing-masing jauh dari batas waktu 60 detik
// saat seluruh suite berjalan paralel. Isi pemeriksaannya sama dengan uji gabungan sebelumnya.
test.describe("UF-01 langkah 6–9: proyek baru sampai uji koneksi", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] })

  test("langkah 6 + 8: isi kategori dan Meta CAPI (validasi Pixel ID), simpan; tetap setelah muat ulang", async ({
    page,
  }) => {
    await createProject(page, "Kopi Senja Nusantara", "kopi-senja-nusantara")

    const f = fields(page)
    await expect(f.name).toHaveValue("Kopi Senja Nusantara")
    await expect(f.category).toHaveText("Umum")
    await expect(f.token).toHaveAccessibleDescription(/Belum ada/)
    await expect(f.webhookSecret).toHaveAccessibleDescription(/Belum ada.*Webhook ditolak sampai secret diisi/)
    await expect(f.save).toBeDisabled()

    // AC 6: Pixel ID dan token belum tersimpan → tombol nonaktif dengan keterangan.
    await expect(f.test).toBeDisabled()
    await expect(f.test).toHaveAccessibleDescription("Isi dan simpan Pixel ID dan Access Token dulu untuk menguji koneksi.")

    // Langkah 6: kategori bisnis.
    await f.category.click()
    await page.getByRole("option", { name: "F&B" }).click()
    await expect(f.category).toHaveText("F&B")
    await expect(saveStatus(page, "Ada perubahan yang belum disimpan.")).toBeVisible()

    // AC 1: Pixel ID bukan angka atau panjangnya di luar batas → pesan di bawah field, fokus ke field.
    await f.pixelId.fill("12345abc")
    await f.save.click()
    await expect(f.pixelId).toHaveAttribute("aria-invalid", "true")
    await expect(f.pixelId).toHaveAccessibleDescription(/Pixel ID hanya boleh berisi angka\./)
    await expect(f.pixelId).toBeFocused()
    await f.pixelId.fill("123456789")
    await f.save.click()
    await expect(f.pixelId).toHaveAccessibleDescription(/Pixel ID harus 10 sampai 20 digit\./)

    await f.pixelId.fill("731204958162734")
    await f.token.fill("tokenDariHalamanLain1234")
    await f.testEventCode.fill("TEST55120")

    // Langkah 8: semua kartu disimpan sekaligus.
    await save(page)
    await expect(page.getByText("Pengaturan disimpan.").first()).toBeVisible()
    await expect(f.token).toHaveValue("")
    await expect(f.token).toHaveAccessibleDescription(/Tersimpan berakhiran 1234\./)
    await expect(f.test).toHaveAccessibleDescription("Mengirim satu event uji ke Meta dengan Test Event Code TEST55120.")

    // Tersimpan: tetap ada setelah muat ulang, dan kategori baru tampil di Kelola Proyek.
    await page.reload()
    await expect(f.category).toHaveText("F&B")
    await expect(f.pixelId).toHaveValue("731204958162734")
    await expect(f.testEventCode).toHaveValue("TEST55120")
    await gotoReady(page, "/projects")
    const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Kopi Senja Nusantara" }) })
    await expect(card).toContainText("Kategori: F&B")
  })

  test("langkah 7: salin Webhook URL; secret buatan sistem hanya tampil sekali di dialog", async ({ page }) => {
    await createProject(page, "Kopi Senja Sentosa", "kopi-senja-sentosa")

    const f = fields(page)
    await expect(f.webhookSecret).toHaveAccessibleDescription(/Belum ada.*Webhook ditolak sampai secret diisi/)

    // AC 3: Webhook URL disalin satu klik, notifikasi "Tersalin".
    const webhookUrl = await f.webhookUrl.inputValue()
    expect(webhookUrl).toMatch(/^https:\/\/api\.example\.com\/api\/v1\/webhooks\/wa\/[A-Za-z0-9]{32}$/)
    await page.getByRole("main").getByRole("button", { name: "Salin" }).click()
    await expect(page.getByText("Tersalin")).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(webhookUrl)

    // AC 5: secret buatan sistem hanya tampil sekali di dialog dengan tombol salin.
    await f.generateSecret.click()
    const dialog = page.getByRole("dialog", { name: "Webhook Secret baru" })
    const secret = await dialog.getByLabel("Webhook Secret").inputValue()
    expect(secret).toMatch(/^whsec_[A-Za-z0-9]{32}$/)
    await dialog.getByRole("button", { name: "Salin", exact: true }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(secret)
    await dialog.getByRole("button", { name: "Sudah saya salin" }).click()
    await expect(dialog).toBeHidden()
    await expect(f.generateSecret).toBeFocused()
    await expect(f.webhookSecret).toHaveAccessibleDescription(/^Tersimpan/)
    expect(await pageContains(page, secret)).toBe(false)
  })

  test("langkah 9: uji koneksi ditolak Meta → perbaiki token (Enter menyimpan) → diterima", async ({ page }) => {
    await createProject(page, "Kedai Kopi Lereng", "kedai-kopi-lereng")

    const f = fields(page)
    await f.pixelId.fill("731204958162734")
    await f.token.fill("tokenDariHalamanLain1234")
    await f.testEventCode.fill("TEST55120")
    await save(page)
    await expect(f.token).toHaveAccessibleDescription(/Tersimpan berakhiran 1234\./)

    // Meta menolak token → pesan dari Meta.
    await expect(f.test).toHaveAccessibleDescription("Mengirim satu event uji ke Meta dengan Test Event Code TEST55120.")
    await f.test.click()
    const rejected = page.getByRole("alert").filter({ hasText: "Meta menolak event uji" })
    await expect(rejected).toContainText("Invalid OAuth access token.")
    await expect(rejected).toContainText(/fbtrace_id\): [A-Za-z0-9]{11}/)
    await expect(f.test).toBeFocused()

    // Perbaiki token: selama belum disimpan, uji koneksi menunggu. Enter di field menyimpan form.
    await f.token.fill("EAAGm0PX4ZCpsBAOKopiSenja2026")
    await expect(f.test).toBeDisabled()
    await expect(f.test).toHaveAccessibleDescription(/Simpan perubahan Meta CAPI dulu\./)
    await f.token.press("Enter")
    await expect(f.token).toHaveAccessibleDescription(/berakhiran 2026\./)
    await expect(rejected).toBeHidden()

    await f.test.click()
    const accepted = page.getByRole("alert").filter({ hasText: "Meta menerima 1 event uji" })
    await expect(accepted).toContainText("Dikirim dengan Test Event Code TEST55120.")

    // Token baru tetap tersimpan setelah muat ulang.
    await page.reload()
    await expect(f.token).toHaveAccessibleDescription(/berakhiran 2026\./)
  })
})

/** Nilai rahasia tidak boleh ada di teks halaman maupun di isi input mana pun. */
function pageContains(page: Page, value: string) {
  return page.evaluate(
    (needle) =>
      document.body.innerText.includes(needle) ||
      [...document.querySelectorAll("input, textarea")].some((element) =>
        (element as HTMLInputElement).value.includes(needle),
      ),
    value,
  )
}

test.describe("Pengaturan proyek yang sudah dikonfigurasi", () => {
  test("AC 2: token hanya tersamar; field token kosong tidak menghapus token; Test Event Code dikosongkan saat live", async ({
    page,
  }) => {
    await gotoReady(page, settingsUrl(TOKO.slug))
    const f = fields(page)
    const main = page.getByRole("main")

    await expect(f.name).toHaveValue(TOKO.name)
    await expect(f.category).toHaveText("E-commerce")
    await expect(f.pixelId).toHaveValue("123456789012345")
    await expect(f.token).toHaveValue("")
    await expect(main).toContainText("••••••••Zx9a")
    await expect(f.token).toHaveAccessibleDescription(/^Tersimpan berakhiran Zx9a\. Biarkan kosong/)
    await expect(f.testEventCode).toHaveValue("TEST48213")
    await expect(f.webhookUrl).toHaveValue(TOKO.webhookUrl)
    expect(await pageContains(page, "EAAG")).toBe(false)

    // Tombol tampil/sembunyi rahasia: aria-pressed.
    const toggle = main.getByRole("button", { name: "Tampilkan nilai" }).first()
    await expect(toggle).toHaveAttribute("aria-pressed", "false")
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-pressed", "true")
    await expect(f.token).toHaveAttribute("type", "text")

    // UF-01 langkah 11: kosongkan Test Event Code; token yang dibiarkan kosong tetap tersimpan.
    await f.testEventCode.fill("")
    await save(page)
    await expect(f.token).toHaveAccessibleDescription(/berakhiran Zx9a/)
    await expect(f.test).toHaveAccessibleDescription(/Test Event Code kosong/)
    await f.test.click()
    await expect(page.getByRole("alert").filter({ hasText: "Meta menerima 1 event uji" })).toContainText(
      "Dikirim tanpa Test Event Code",
    )

    // Token baru menggantikan yang lama.
    await f.token.fill("EAAGtokenBaruDariMetaQ7k2")
    await save(page)
    await expect(main).toContainText("••••••••Q7k2")
    await page.reload()
    await expect(f.token).toHaveAccessibleDescription(/berakhiran Q7k2/)
    await expect(f.testEventCode).toHaveValue("")
  })

  test("FR-10: ganti nama → chip proyek dan sidebar ikut berubah; nama kosong ditolak; Batalkan perubahan", async ({
    page,
  }) => {
    await gotoReady(page, settingsUrl(TOKO.slug))
    const f = fields(page)
    const switcher = page.getByRole("complementary").getByRole("button", { name: /^Proyek: / })

    await f.name.fill("  ")
    await f.save.click()
    await expect(f.name).toHaveAccessibleDescription(/Nama proyek wajib diisi\./)
    await expect(f.name).toBeFocused()

    // Batalkan perubahan: kembali ke nilai tersimpan, fokus pindah ke status (tombolnya hilang).
    await f.discard.click()
    await expect(f.name).toHaveValue(TOKO.name)
    await expect(f.name).toHaveAttribute("aria-invalid", "false")
    await expect(saveStatus(page, "Belum ada perubahan.")).toBeFocused()
    await expect(f.discard).toBeHidden()

    await f.name.fill("Toko Dummy Jaya")
    await save(page)
    await expect(page.getByRole("main")).toContainText("Proyek: Toko Dummy Jaya")
    await expect(switcher).toHaveAccessibleName("Proyek: Toko Dummy Jaya")
    // Slug dan Webhook URL tidak berubah.
    await expect(page).toHaveURL(new RegExp(`${settingsUrl(TOKO.slug)}$`))
    await expect(f.webhookUrl).toHaveValue(TOKO.webhookUrl)
  })

  test("AC 5: ganti secret yang sudah ada → konfirmasi dulu; Batal tidak mengubah apa pun; dialog sekali tampil", async ({
    page,
  }) => {
    await gotoReady(page, settingsUrl(TOKO.slug))
    const f = fields(page)
    await expect(f.webhookSecret).toHaveAccessibleDescription(/^Tersimpan/)

    // Secret yang sempat diketik tidak boleh menimpa secret buatan sistem saat Simpan.
    await f.webhookSecret.fill("secret-ketikan-sendiri-123")

    await f.generateSecret.click()
    const confirm = page.getByRole("alertdialog", { name: "Ganti Webhook Secret?" })
    await expect(confirm).toContainText("Secret lama langsung tidak berlaku")
    await confirm.getByRole("button", { name: "Batal" }).click()
    await expect(confirm).toBeHidden()
    await expect(f.generateSecret).toBeFocused()

    await page.keyboard.press("Enter")
    await confirm.getByRole("button", { name: "Buat secret baru" }).click()
    const dialog = page.getByRole("dialog", { name: "Webhook Secret baru" })
    await expect(dialog.getByLabel("Webhook Secret")).toBeFocused()
    const secret = await dialog.getByLabel("Webhook Secret").inputValue()
    expect(secret).toMatch(/^whsec_[A-Za-z0-9]{32}$/)

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(f.generateSecret).toBeFocused()
    await expect(f.webhookSecret).toHaveValue("")
    await expect(saveStatus(page, "Belum ada perubahan.")).toBeVisible()
    expect(await pageContains(page, secret)).toBe(false)
  })

  test("mode generik: petunjuk, field payload, peringatan atribusi, contoh payload; QR belum bisa dipilih", async ({
    page,
  }) => {
    await gotoReady(page, settingsUrl(TOKO.slug))
    const main = page.getByRole("main")

    await expect(main.getByRole("radio", { name: /WhatsApp Business API/ })).toBeChecked()
    const qr = main.getByRole("radio", { name: /Scan QR/ })
    await expect(qr).toBeDisabled()
    await expect(qr).toHaveAccessibleName(/Segera hadir/)

    const provider = main.getByRole("combobox", { name: "Provider WABA" })
    await expect(provider).toHaveText("Generik")
    await provider.click()
    await expect(page.getByRole("option")).toHaveText(["Generik"])
    await page.keyboard.press("Escape")

    const guide = main.getByRole("region", { name: "Petunjuk setup: Generik" })
    await expect(guide).toContainText("X-Signature: sha256=<hex>")
    await expect(guide).toContainText("pesan masuk dan pesan keluar")
    for (const name of ["message_id", "phone", "from", "name", "text", "message", "body", "content", "direction", "timestamp", "referral.ctwa_clid"]) {
      await expect(guide.locator("dt code", { hasText: new RegExp(`^${name.replace(".", "\\.")}$`) })).toBeVisible()
    }
    await expect(guide.getByRole("note")).toContainText("Atribusi iklan dan arah pesan bisa tidak lengkap")

    const example = guide.getByText('"ctwa_clid": "ARAkLkA8rmlFeiCktEJQ"')
    await expect(example).toBeHidden()
    await guide.getByText("Contoh payload").click()
    await expect(example).toBeVisible()
  })

  test("proyek terkunci: uji koneksi dijawab 402 → pesan error di bawah tombol", async ({ page }) => {
    await gotoReady(page, settingsUrl(WARUNG.slug))
    const f = fields(page)
    await expect(f.test).toBeDisabled()

    await f.pixelId.fill("1234567890")
    await f.token.fill("EAAGwarungBuSari2026Token")
    await save(page)
    await expect(f.test).toBeEnabled()
    await f.test.click()
    await expect(page.getByRole("alert").filter({ hasText: "Uji koneksi gagal" })).toContainText(
      "Masa trial atau langganan proyek ini sudah habis.",
    )
  })
})

test.describe("UnsavedChangesGuard", () => {
  test("tautan sidebar saat ada perubahan → konfirmasi; Tetap di sini; Tinggalkan → pindah tanpa menyimpan", async ({
    page,
  }) => {
    await gotoReady(page, settingsUrl(TOKO.slug))
    const f = fields(page)
    const dashboardLink = page.getByRole("complementary").getByRole("link", { name: "Dashboard" })
    const dialog = page.getByRole("alertdialog", { name: "Tinggalkan halaman tanpa menyimpan?" })

    // Tanpa perubahan: langsung pindah.
    await dashboardLink.click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await page.goBack()
    await expect(f.name).toHaveValue(TOKO.name)

    await f.name.fill("Nama Belum Disimpan")
    await dashboardLink.click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Tetap di sini" }).click()
    await expect(dialog).toBeHidden()
    await expect(dashboardLink).toBeFocused()
    await expect(page).toHaveURL(new RegExp(`${settingsUrl(TOKO.slug)}$`))
    await expect(f.name).toHaveValue("Nama Belum Disimpan")

    await dashboardLink.click()
    await dialog.getByRole("button", { name: "Tinggalkan" }).click()
    await expect(page).toHaveURL(new RegExp(`/projects/${TOKO.slug}/dashboard$`))
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()

    // Draf dibuang: kembali lewat menu (halaman dipulihkan dari `<Activity>`) menampilkan nilai tersimpan.
    await page.getByRole("complementary").getByRole("link", { name: "Pengaturan" }).click()
    await expect(f.name).toHaveValue(TOKO.name)
    await expect(saveStatus(page, "Belum ada perubahan.")).toBeVisible()
    await page.reload()
    await expect(f.name).toHaveValue(TOKO.name)
  })

  test("pemilih proyek (router.push) saat ada perubahan → konfirmasi; Tetap di sini; Tinggalkan → proyek lain", async ({
    page,
  }) => {
    await gotoReady(page, settingsUrl(TOKO.slug))
    const f = fields(page)
    const switcher = page.getByRole("complementary").getByRole("button", { name: /^Proyek: / })
    const klinik = page.getByRole("menuitemradio", { name: /^Klinik Gigi Senyum Sehat/ })
    const dialog = page.getByRole("alertdialog", { name: "Tinggalkan halaman tanpa menyimpan?" })

    await f.pixelId.fill("1122334455")
    await switcher.click()
    await klinik.click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Tetap di sini" })).toBeFocused()
    await dialog.getByRole("button", { name: "Tetap di sini" }).click()
    await expect(dialog).toBeHidden()
    await expect(switcher).toBeFocused()
    await expect(page).toHaveURL(new RegExp(`${settingsUrl(TOKO.slug)}$`))
    await expect(f.pixelId).toHaveValue("1122334455")

    // Dengan keyboard: Enter di menu, Escape menutup dialog konfirmasi tanpa pindah.
    await switcher.press("Enter")
    await klinik.focus()
    await page.keyboard.press("Enter")
    await expect(dialog).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(new RegExp(`${settingsUrl(TOKO.slug)}$`))

    await switcher.click()
    await klinik.click()
    await dialog.getByRole("button", { name: "Tinggalkan" }).click()
    await expect(page).toHaveURL(new RegExp(`${settingsUrl("klinik-gigi-senyum-sehat")}$`))
    await expect(f.name).toHaveValue("Klinik Gigi Senyum Sehat")
    await expect(switcher).toHaveAccessibleName("Proyek: Klinik Gigi Senyum Sehat")

    // Tanpa perubahan: langsung pindah, dan draf Toko sudah dibuang.
    await switcher.click()
    await page.getByRole("menuitemradio", { name: /^Toko Dummy/ }).click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(new RegExp(`${settingsUrl(TOKO.slug)}$`))
    await expect(f.pixelId).toHaveValue("123456789012345")
  })

  test("muat ulang saat ada perubahan → dialog beforeunload browser", async ({ page }) => {
    await gotoReady(page, settingsUrl(TOKO.slug))
    const f = fields(page)
    await f.testEventCode.fill("TEST99999")

    const dialogEvent = page.waitForEvent("dialog")
    const reload = page.reload()
    const dialog = await dialogEvent
    expect(dialog.type()).toBe("beforeunload")
    await dialog.accept()
    await reload
    await expect(f.testEventCode).toHaveValue("TEST48213")
  })
})

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

  test("Pengaturan di 375 px: target sentuh ≥ 44 px, tanpa scroll horizontal; guard juga untuk menu Sheet", async ({
    page,
  }) => {
    await gotoReady(page, settingsUrl(TOKO.slug))
    await expect(fields(page).name).toHaveValue(TOKO.name)

    const small = await page.evaluate(() => {
      const visible = (element: Element) => !element.closest("[aria-hidden='true']")
      // Radio bergaya kartu dan Switch berlabel: target sentuhnya seluruh label, bukan lingkaran/tombolnya saja.
      const inLabel = (element: Element) => ["radio", "switch"].includes(element.getAttribute("role") ?? "")
      const targets = [...document.querySelectorAll("main input, main button, main a, main summary")]
        .filter(visible)
        .map((element) => (inLabel(element) ? (element.closest("label") ?? element) : element))
        .filter((element): element is Element => element !== null)
      return targets
        .map((element) => ({
          name: element.textContent?.trim().slice(0, 30) || element.getAttribute("aria-label") || element.tagName,
          height: Math.round(element.getBoundingClientRect().height),
        }))
        .filter(({ height }) => height < 44)
    })
    expect(small).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)

    // Bilah Simpan menempel di bawah layar.
    const bar = page.getByRole("main").getByRole("status").filter({ hasText: "Belum ada perubahan." })
    await expect(bar).toBeInViewport()

    await fields(page).pixelId.fill("9988776655")
    await page.getByRole("button", { name: "Buka menu" }).click()
    const menu = page.getByRole("dialog", { name: "Menu" })
    await menu.getByRole("link", { name: "Blacklist" }).click()
    const confirm = page.getByRole("alertdialog", { name: "Tinggalkan halaman tanpa menyimpan?" })
    await confirm.getByRole("button", { name: "Tinggalkan" }).click()
    await expect(page).toHaveURL(new RegExp(`/projects/${TOKO.slug}/blacklist$`))
    await expect(menu).toBeHidden()
  })
})
