import {
  BASE_URL,
  countCompletedSubmits,
  csrfCookie,
  expect,
  gotoReady,
  RINA,
  signIn,
  SIGNED_OUT,
  signOut,
  test,
} from "./fixtures"

// Fase 1 — Autentikasi & Akun, dengan modul `auth` di-mock (lib/api/config.ts).

test.describe("sesi & CSRF", () => {
  test("mutasi pertama (Keluar) memasang cookie csrf_token otomatis", async ({ page }) => {
    await gotoReady(page, "/projects")
    await expect(page.getByRole("button", { name: "Keluar" })).toBeVisible()
    expect(await csrfCookie(page)).toBeUndefined()

    await signOut(page)
    expect(await csrfCookie(page)).toMatch(/^[0-9a-f]{32}$/)
  })

  test.describe(() => {
    test.use({ storageState: SIGNED_OUT })

    test("cookie csrf_token tidak valid → CSRF_INVALID → token baru diambil otomatis dan login tetap berhasil", async ({
      page,
      context,
    }) => {
      await context.addCookies([{ name: "csrf_token", value: "palsu", url: BASE_URL }])
      await gotoReady(page, "/login")

      await signIn(page, RINA.email, RINA.password)
      await expect(page).toHaveURL(/\/projects$/)
      expect(await csrfCookie(page)).toMatch(/^[0-9a-f]{32}$/)
    })
  })
})

test.describe("masuk", () => {
  test.use({ storageState: SIGNED_OUT })

  test("validasi per field, kredensial salah, lalu masuk dengan Enter", async ({ page }) => {
    await gotoReady(page, "/login")
    const email = page.getByLabel("Email", { exact: true })
    const password = page.getByLabel("Password", { exact: true })

    await page.getByRole("button", { name: "Masuk", exact: true }).click()
    await expect(email).toHaveAttribute("aria-invalid", "true")
    await expect(email).toHaveAccessibleDescription(/Email wajib diisi\./)
    await expect(password).toHaveAccessibleDescription(/Password wajib diisi\./)

    await signIn(page, RINA.email, "password-salah")
    await expect(page.getByText("Email atau password salah.")).toBeVisible()

    await password.fill(RINA.password)
    await password.press("Enter")
    await expect(page).toHaveURL(/\/projects$/)
    await expect(page.getByText(RINA.name).first()).toBeVisible()
  })

  test("percobaan ke-6 dalam 15 menit → 429", async ({ page }) => {
    await gotoReady(page, "/login")
    const submit = page.getByRole("button", { name: "Masuk", exact: true })
    await page.getByLabel("Email", { exact: true }).fill("admin@contoh.id")
    await countCompletedSubmits(submit)

    for (let attempt = 1; attempt <= 6; attempt++) {
      await page.getByLabel("Password", { exact: true }).fill(`salah-${attempt}`)
      await submit.click()
      // Tunggu respons percobaan ini sebelum percobaan berikutnya. Jangan menunggu `toBeDisabled()`:
      // keadaan nonaktif hanya ±300 ms dan bisa terlewat oleh polling saat uji berjalan paralel.
      await expect(submit).toHaveAttribute("data-e2e-completed", String(attempt))
    }
    await expect(page.getByText("Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.")).toBeVisible()
  })

  const nextCases: [next: string, expected: string][] = [
    ["//domain.com", "/projects"],
    [String.raw`/\domain.com`, "/projects"],
    ["https://domain.com", "/projects"],
    ["/%09/domain.com", "/projects"],
    ["/account", "/account"],
  ]
  for (const [next, expected] of nextCases) {
    test(`redirect ?next=${next} → ${expected}`, async ({ page }) => {
      // `/%09/...` dikirim apa adanya agar browser membacanya sebagai tab.
      const query = next.startsWith("/%") ? next : encodeURIComponent(next)
      await gotoReady(page, `/login?next=${query}`)

      await signIn(page, RINA.email, RINA.password)
      await page.waitForURL((url) => url.pathname !== "/login")
      const landed = new URL(page.url())
      expect(landed.origin + landed.pathname).toBe(BASE_URL + expected)
    })
  }
})

test.describe("daftar", () => {
  test.use({ storageState: SIGNED_OUT })

  test("validasi client, email terdaftar (409) di field email, lalu sukses dan langsung masuk", async ({ page }) => {
    await gotoReady(page, "/register")
    const email = page.getByLabel("Email", { exact: true })
    const phone = page.getByLabel("Nomor HP")
    const password = page.getByLabel("Password", { exact: true })
    const confirmation = page.getByLabel("Konfirmasi password")
    const submit = page.getByRole("button", { name: "Daftar", exact: true })

    await page.getByLabel("Nama lengkap").fill("Dewi Lestari")
    await email.fill(RINA.email)
    await phone.fill("abc")
    await password.fill("pendek")
    await confirmation.fill("beda")
    await expect(page.getByLabel("Syarat password")).toContainText("Minimal 8 karakter")
    await expect(page.getByLabel("Syarat password")).toContainText("belum terpenuhi")

    await submit.click()
    await expect(phone).toHaveAccessibleDescription(/Nomor HP tidak valid\. Contoh: 081234567890\./)
    await expect(password).toHaveAccessibleDescription(/Password minimal 8 karakter\./)
    await expect(confirmation).toHaveAccessibleDescription(/Konfirmasi password tidak sama\./)

    await phone.fill("0812-5555-1234")
    await password.fill("rahasia-dewi-1")
    await confirmation.fill("rahasia-dewi-1")
    await submit.click()
    await expect(email).toHaveAttribute("aria-invalid", "true")
    await expect(email).toHaveAccessibleDescription(/Email sudah terdaftar\. Masuk atau pakai email lain\./)

    await email.fill("dewi@contoh.id")
    await submit.click()
    // Toast (4 detik) dibuat sebelum pindah halaman, jadi dicek dulu; navigasi bisa lebih lama dari umurnya.
    await expect(page.getByText("Akun berhasil dibuat. Selamat datang di Convera!")).toBeVisible()
    await expect(page).toHaveURL(/\/projects$/)
    await expect(page.getByText("Dewi Lestari").first()).toBeVisible()
  })
})

test.describe("akun", () => {
  test("info read-only dan ganti password: lama salah (422) di field, lalu sukses", async ({ page }) => {
    await gotoReady(page, "/account")
    const main = page.getByRole("main")
    await expect(main).toContainText("Info akun")
    await expect(main).toContainText(RINA.name)
    await expect(main).toContainText(RINA.email)
    await expect(main).toContainText("+62 812-3456-7890")

    const current = page.getByLabel("Password lama")
    await current.fill("salah-total")
    await page.getByLabel("Password baru", { exact: true }).fill("rahasia-rina-2")
    await page.getByLabel("Konfirmasi password baru").fill("rahasia-rina-2")
    await page.getByRole("button", { name: "Simpan password" }).click()
    await expect(current).toHaveAttribute("aria-invalid", "true")
    await expect(current).toHaveAccessibleDescription(/Password lama salah\./)

    await current.fill(RINA.password)
    await page.getByRole("button", { name: "Simpan password" }).click()
    await expect(page.getByText("Password berhasil diganti. Sesi di perangkat lain sudah dikeluarkan.")).toBeVisible()
    await expect(page).toHaveURL(/\/account$/)
  })

  test("role user membuka /admin → 403 di URL yang sama", async ({ page }) => {
    await gotoReady(page, "/admin")
    await expect(page.getByText("Akses ditolak")).toBeVisible()
    await expect(page).toHaveURL(/\/admin$/)
  })
})

test.describe("lupa & reset password", () => {
  test.use({ storageState: SIGNED_OUT })

  test("tautan reset (dari console) → password baru → masuk; tautan tidak bisa dipakai ulang", async ({ page }) => {
    await gotoReady(page, "/forgot-password")
    await page.getByLabel("Email", { exact: true }).fill(RINA.email)
    const mail = page.waitForEvent("console", (message) => message.text().startsWith("[mock email]"))
    await page.getByRole("button", { name: "Kirim tautan reset" }).click()
    await expect(page.getByText("Jika email terdaftar, tautan reset sudah dikirim.")).toBeVisible()
    const link = /(http:\/\/\S+\/reset-password\?token=[0-9a-f]+)/.exec((await mail).text())?.[1]
    if (!link) throw new Error("Tautan reset tidak ditulis ke console")

    const resetTo = async (newPassword: string) => {
      await gotoReady(page, link)
      await page.getByLabel("Password baru", { exact: true }).fill(newPassword)
      await page.getByLabel("Konfirmasi password baru").fill(newPassword)
      await page.getByRole("button", { name: "Simpan password baru" }).click()
    }

    await resetTo("rahasia-rina-3")
    // Toast (4 detik) dibuat sebelum pindah halaman, jadi dicek dulu; navigasi bisa lebih lama dari umurnya.
    await expect(page.getByText(/Password berhasil diganti/)).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
    await signIn(page, RINA.email, "rahasia-rina-3")
    await expect(page).toHaveURL(/\/projects$/)

    await resetTo("rahasia-rina-4")
    await expect(page.getByText("Tautan reset tidak bisa dipakai")).toBeVisible()
    await expect(page.getByRole("link", { name: "Minta tautan baru" })).toBeVisible()
  })

  test("tanpa token atau token kedaluwarsa → alert tautan tidak bisa dipakai", async ({ page }) => {
    await gotoReady(page, "/reset-password")
    await expect(page.getByText("Tautan reset tidak bisa dipakai")).toBeVisible()

    await gotoReady(page, "/reset-password?token=contoh-token-kedaluwarsa")
    await page.getByLabel("Password baru", { exact: true }).fill("rahasia-rina-5")
    await page.getByLabel("Konfirmasi password baru").fill("rahasia-rina-5")
    await page.getByRole("button", { name: "Simpan password baru" }).click()
    await expect(page.getByText("Tautan reset tidak bisa dipakai")).toBeVisible()
  })
})

test.describe("mobile", () => {
  test.use({ storageState: SIGNED_OUT, viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

  test("input dan tombol ≥ 44 px (NFR-16), tanpa scroll horizontal", async ({ page }) => {
    await gotoReady(page, "/register")
    await expect(page.getByLabel("Nama lengkap")).toBeVisible()

    // querySelectorAll tidak menembus shadow DOM, jadi tombol dev tools Next.js tidak ikut dihitung.
    const heights = await page.evaluate(() =>
      [...document.querySelectorAll("input:not([hidden]), button")].map((element) =>
        Math.round(element.getBoundingClientRect().height),
      ),
    )
    expect(heights.length).toBeGreaterThan(0)
    expect(heights.filter((height) => height < 44)).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  })
})
