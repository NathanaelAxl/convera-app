// Alias tipe dari hasil generate OpenAPI (schema.d.ts). Jangan menulis bentuk data API secara manual di sini.
import type { components } from "./schema"

type Schemas = components["schemas"]

export type ApiErrorBody = Schemas["ErrorResponse"]
export type ApiErrorCode = Schemas["ErrorCode"]
export type ApiErrorDetail = Schemas["ErrorDetail"]
export type PaginationMeta = Schemas["PaginationMeta"]
export type Period = Schemas["Period"]

export type User = Schemas["User"]
export type UserRole = Schemas["UserRole"]

export type Project = Schemas["Project"]
export type BusinessCategory = Schemas["BusinessCategory"]
export type WaConnectionType = Schemas["WaConnectionType"]
export type SubscriptionStatus = Schemas["SubscriptionStatus"]

/** Hasil daftar berpaginasi: `data` + `meta` (PRD 7.1). */
export type Paginated<T> = { data: T[]; meta: PaginationMeta }
