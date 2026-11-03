import { beforeEach, describe, expect, it, vi } from "vitest"

import { api, ensureCsrfToken, unwrap, withMockCsrf } from "@/lib/api/client"
import { CSRF_COOKIE, readCookie } from "@/lib/api/cookies"
import { ApiError } from "@/lib/api/errors"
import { mockRequireCsrf } from "@/lib/api/mocks/csrf"

// Uji lib/api/client.ts terhadap server tiruan (fetch di-stub): CSRF, refresh saat 401, CSRF_INVALID, parsing error.

const config = vi.hoisted(() => ({ authMocked: false }))
vi.mock(import("@/lib/api/config"), async (importOriginal) => ({
  ...(await importOriginal()),
  isMocked: (module: string) => module === "auth" && config.authMocked,
}))

type Call = { method: string; path: string; csrf: string | null; body: string }
type Handler = (call: Call) => Response | Promise<Response>

let calls: Call[] = []
let handler: Handler = () => noContent()

function serve(next: Handler) {
  handler = next
}

/** Urutan request yang diterima server, misalnya `["GET /me", "POST /auth/refresh"]`. */
const trace = () => calls.map((call) => `${call.method} ${call.path}`)

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
const ok = (data: unknown) => json(200, { data })
const noContent = () => new Response(null, { status: 204 })
const fail = (status: number, code: string, message = "Gagal.") => json(status, { error: { code, message, details: [] } })
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function setCsrfCookie(value: string | null) {
  document.cookie = value === null ? `${CSRF_COOKIE}=; Max-Age=0; Path=/` : `${CSRF_COOKIE}=${value}; Path=/`
}

/** `GET /auth/csrf` tiruan: memasang cookie baru (dengan jeda agar request bersamaan sempat menunggu). */
async function issueCookie(value: string) {
  await delay(5)
  setCsrfCookie(value)
  return noContent()
}

beforeEach(() => {
  config.authMocked = false
  calls = []
  window.localStorage.clear()
  setCsrfCookie("tok-1")
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const call: Call = {
        method: request.method,
        path: new URL(request.url).pathname.replace(/^\/api\/v1/, ""),
        csrf: request.headers.get("X-CSRF-Token"),
        body: await request.text(),
      }
      calls.push(call)
      return handler(call)
    }),
  )
})

describe("refresh saat 401", () => {
  it("GET yang dijawab 401 → POST /auth/refresh → request diulang", async () => {
    let meCalls = 0
    serve((call) => {
      if (call.path === "/auth/refresh") return ok({ refreshed: true })
      return ++meCalls === 1 ? fail(401, "UNAUTHORIZED") : ok({ id: "u1" })
    })

    await expect(unwrap(api.GET("/me"))).resolves.toMatchObject({ data: { id: "u1" } })
    expect(trace()).toEqual(["GET /me", "POST /auth/refresh", "GET /me"])
    expect(calls[0].csrf).toBeNull()
    expect(calls[1].csrf).toBe("tok-1")
  })

  it("mutasi yang diulang membawa body utuh dan token CSRF terbaru", async () => {
    serve((call) => {
      if (call.path === "/auth/refresh") {
        setCsrfCookie("tok-2")
        return ok({ refreshed: true })
      }
      return calls.length === 1 ? fail(401, "UNAUTHORIZED") : noContent()
    })
    const body = { current_password: "lama-12345", new_password: "baru-12345" }

    await expect(unwrap(api.PUT("/me/password", { body }))).resolves.toBeUndefined()
    expect(trace()).toEqual(["PUT /me/password", "POST /auth/refresh", "PUT /me/password"])
    expect(calls.map((call) => call.csrf)).toEqual(["tok-1", "tok-1", "tok-2"])
    expect(JSON.parse(calls[2].body)).toEqual(body)
  })

  it("beberapa request 401 bersamaan → satu refresh", async () => {
    const seen = new Set<string>()
    serve(async (call) => {
      if (call.path === "/auth/refresh") {
        await delay(5)
        return ok({ refreshed: true })
      }
      if (seen.has(call.path)) return ok([])
      seen.add(call.path)
      return fail(401, "UNAUTHORIZED")
    })

    await Promise.all([unwrap(api.GET("/me")), unwrap(api.GET("/projects"))])
    expect(trace().filter((entry) => entry === "POST /auth/refresh")).toHaveLength(1)
  })

  it("refresh gagal → ApiError 401 tanpa mengulang request", async () => {
    serve(() => fail(401, "UNAUTHORIZED", "Sesi Anda berakhir."))

    const error = await unwrap(api.GET("/me")).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 401, code: "UNAUTHORIZED", message: "Sesi Anda berakhir." })
    expect(trace()).toEqual(["GET /me", "POST /auth/refresh"])
  })

  it.each([
    ["/auth/refresh", () => api.POST("/auth/refresh")],
    ["/auth/login", () => api.POST("/auth/login", { body: { email: "rina@contoh.id", password: "salah" } })],
    [
      "/auth/register",
      () =>
        api.POST("/auth/register", {
          body: { name: "Rina", email: "rina@contoh.id", phone: "081234567890", password: "rahasia-kuat-123" },
        }),
    ],
  ])("401 dari %s tidak memicu refresh", async (path, send) => {
    serve(() => fail(401, "UNAUTHORIZED"))

    await expect(unwrap<unknown>(send())).rejects.toMatchObject({ status: 401 })
    expect(trace()).toEqual([`POST ${path}`])
  })
})

describe("parsing error", () => {
  it("422: detail per field dibaca dari error.details", async () => {
    const details = [{ field: "pixel_id", message: "Pixel ID hanya boleh berisi angka." }]
    serve(() => json(422, { error: { code: "VALIDATION_ERROR", message: "Data tidak valid.", details } }))

    await expect(unwrap(api.GET("/me"))).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR", details })
  })

  it("body error yang bukan format PRD 7.1 (misalnya 502 dari proxy) → HTTP_502", async () => {
    serve(() => new Response("Bad Gateway", { status: 502 }))

    await expect(unwrap(api.GET("/me"))).rejects.toMatchObject({ status: 502, code: "HTTP_502" })
  })

  it("gagal terhubung → NETWORK_ERROR", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch")
      }),
    )

    await expect(unwrap(api.GET("/me"))).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" })
  })
})

describe("CSRF: cookie csrf_token belum ada", () => {
  beforeEach(() => setCsrfCookie(null))

  /** Server yang hanya menerima token dari `GET /auth/csrf`-nya sendiri. */
  const server: Handler = (call) => {
    if (call.path === "/auth/csrf") return issueCookie("dari-server")
    if (call.method === "GET") return ok({ id: "u1" })
    return call.csrf === "dari-server" ? noContent() : fail(403, "CSRF_INVALID")
  }

  it("GET tidak memanggil /auth/csrf", async () => {
    serve(server)

    await unwrap(api.GET("/me"))
    expect(trace()).toEqual(["GET /me"])
  })

  it("mutasi pertama → GET /auth/csrf dulu, lalu dikirim dengan header X-CSRF-Token", async () => {
    serve(server)

    await unwrap(api.POST("/auth/logout"))
    expect(trace()).toEqual(["GET /auth/csrf", "POST /auth/logout"])
    expect(calls[1].csrf).toBe("dari-server")
  })

  it("beberapa mutasi bersamaan → satu GET /auth/csrf", async () => {
    serve(server)

    await Promise.all([
      unwrap(api.POST("/auth/logout")),
      unwrap(api.PUT("/me/password", { body: { current_password: "lama-12345", new_password: "baru-12345" } })),
      unwrap(api.POST("/auth/forgot-password", { body: { email: "rina@contoh.id" } })),
    ])
    expect(trace().filter((entry) => entry === "GET /auth/csrf")).toHaveLength(1)
    expect(calls.filter((call) => call.method !== "GET").map((call) => call.csrf)).toEqual(Array(3).fill("dari-server"))
  })

  it("cookie sudah ada → tidak memanggil /auth/csrf", async () => {
    setCsrfCookie("sudah-ada")
    serve(() => noContent())

    await unwrap(api.POST("/auth/logout"))
    expect(trace()).toEqual(["POST /auth/logout"])
    expect(calls[0].csrf).toBe("sudah-ada")
  })

  it("GET /auth/csrf gagal → request tetap dikirim tanpa header dan server menjawab 403 CSRF_INVALID", async () => {
    serve((call) => (call.path === "/auth/csrf" ? fail(500, "INTERNAL_ERROR") : fail(403, "CSRF_INVALID")))

    await expect(unwrap(api.POST("/auth/logout"))).rejects.toMatchObject({ status: 403, code: "CSRF_INVALID" })
    expect(trace()).toEqual(["GET /auth/csrf", "POST /auth/logout", "GET /auth/csrf"])
    expect(calls[1].csrf).toBeNull()
  })
})

describe("CSRF_INVALID: ambil token baru sekali lalu ulangi", () => {
  beforeEach(() => setCsrfCookie("kedaluwarsa"))

  /** Server yang hanya menerima token "baru" untuk mutasi; `GET /auth/csrf` memasangnya. */
  const server =
    (accepted: Handler = () => noContent()): Handler =>
    (call) => {
      if (call.path === "/auth/csrf") return issueCookie("baru")
      if (call.method !== "GET" && call.csrf !== "baru") return fail(403, "CSRF_INVALID", "Token keamanan tidak valid.")
      return accepted(call)
    }

  it("403 CSRF_INVALID → GET /auth/csrf (meski cookie ada) → request diulang dengan token baru dan body utuh", async () => {
    serve(server())
    const body = { current_password: "lama-12345", new_password: "baru-12345" }

    await expect(unwrap(api.PUT("/me/password", { body }))).resolves.toBeUndefined()
    expect(trace()).toEqual(["PUT /me/password", "GET /auth/csrf", "PUT /me/password"])
    expect(calls.map((call) => call.csrf)).toEqual(["kedaluwarsa", null, "baru"])
    expect(JSON.parse(calls[2].body)).toEqual(body)
  })

  it("masih CSRF_INVALID setelah token baru → berhenti dan melempar ApiError 403", async () => {
    serve((call) => (call.path === "/auth/csrf" ? issueCookie("baru") : fail(403, "CSRF_INVALID", "Token keamanan tidak valid.")))

    await expect(unwrap(api.POST("/auth/logout"))).rejects.toMatchObject({
      status: 403,
      code: "CSRF_INVALID",
      message: "Token keamanan tidak valid.",
    })
    expect(trace()).toEqual(["POST /auth/logout", "GET /auth/csrf", "POST /auth/logout"])
  })

  it("403 FORBIDDEN tidak memicu pengambilan token baru", async () => {
    serve(() => fail(403, "FORBIDDEN"))

    await expect(unwrap(api.POST("/auth/logout"))).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" })
    expect(trace()).toEqual(["POST /auth/logout"])
  })

  it("beberapa mutasi CSRF_INVALID bersamaan → satu GET /auth/csrf", async () => {
    serve(server())

    await Promise.all([
      unwrap(api.POST("/auth/logout")),
      unwrap(api.PUT("/me/password", { body: { current_password: "lama-12345", new_password: "baru-12345" } })),
      unwrap(api.POST("/auth/forgot-password", { body: { email: "rina@contoh.id" } })),
    ])
    expect(trace().filter((entry) => entry === "GET /auth/csrf")).toHaveLength(1)
    expect(calls.filter((call) => call.csrf === "baru")).toHaveLength(3)
  })

  it("CSRF_INVALID lalu 401 → token baru, refresh, lalu request diulang", async () => {
    let accepted = 0
    serve(
      server((call) => {
        if (call.path === "/auth/refresh") return ok({ refreshed: true })
        return ++accepted === 1 ? fail(401, "UNAUTHORIZED") : noContent()
      }),
    )

    await expect(unwrap(api.POST("/auth/logout"))).resolves.toBeUndefined()
    expect(trace()).toEqual([
      "POST /auth/logout",
      "GET /auth/csrf",
      "POST /auth/logout",
      "POST /auth/refresh",
      "POST /auth/logout",
    ])
  })

  it("POST /auth/refresh yang dijawab CSRF_INVALID juga diulang dengan token baru", async () => {
    let meCalls = 0
    serve(
      server((call) => {
        if (call.path === "/auth/refresh") return ok({ refreshed: true })
        return ++meCalls === 1 ? fail(401, "UNAUTHORIZED") : ok({ id: "u1" })
      }),
    )

    await expect(unwrap(api.GET("/me"))).resolves.toMatchObject({ data: { id: "u1" } })
    expect(trace()).toEqual(["GET /me", "POST /auth/refresh", "GET /auth/csrf", "POST /auth/refresh", "GET /me"])
  })
})

describe("mode mock", () => {
  beforeEach(() => {
    config.authMocked = true
    setCsrfCookie(null)
  })

  it("ensureCsrfToken memasang cookie tanpa request jaringan", async () => {
    const token = await ensureCsrfToken()

    expect(token).toMatch(/^[0-9a-f]{32}$/)
    expect(readCookie(CSRF_COOKIE)).toBe(token)
    expect(calls).toHaveLength(0)
  })

  it("cookie tidak valid → mock menjawab CSRF_INVALID → token baru → panggilan diulang", async () => {
    setCsrfCookie("palsu")
    const call = vi.fn(async () => {
      mockRequireCsrf()
      return "berhasil"
    })

    await expect(withMockCsrf(call)).resolves.toBe("berhasil")
    expect(call).toHaveBeenCalledTimes(2)
    expect(readCookie(CSRF_COOKIE)).toMatch(/^[0-9a-f]{32}$/)
    expect(calls).toHaveLength(0)
  })

  it("masih CSRF_INVALID setelah token baru → error dilempar tanpa diulang lagi", async () => {
    const call = vi.fn(async () => {
      throw new ApiError(403, "CSRF_INVALID")
    })

    await expect(withMockCsrf(call)).rejects.toMatchObject({ status: 403, code: "CSRF_INVALID" })
    expect(call).toHaveBeenCalledTimes(2)
  })

  it("error lain tidak diulang", async () => {
    const call = vi.fn(async () => {
      throw new ApiError(403, "FORBIDDEN")
    })

    await expect(withMockCsrf(call)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" })
    expect(call).toHaveBeenCalledTimes(1)
  })
})
