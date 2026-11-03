import { readdirSync } from "node:fs"
import path from "node:path"

import { test as setup } from "@playwright/test"

// `next dev` mengompilasi setiap route saat pertama kali diminta. Bila itu terjadi di tengah uji paralel,
// request pertama bisa makan 8–15 detik dan menyeret request lain: navigasi melewati timeout 15 detik, atau toast
// (4 detik) sudah hilang saat dicek. Semua halaman dibuka sekali di sini, berurutan, sebelum uji paralel mulai.

const APP_DIR = path.join(__dirname, "../../app")
/** Nilai segmen dinamis: proyek contoh milik user mock default. */
const DYNAMIC_SEGMENTS: Record<string, string> = { "[slug]": "toko-dummy-co-2026" }

/** Route dari setiap `app/**\/page.tsx`: route group dibuang, segmen dinamis diisi, catch-all opsional dikosongkan. */
function appRoutes() {
  return readdirSync(APP_DIR, { recursive: true, encoding: "utf8" })
    .filter((file) => path.basename(file) === "page.tsx")
    .map((file) => {
      const segments = path
        .dirname(file)
        .split(path.sep)
        .filter((segment) => segment !== "." && !/^\(.+\)$/.test(segment) && !segment.startsWith("[[..."))
        .map((segment) => DYNAMIC_SEGMENTS[segment] ?? segment)
      return `/${segments.join("/")}`
    })
    .sort()
}

setup("kompilasi semua halaman dev server", async ({ page }) => {
  setup.setTimeout(300_000)
  for (const route of appRoutes()) {
    await page.goto(route, { waitUntil: "load", timeout: 120_000 })
  }
})
