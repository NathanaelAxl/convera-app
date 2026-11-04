import type { z } from "zod"

import { ApiError } from "../errors"
import type { ApiErrorCode, ApiErrorDetail } from "../types"

/** Jeda kecil agar state loading terlihat seperti memanggil API sungguhan. */
export function mockDelay(ms = 300) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/**
 * Melempar error dengan bentuk yang sama seperti respons error API (PRD 7.1).
 * `code` wajib dari enum `ErrorCode` di openapi.yaml.
 */
export function mockError(status: number, code: ApiErrorCode, message?: string, details?: ApiErrorDetail[]): never {
  throw new ApiError(status, code, message, details)
}

/** Nama field di `details` seperti server: indeks array memakai kurung siku, misalnya `slots[1].custom_event_name`. */
export function formatIssuePath(path: readonly PropertyKey[]) {
  return path.reduce<string>((field, segment) => {
    if (typeof segment === "number") return `${field}[${segment}]`
    return field ? `${field}.${String(segment)}` : String(segment)
  }, "")
}

/** Validasi body seperti server: gagal → 422 `VALIDATION_ERROR` dengan detail per field. */
export function mockValidate<T extends z.ZodType>(schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body)
  if (result.success) return result.data
  mockError(
    422,
    "VALIDATION_ERROR",
    "Data tidak valid.",
    result.error.issues.map((issue) => ({ field: formatIssuePath(issue.path), message: issue.message })),
  )
}

/** Rate limit sederhana per kunci di memori (hilang saat halaman dimuat ulang). */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  const recent = (key: string) => (hits.get(key) ?? []).filter((time) => Date.now() - time < windowMs)
  return {
    isLimited: (key: string) => recent(key).length >= limit,
    hit: (key: string) => hits.set(key, [...recent(key), Date.now()]),
    reset: (key: string) => hits.delete(key),
  }
}

const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

/** String acak `[A-Za-z0-9]` dari CSPRNG, misalnya untuk `webhook_key` dan Webhook Secret. */
export function randomAlphanumeric(length: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), (byte) => ALPHANUMERIC[byte % ALPHANUMERIC.length]).join(
    "",
  )
}
