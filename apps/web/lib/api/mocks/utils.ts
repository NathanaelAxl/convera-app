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
