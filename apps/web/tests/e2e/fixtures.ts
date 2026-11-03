import { test as base, expect, type Locator, type Page } from "@playwright/test"

export const BASE_URL = "http://localhost:3000"

/** Konteks browser tanpa sesi mock (default mock = sudah masuk sebagai Rina). */
export const SIGNED_OUT = {
  cookies: [],
  origins: [{ origin: BASE_URL, localStorage: [{ name: "convera.mock-session", value: "signed-out" }] }],
}

export const RINA = { name: "Rina Saputri", email: "rina@contoh.id", password: "rahasia-kuat-123" }

/** Setiap uji gagal bila ada error/warning di console browser atau error JavaScript yang tidak tertangani. */
export const test = base.extend<{ consoleIssues: string[] }>({
  consoleIssues: [
    async ({ page }, provide) => {
      const issues: string[] = []
      page.on("console", (message) => {
        if (message.type() !== "error" && message.type() !== "warning") return
        // Favicon belum ada sampai identitas visual diputuskan (Pertanyaan Terbuka 25).
        if (message.location().url.endsWith("/favicon.ico")) return
        issues.push(`${message.type()}: ${message.text()}`)
      })
      page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`))
      await provide(issues)
      expect(issues, "error/warning di console browser").toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** Buka halaman lalu tunggu React selesai hydrate, agar submit ditangani react-hook-form, bukan submit native. */
export async function gotoReady(page: Page, url: string) {
  await page.goto(url)
  await page.waitForFunction(() => {
    const element = document.querySelector("form") ?? document.querySelector("main")
    return element !== null && Object.keys(element).some((key) => key.startsWith("__react"))
  })
}

export async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Masuk", exact: true }).click()
}

/** Klik lewat DOM: indikator dev Next.js menutupi pojok kiri bawah, tempat tombol Keluar di sidebar. */
export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Keluar" }).dispatchEvent("click")
  await expect(page).toHaveURL(/\/login$/)
}

/**
 * Mencatat di atribut `data-e2e-completed` tombol submit berapa request yang sudah selesai, yaitu setiap kali
 * atribut `disabled` dilepas lagi. Tombol hanya nonaktif selama request berjalan (jeda mock ±300 ms), sehingga
 * `toBeDisabled()` setelah klik bisa melewatkannya bila polling Playwright terlambat (banyak worker + trace).
 * MutationObserver menerima setiap perubahan atribut, jadi tidak ada request yang terlewat.
 */
export async function countCompletedSubmits(button: Locator) {
  await button.evaluate((element) => {
    element.setAttribute("data-e2e-completed", "0")
    new MutationObserver((records) => {
      // `oldValue` terisi berarti `disabled` sebelumnya ada dan sekarang dilepas: satu request selesai.
      const completed = records.filter((record) => record.oldValue !== null).length
      if (completed === 0) return
      const total = Number(element.getAttribute("data-e2e-completed")) + completed
      element.setAttribute("data-e2e-completed", String(total))
    }).observe(element, { attributeFilter: ["disabled"], attributeOldValue: true })
  })
}

export async function csrfCookie(page: Page) {
  const cookies = await page.context().cookies()
  return cookies.find((cookie) => cookie.name === "csrf_token")?.value
}
