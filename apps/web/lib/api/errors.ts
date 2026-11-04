import type { FieldValues, Path, UseFormSetError } from "react-hook-form"

import type { ApiErrorBody, ApiErrorCode, ApiErrorDetail } from "./types"

/**
 * Kode yang dibuat di browser, bukan dikirim API: gagal terhubung, atau body error
 * yang bukan format PRD 7.1 (misalnya halaman error proxy).
 */
export type ClientErrorCode = "NETWORK_ERROR" | `HTTP_${number}`

const DEFAULT_MESSAGES: Record<number, string> = {
  0: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
  400: "Permintaan tidak valid.",
  401: "Sesi Anda berakhir. Silakan masuk kembali.",
  402: "Langganan proyek ini sudah habis.",
  403: "Anda tidak punya akses ke halaman ini.",
  404: "Data tidak ditemukan.",
  409: "Data sudah ada.",
  413: "File terlalu besar.",
  415: "Tipe file tidak didukung.",
  422: "Data tidak valid.",
  429: "Terlalu banyak permintaan. Coba lagi beberapa saat lagi.",
  500: "Terjadi kesalahan di server. Coba lagi beberapa saat lagi.",
  502: "Layanan eksternal sedang bermasalah. Coba lagi beberapa saat lagi.",
}

function defaultMessage(status: number) {
  return DEFAULT_MESSAGES[status] ?? DEFAULT_MESSAGES[status >= 500 ? 500 : 400]
}

/** Error dari API dengan bentuk `error.code`, `error.message`, `error.details` (PRD 7.1). */
export class ApiError extends Error {
  readonly status: number
  /** Kode dari enum `ErrorCode` di openapi.yaml, atau kode khusus browser. */
  readonly code: ApiErrorCode | ClientErrorCode
  readonly details: ApiErrorDetail[]

  constructor(
    status: number,
    code: ApiErrorCode | ClientErrorCode,
    message?: string,
    details: ApiErrorDetail[] = [],
  ) {
    super(message || defaultMessage(status))
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }

  /** Membaca body error dari API; body yang bukan format PRD 7.1 menjadi `HTTP_<status>`. */
  static fromResponse(status: number, body: unknown): ApiError {
    const error = (body as Partial<ApiErrorBody> | null)?.error
    if (error && typeof error.code === "string") {
      return new ApiError(status, error.code, error.message, Array.isArray(error.details) ? error.details : [])
    }
    return new ApiError(status, `HTTP_${status}`)
  }

  static network(): ApiError {
    return new ApiError(0, "NETWORK_ERROR")
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isUnauthorized(error: unknown) {
  return isApiError(error) && error.status === 401
}

/** Pesan yang aman ditampilkan ke user (misalnya di toast). */
export function getErrorMessage(error: unknown) {
  return isApiError(error) ? error.message : defaultMessage(500)
}

/**
 * Menampilkan `error.details` per field di form react-hook-form.
 * `toFormField` mengubah nama field API ke nama field form, misalnya `slots[1].x` → `slots.1.x`.
 * Mengembalikan `true` bila ada detail yang dipasang ke field.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  toFormField: (field: string) => string = (field) => field,
) {
  if (!isApiError(error) || error.details.length === 0) return false
  error.details.forEach((detail, index) => {
    setError(
      toFormField(detail.field) as Path<T>,
      { type: "server", message: detail.message },
      { shouldFocus: index === 0 },
    )
  })
  return true
}
