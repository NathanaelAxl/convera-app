import createClient from "openapi-fetch"

import { isMocked } from "./config"
import { CSRF_COOKIE, readCookie } from "./cookies"
import { ApiError, isApiError } from "./errors"
import { issueCsrfToken as issueMockCsrfToken } from "./mocks/csrf"
import type { paths } from "./schema"
import type { ApiErrorBody } from "./types"

/** Diteruskan ke API Go lewat `rewrites` di next.config.ts. */
export const API_BASE_URL = "/api/v1"

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

/** 401 di endpoint ini berarti kredensial salah, bukan sesi kedaluwarsa, jadi tidak di-refresh. */
const NO_REFRESH_PATHS = ["/auth/refresh", "/auth/login", "/auth/register"]

/** Double-submit CSRF: salin cookie `csrf_token` ke header `X-CSRF-Token` untuk request mutasi. */
async function withCsrf(request: Request) {
  if (!MUTATING_METHODS.has(request.method)) return request
  const token = await ensureCsrfToken()
  if (token) request.headers.set("X-CSRF-Token", token)
  return request
}

async function isCsrfInvalid(response: Response) {
  if (response.status !== 403) return false
  const body = (await response
    .clone()
    .json()
    .catch(() => null)) as Partial<ApiErrorBody> | null
  return body?.error?.code === "CSRF_INVALID"
}

/** Kirim request dengan header CSRF. Bila dijawab 403 `CSRF_INVALID`, ambil token baru sekali lalu ulangi. */
async function fetchWithCsrf(request: Request) {
  const retry = request.clone()
  const response = await fetch(await withCsrf(request))
  if (!(await isCsrfInvalid(response))) return response
  if (!(await issueCsrfToken())) return response
  return fetch(await withCsrf(retry))
}

const baseClient = createClient<paths>({
  baseUrl: API_BASE_URL,
  credentials: "same-origin",
  fetch: fetchWithCsrf,
})

let issuingCsrf: Promise<boolean> | null = null

/** Satu `GET /auth/csrf` untuk semua request yang menunggu bersamaan. `true` bila cookie baru terpasang. */
function issueCsrfToken() {
  issuingCsrf ??= (
    isMocked("auth")
      ? issueMockCsrfToken().then(() => true)
      : baseClient.GET("/auth/csrf").then(({ response }) => response.ok)
  )
    .catch(() => false)
    .finally(() => {
      issuingCsrf = null
    })
  return issuingCsrf
}

/**
 * Memastikan cookie `csrf_token` ada sebelum request mutasi; bila belum, panggil `GET /auth/csrf`.
 * Mengembalikan nilai cookie, atau `undefined` bila gagal (request tetap dikirim dan server menjawab 403).
 */
export async function ensureCsrfToken() {
  const existing = readCookie(CSRF_COOKIE)
  if (existing) return existing
  await issueCsrfToken()
  return readCookie(CSRF_COOKIE)
}

/**
 * Mutasi di mode mock melewati klien HTTP; bungkus dengan ini agar alur CSRF-nya sama dengan mode asli:
 * cookie dipasang bila belum ada, dan 403 `CSRF_INVALID` dari mock diulang sekali dengan token baru.
 */
export async function withMockCsrf<T>(call: () => Promise<T>): Promise<T> {
  await ensureCsrfToken()
  try {
    return await call()
  } catch (error) {
    if (!isApiError(error) || error.code !== "CSRF_INVALID") throw error
    if (!(await issueCsrfToken())) throw error
    return call()
  }
}

let refreshing: Promise<boolean> | null = null

/** Satu refresh untuk semua request yang mendapat 401 bersamaan. */
function refreshSession() {
  refreshing ??= baseClient
    .POST("/auth/refresh")
    .then(({ response }) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

async function fetchWithRefresh(request: Request) {
  const retry = request.clone()
  const response = await fetchWithCsrf(request)
  if (response.status !== 401) return response

  const path = new URL(request.url).pathname.slice(API_BASE_URL.length)
  if (NO_REFRESH_PATHS.includes(path)) return response
  if (!(await refreshSession())) return response

  return fetchWithCsrf(retry)
}

/** Klien bertipe dari openapi.yaml. Pakai lewat `unwrap()` dari modul di lib/api, bukan dari halaman. */
export const api = createClient<paths>({
  baseUrl: API_BASE_URL,
  credentials: "same-origin",
  fetch: fetchWithRefresh,
})

type ClientResult<T> = { data?: T; error?: unknown; response: Response }

/**
 * Mengembalikan body sukses (`{ data }` atau `{ data, meta }`) atau melempar `ApiError`.
 * Respons 204 menghasilkan `undefined`.
 */
export async function unwrap<T>(request: Promise<ClientResult<T>>): Promise<T> {
  let result: ClientResult<T>
  try {
    result = await request
  } catch {
    throw ApiError.network()
  }
  if (!result.response.ok) throw ApiError.fromResponse(result.response.status, result.error)
  return result.data as T
}
