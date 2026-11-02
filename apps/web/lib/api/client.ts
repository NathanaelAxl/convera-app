import createClient from "openapi-fetch"

import { ApiError } from "./errors"
import type { paths } from "./schema"

/** Diteruskan ke API Go lewat `rewrites` di next.config.ts. */
export const API_BASE_URL = "/api/v1"

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

/** 401 di endpoint ini berarti kredensial salah, bukan sesi kedaluwarsa, jadi tidak di-refresh. */
const NO_REFRESH_PATHS = ["/auth/refresh", "/auth/login", "/auth/register"]

function readCookie(name: string) {
  if (typeof document === "undefined") return undefined
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined
}

/** Double-submit CSRF: salin cookie `csrf_token` ke header `X-CSRF-Token` untuk request mutasi. */
function withCsrf(request: Request) {
  const token = MUTATING_METHODS.has(request.method) ? readCookie("csrf_token") : undefined
  if (token) request.headers.set("X-CSRF-Token", token)
  return request
}

const baseClient = createClient<paths>({
  baseUrl: API_BASE_URL,
  credentials: "same-origin",
  fetch: (request) => fetch(withCsrf(request)),
})

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
  const response = await fetch(withCsrf(request))
  if (response.status !== 401) return response

  const path = new URL(request.url).pathname.slice(API_BASE_URL.length)
  if (NO_REFRESH_PATHS.includes(path)) return response
  if (!(await refreshSession())) return response

  return fetch(withCsrf(retry))
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
