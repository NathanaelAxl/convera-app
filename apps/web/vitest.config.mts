import { defineConfig } from "vitest/config"

// Uji unit, klien API, dan mock. Uji E2E (Playwright) ada di tests/e2e dengan akhiran .spec.ts.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["tests/**/*.test.ts"],
    // document.cookie, localStorage, Request/Response seperti di browser (origin http://localhost:3000).
    environment: "happy-dom",
    // Node 25 punya `localStorage` bawaan yang menutupi milik happy-dom.
    execArgv: ["--no-experimental-webstorage"],
    unstubGlobals: true,
    restoreMocks: true,
  },
})
