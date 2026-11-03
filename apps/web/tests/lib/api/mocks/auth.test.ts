import { beforeEach, describe, expect, it, vi } from "vitest"

import { CSRF_COOKIE } from "@/lib/api/cookies"

// Uji lapisan mock auth seperti menguji server: status, kode error, detail field, dan bentuk respons PRD 7.2–7.3.

vi.mock(import("@/lib/api/mocks/utils"), async (importOriginal) => ({
  ...(await importOriginal()),
  mockDelay: () => Promise.resolve(),
}))

type AuthMocks = typeof import("@/lib/api/mocks/auth")
type CsrfMocks = typeof import("@/lib/api/mocks/csrf")

let auth: AuthMocks
let csrf: CsrfMocks

const RINA = { email: "rina@contoh.id", password: "rahasia-kuat-123" }
const ADMIN = { email: "admin@contoh.id", password: "admin-kuat-123" }

function setCsrfCookie(value: string | null) {
  document.cookie = value === null ? `${CSRF_COOKIE}=; Max-Age=0; Path=/` : `${CSRF_COOKIE}=${value}; Path=/`
}

/** Tautan reset terakhir yang "dikirim lewat email" (ditulis mock ke console.info). */
function lastResetToken(info: { mock: { calls: unknown[][] } }) {
  const message = String(info.mock.calls.at(-1)?.[0] ?? "")
  const token = /reset-password\?token=([0-9a-f]{32})$/.exec(message)?.[1]
  if (!token) throw new Error(`Tautan reset tidak ditemukan di console: ${message}`)
  return token
}

beforeEach(async () => {
  window.localStorage.clear()
  setCsrfCookie(null)
  // Modul dimuat ulang agar rate limiter di memori mulai dari nol di setiap uji.
  vi.resetModules()
  auth = await import("@/lib/api/mocks/auth")
  csrf = await import("@/lib/api/mocks/csrf")
  await csrf.issueCsrfToken()
})

describe("CSRF", () => {
  it("mutasi tanpa cookie csrf_token → 403 CSRF_INVALID", async () => {
    setCsrfCookie(null)

    await expect(auth.login(RINA)).rejects.toMatchObject({ status: 403, code: "CSRF_INVALID" })
  })

  it("cookie yang bukan terbitan GET /auth/csrf → 403 CSRF_INVALID", async () => {
    setCsrfCookie("palsu")

    await expect(auth.logout()).rejects.toMatchObject({ status: 403, code: "CSRF_INVALID" })
  })

  it("issueCsrfToken memasang token baru yang diterima", async () => {
    const before = document.cookie
    await csrf.issueCsrfToken()

    expect(document.cookie).toMatch(/^csrf_token=[0-9a-f]{32}$/)
    expect(document.cookie).not.toBe(before)
    await expect(auth.login(RINA)).resolves.toMatchObject({ email: RINA.email })
  })

  it("GET /me tidak butuh token CSRF", async () => {
    setCsrfCookie(null)

    await expect(auth.getMe()).resolves.toMatchObject({ email: RINA.email })
  })
})

describe("sesi", () => {
  it("sesi default = Rina, bentuk /me persis PRD 7.3", async () => {
    const me = await auth.getMe()

    expect(Object.keys(me)).toEqual(["id", "name", "email", "phone", "role", "created_at"])
    expect(me).toMatchObject({ name: "Rina Saputri", email: RINA.email, phone: "6281234567890", role: "user" })
  })

  it("logout → GET /me 401 UNAUTHORIZED", async () => {
    await auth.logout()

    await expect(auth.getMe()).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" })
  })
})

describe("POST /auth/register", () => {
  it("422 VALIDATION_ERROR dengan detail per field", async () => {
    const error = auth.register({ name: "", email: "bukan-email", phone: "abc", password: "123" })

    await expect(error).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      details: expect.arrayContaining(
        ["name", "email", "phone", "password"].map((field) => expect.objectContaining({ field })),
      ),
    })
  })

  it("email sudah terdaftar (tanpa membedakan huruf besar/kecil) → 409 di field email", async () => {
    const error = auth.register({ name: "Rina", email: "RINA@contoh.id", phone: "081234567890", password: "password-baru-1" })

    await expect(error).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      details: [{ field: "email", message: "Email sudah terdaftar. Masuk atau pakai email lain." }],
    })
  })

  it("201: nomor HP dinormalkan ke 62..., role user, dan langsung masuk", async () => {
    const user = await auth.register({
      name: "Budi Santoso",
      email: "budi@contoh.id",
      phone: "0812-9999-0000",
      password: "rahasia-budi-1",
    })

    expect(Object.keys(user)).toEqual(["id", "name", "email", "phone", "role", "created_at"])
    expect(user).toMatchObject({ phone: "6281299990000", role: "user" })
    await expect(auth.getMe()).resolves.toMatchObject({ id: user.id })
  })
})

describe("POST /auth/login", () => {
  it("200: bentuk respons persis PRD 7.2 (dengan last_login_at)", async () => {
    const user = await auth.login(ADMIN)

    expect(Object.keys(user)).toEqual(["id", "name", "email", "phone", "role", "last_login_at"])
    expect(user.role).toBe("admin")
    await expect(auth.getMe()).resolves.toMatchObject({ email: ADMIN.email })
  })

  it("password salah dan email tidak terdaftar → 401 dengan pesan yang sama", async () => {
    const expected = { status: 401, code: "UNAUTHORIZED", message: "Email atau password salah." }

    await expect(auth.login({ email: RINA.email, password: "salah-sekali" })).rejects.toMatchObject(expected)
    await expect(auth.login({ email: "tidak-ada@contoh.id", password: "apa-saja" })).rejects.toMatchObject(expected)
  })

  it("percobaan ke-6 dalam 15 menit → 429 RATE_LIMITED, walau password benar", async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      await expect(auth.login({ email: RINA.email, password: `salah-${attempt}` })).rejects.toMatchObject({ status: 401 })
    }

    await expect(auth.login(RINA)).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
      message: "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.",
    })
  })
})

describe("lupa & reset password", () => {
  it("pesan selalu sama; tautan reset hanya dibuat untuk email terdaftar", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {})
    const registered = await auth.forgotPassword({ email: RINA.email })
    const unknown = await auth.forgotPassword({ email: "tidak-ada@contoh.id" })

    expect(registered).toEqual({ message: "Jika email terdaftar, tautan reset sudah dikirim." })
    expect(unknown).toEqual(registered)
    expect(info).toHaveBeenCalledTimes(1)
    expect(info.mock.calls[0][0]).toContain(`${RINA.email}: http://localhost:3000/reset-password?token=`)
  })

  it("permintaan ke-4 dalam 1 jam → 429 RATE_LIMITED", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {})
    for (let attempt = 1; attempt <= 3; attempt++) await auth.forgotPassword({ email: RINA.email })

    await expect(auth.forgotPassword({ email: RINA.email })).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" })
  })

  it("token kedaluwarsa → 400 BAD_REQUEST", async () => {
    const error = auth.resetPassword({ token: "contoh-token-kedaluwarsa", new_password: "password-baru-456" })

    await expect(error).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" })
  })

  it("token valid: password < 8 → 422, lalu sukses mencabut sesi, sekali pakai, dan password baru berlaku", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {})
    await auth.forgotPassword({ email: RINA.email })
    const token = lastResetToken(info)

    await expect(auth.resetPassword({ token, new_password: "pendek" })).rejects.toMatchObject({
      status: 422,
      details: [expect.objectContaining({ field: "new_password" })],
    })
    await expect(auth.resetPassword({ token, new_password: "password-baru-456" })).resolves.toEqual({ reset: true })
    await expect(auth.getMe()).rejects.toMatchObject({ status: 401 })
    await expect(auth.resetPassword({ token, new_password: "password-lain-789" })).rejects.toMatchObject({ status: 400 })
    await expect(auth.login(RINA)).rejects.toMatchObject({ status: 401 })
    await expect(auth.login({ email: RINA.email, password: "password-baru-456" })).resolves.toMatchObject({
      email: RINA.email,
    })
  })
})

describe("PUT /me/password", () => {
  it("password lama salah → 422 di field current_password", async () => {
    const error = auth.changePassword({ current_password: "salah", new_password: "password-ketiga-1" })

    await expect(error).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      details: [{ field: "current_password", message: "Password lama salah." }],
    })
  })

  it("sukses: sesi saat ini tetap aktif dan password baru berlaku", async () => {
    await auth.changePassword({ current_password: RINA.password, new_password: "password-ketiga-1" })

    await expect(auth.getMe()).resolves.toMatchObject({ email: RINA.email })
    await auth.logout()
    await expect(auth.login({ email: RINA.email, password: "password-ketiga-1" })).resolves.toMatchObject({
      email: RINA.email,
    })
  })

  it("tanpa login → 401", async () => {
    await auth.logout()

    await expect(
      auth.changePassword({ current_password: RINA.password, new_password: "password-ketiga-1" }),
    ).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" })
  })
})
