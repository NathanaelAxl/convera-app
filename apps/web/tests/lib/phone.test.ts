import { describe, expect, it } from "vitest"

import { formatPhone, normalizePhone } from "@/lib/phone"

describe("normalizePhone", () => {
  it.each([
    ["0812-3456-7890", "6281234567890"],
    ["+62 812-3456-7890", "6281234567890"],
    ["6281234567890", "6281234567890"],
    ["(0812) 3456.7890", "6281234567890"],
  ])("%j → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it.each(["abc", "812345", "0812", "+1 555 0100", "08123456789012345"])("%j tidak valid → null", (input) => {
    expect(normalizePhone(input)).toBeNull()
  })
})

describe("formatPhone", () => {
  it("menampilkan 62xxxxxxxxxx sebagai +62 xxx-xxxx-xxxx", () => {
    expect(formatPhone("6281234567890")).toBe("+62 812-3456-7890")
  })
})
