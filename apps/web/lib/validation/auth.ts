import { z } from "zod"

import { normalizePhone } from "@/lib/phone"

// Aturan yang sama dengan server (openapi.yaml: RegisterRequest, LoginRequest, dst.).
// Skema `*RequestSchema` juga dipakai mock untuk mensimulasikan 422 dari server.

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

const email = z
  .string()
  .trim()
  .min(1, "Email wajib diisi.")
  .max(254, "Email maksimal 254 karakter.")
  .pipe(z.email("Format email tidak valid."))

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password minimal ${PASSWORD_MIN_LENGTH} karakter.`)
  .max(PASSWORD_MAX_LENGTH, `Password maksimal ${PASSWORD_MAX_LENGTH} karakter.`)

const existingPassword = (message: string) =>
  z.string().min(1, message).max(PASSWORD_MAX_LENGTH, `Password maksimal ${PASSWORD_MAX_LENGTH} karakter.`)

export const registerRequestSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi.").max(100, "Nama maksimal 100 karakter."),
  email,
  phone: z
    .string()
    .trim()
    .min(1, "Nomor HP wajib diisi.")
    .max(20, "Nomor HP maksimal 20 karakter.")
    .refine((value) => normalizePhone(value) !== null, "Nomor HP tidak valid. Contoh: 081234567890."),
  password: newPassword,
})

export const loginRequestSchema = z.object({
  email,
  password: existingPassword("Password wajib diisi."),
})

export const forgotPasswordRequestSchema = z.object({ email })

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1, "Token reset tidak ada."),
  new_password: newPassword,
})

export const changePasswordRequestSchema = z.object({
  current_password: existingPassword("Password lama wajib diisi."),
  new_password: newPassword,
})

// Skema form: aturan server + konfirmasi password (hanya di client, tidak dikirim).

const confirmation = z.string().min(1, "Ulangi password.")

export const registerFormSchema = registerRequestSchema
  .extend({ password_confirmation: confirmation })
  .refine((values) => values.password === values.password_confirmation, {
    error: "Konfirmasi password tidak sama.",
    path: ["password_confirmation"],
  })

export const resetPasswordFormSchema = z
  .object({ new_password: newPassword, new_password_confirmation: confirmation })
  .refine((values) => values.new_password === values.new_password_confirmation, {
    error: "Konfirmasi password tidak sama.",
    path: ["new_password_confirmation"],
  })

export const changePasswordFormSchema = changePasswordRequestSchema
  .extend({ new_password_confirmation: confirmation })
  .refine((values) => values.new_password === values.new_password_confirmation, {
    error: "Konfirmasi password tidak sama.",
    path: ["new_password_confirmation"],
  })

export type RegisterFormValues = z.infer<typeof registerFormSchema>
export type LoginFormValues = z.infer<typeof loginRequestSchema>
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordRequestSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>
export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>
