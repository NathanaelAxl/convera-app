import { defineConfig, devices } from "@playwright/test"

import { BASE_URL, E2E_DEV } from "./tests/e2e/fixtures"

// Uji E2E di browser sungguhan (data mock). Default terhadap build produksi yang selalu dibuat ulang di port 3100;
// `npm run test:e2e:dev` terhadap dev server di port 3000 (dipakai ulang bila sudah jalan). Lihat tests/e2e/fixtures.ts.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    trace: "retain-on-failure",
  },
  projects: E2E_DEV
    ? [
        // Mengompilasi semua halaman dev server sekali sebelum uji paralel (lihat warmup.setup.ts).
        { name: "warmup", testMatch: /warmup\.setup\.ts$/, use: { ...devices["Desktop Chrome"] } },
        { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["warmup"] },
      ]
    : [{ name: "chromium", testIgnore: /warmup\.setup\.ts$/, use: { ...devices["Desktop Chrome"] } }],
  webServer: E2E_DEV
    ? {
        command: "npm run dev",
        url: `${BASE_URL}/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : {
        // Server lama di port 3100 tidak dipakai ulang, supaya uji tidak pernah berjalan terhadap build yang basi.
        command: "npm run build && npm run start -- --port 3100",
        url: `${BASE_URL}/login`,
        reuseExistingServer: false,
        timeout: 300_000,
      },
})
