// Alias tipe dari hasil generate OpenAPI (schema.d.ts). Jangan menulis bentuk data API secara manual di sini.
import type { components } from "./schema"

type Schemas = components["schemas"]

export type ApiErrorBody = Schemas["ErrorResponse"]
export type ApiErrorCode = Schemas["ErrorCode"]
export type ApiErrorDetail = Schemas["ErrorDetail"]
export type PaginationMeta = Schemas["PaginationMeta"]
export type Period = Schemas["Period"]

export type User = Schemas["User"]
export type LoggedInUser = Schemas["LoggedInUser"]
export type UserRole = Schemas["UserRole"]
export type RegisterRequest = Schemas["RegisterRequest"]
export type LoginRequest = Schemas["LoginRequest"]
export type ForgotPasswordRequest = Schemas["ForgotPasswordRequest"]
export type ResetPasswordRequest = Schemas["ResetPasswordRequest"]
export type ChangePasswordRequest = Schemas["ChangePasswordRequest"]
export type MessageResult = Schemas["MessageResult"]
export type ResetPasswordResult = Schemas["ResetPasswordResult"]

export type Project = Schemas["Project"]
export type ProjectDetail = Schemas["ProjectDetail"]
export type CreateProjectRequest = Schemas["CreateProjectRequest"]
export type UpdateProjectStatusRequest = Schemas["UpdateProjectStatusRequest"]
export type ProjectStatusResult = Schemas["ProjectStatusResult"]
export type DeleteProjectRequest = Schemas["DeleteProjectRequest"]
export type BusinessCategory = Schemas["BusinessCategory"]
export type WaConnectionType = Schemas["WaConnectionType"]
export type SubscriptionStatus = Schemas["SubscriptionStatus"]

export type WaProvider = Schemas["WaProvider"]
export type ProjectSettings = Schemas["ProjectSettings"]
export type UpdateProjectSettingsRequest = Schemas["UpdateProjectSettingsRequest"]
export type TestCapiResult = Schemas["TestCapiResult"]
export type WebhookSecretResult = Schemas["WebhookSecretResult"]

/** Hasil daftar berpaginasi: `data` + `meta` (PRD 7.1). */
export type Paginated<T> = { data: T[]; meta: PaginationMeta }
