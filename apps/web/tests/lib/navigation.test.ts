import { describe, expect, it } from "vitest"

import { safeNextPath } from "@/lib/navigation"

describe("safeNextPath", () => {
  it.each([
    "//domain.com",
    "//domain.com/projects",
    String.raw`/\domain.com`,
    String.raw`/\\domain.com`,
    String.raw`\\domain.com`,
    "/\t/domain.com",
    "/\n/domain.com",
    "https://domain.com",
    "http://localhost:3000/projects",
    "javascript:alert(1)",
    "domain.com",
    "",
  ])("menolak %j (open redirect) → /projects", (next) => {
    expect(safeNextPath(next)).toBe("/projects")
  })

  it.each([null, undefined])("tanpa next (%s) → /projects", (next) => {
    expect(safeNextPath(next)).toBe("/projects")
  })

  it.each([
    "/projects",
    "/account",
    "/projects/toko-dummy-co-2026/events?period=today&page=2",
    "/projects#bagian",
  ])("menerima path internal %j", (next) => {
    expect(safeNextPath(next)).toBe(next)
  })

  it("memakai fallback yang diberikan", () => {
    expect(safeNextPath("//domain.com", "/account")).toBe("/account")
  })
})
