// `npm run test:e2e:dev`: Playwright terhadap dev server (port 3000) dengan E2E_SERVER=dev.
// Lewat Node, bukan `E2E_SERVER=dev playwright test`, agar jalan juga di PowerShell/cmd. Argumen diteruskan apa adanya,
// misalnya `npm run test:e2e:dev -- tests/e2e/settings.spec.ts`.
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"

const cli = createRequire(import.meta.url).resolve("@playwright/test/cli")
const result = spawnSync(process.execPath, [cli, "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, E2E_SERVER: "dev" },
})
process.exit(result.status ?? 1)
