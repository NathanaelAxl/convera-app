import { normalizePhone } from "@/lib/phone"
import {
  changePasswordRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  resetPasswordRequestSchema,
} from "@/lib/validation/auth"

import type {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoggedInUser,
  LoginRequest,
  MessageResult,
  RegisterRequest,
  ResetPasswordRequest,
  ResetPasswordResult,
  User,
} from "../types"
import { mockRequireCsrf } from "./csrf"
import { DEFAULT_MOCK_USER_ID, getMockSessionUserId, setMockSessionUserId } from "./session"
import { createRateLimiter, mockDelay, mockError, mockValidate } from "./utils"

// "Database" user tiruan di localStorage supaya daftar → keluar → masuk lagi bisa dicoba.
// Password disimpan apa adanya karena ini hanya data mock di browser.

type MockUserRecord = User & { password: string; last_login_at: string | null }
type MockResetToken = { user_id: string; expires_at: string; used_at: string | null }

const USERS_KEY = "convera.mock-users"
const RESET_TOKENS_KEY = "convera.mock-reset-tokens"
const ADMIN_ID = "9d2e4f6a-8b1c-4d3e-a5f7-2c4e6a8b0d1f"

/** Akun contoh untuk masuk di mode mock. */
export const MOCK_ACCOUNTS = {
  user: { id: DEFAULT_MOCK_USER_ID, email: "rina@contoh.id", password: "rahasia-kuat-123" },
  admin: { id: ADMIN_ID, email: "admin@contoh.id", password: "admin-kuat-123" },
} as const

const SEED_USERS: MockUserRecord[] = [
  {
    id: MOCK_ACCOUNTS.user.id,
    name: "Rina Saputri",
    email: MOCK_ACCOUNTS.user.email,
    phone: "6281234567890",
    role: "user",
    created_at: "2026-11-02T03:15:00Z",
    password: MOCK_ACCOUNTS.user.password,
    last_login_at: "2026-11-02T03:20:00Z",
  },
  {
    id: MOCK_ACCOUNTS.admin.id,
    name: "Admin Convera",
    email: MOCK_ACCOUNTS.admin.email,
    phone: "6281100000001",
    role: "admin",
    created_at: "2026-10-01T02:00:00Z",
    password: MOCK_ACCOUNTS.admin.password,
    last_login_at: null,
  },
]

/** Token contoh untuk mencoba tautan kedaluwarsa: /reset-password?token=contoh-token-kedaluwarsa */
const SEED_RESET_TOKENS: Record<string, MockResetToken> = {
  "contoh-token-kedaluwarsa": {
    user_id: DEFAULT_MOCK_USER_ID,
    expires_at: "2026-11-01T00:00:00Z",
    used_at: null,
  },
}

function readJson<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key)
  return raw ? (JSON.parse(raw) as T) : fallback
}

function readUsers() {
  return readJson(USERS_KEY, SEED_USERS)
}

function writeUsers(users: MockUserRecord[]) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function updateUser(id: string, changes: Partial<MockUserRecord>) {
  writeUsers(readUsers().map((user) => (user.id === id ? { ...user, ...changes } : user)))
}

function findByEmail(email: string) {
  // Kolom email bertipe CITEXT: tidak membedakan huruf besar/kecil.
  return readUsers().find((user) => user.email.toLowerCase() === email.toLowerCase())
}

function readResetTokens() {
  return { ...SEED_RESET_TOKENS, ...readJson<Record<string, MockResetToken>>(RESET_TOKENS_KEY, {}) }
}

function writeResetTokens(tokens: Record<string, MockResetToken>) {
  window.localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(tokens))
}

function toUser({ id, name, email, phone, role, created_at }: MockUserRecord): User {
  return { id, name, email, phone, role, created_at }
}

function currentUserOr401() {
  const id = getMockSessionUserId()
  const user = id ? readUsers().find((record) => record.id === id) : undefined
  return user ?? mockError(401, "UNAUTHORIZED")
}

// NFR-12: login 5 percobaan/15 menit, lupa password 3/jam per email.
const loginLimiter = createRateLimiter(5, 15 * 60_000)
const forgotPasswordLimiter = createRateLimiter(3, 60 * 60_000)

export async function register(body: RegisterRequest): Promise<User> {
  await mockDelay()
  mockRequireCsrf()
  const input = mockValidate(registerRequestSchema, body)
  if (findByEmail(input.email)) {
    mockError(409, "CONFLICT", "Email sudah terdaftar.", [
      { field: "email", message: "Email sudah terdaftar. Masuk atau pakai email lain." },
    ])
  }

  const now = new Date().toISOString()
  const record: MockUserRecord = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    phone: normalizePhone(input.phone) ?? input.phone,
    role: "user",
    created_at: now,
    password: input.password,
    last_login_at: now,
  }
  writeUsers([...readUsers(), record])
  setMockSessionUserId(record.id)
  return toUser(record)
}

export async function login(body: LoginRequest): Promise<LoggedInUser> {
  await mockDelay()
  mockRequireCsrf()
  const input = mockValidate(loginRequestSchema, body)
  const key = input.email.toLowerCase()
  if (loginLimiter.isLimited(key)) {
    mockError(429, "RATE_LIMITED", "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.")
  }

  const record = findByEmail(input.email)
  if (!record || record.password !== input.password) {
    loginLimiter.hit(key)
    mockError(401, "UNAUTHORIZED", "Email atau password salah.")
  }

  loginLimiter.reset(key)
  const lastLoginAt = new Date().toISOString()
  updateUser(record.id, { last_login_at: lastLoginAt })
  setMockSessionUserId(record.id)
  const { id, name, email, phone, role } = record
  return { id, name, email, phone, role, last_login_at: lastLoginAt }
}

export async function logout(): Promise<void> {
  await mockDelay()
  mockRequireCsrf()
  currentUserOr401()
  setMockSessionUserId(null)
}

export async function forgotPassword(body: ForgotPasswordRequest): Promise<MessageResult> {
  await mockDelay()
  mockRequireCsrf()
  const input = mockValidate(forgotPasswordRequestSchema, body)
  const key = input.email.toLowerCase()
  if (forgotPasswordLimiter.isLimited(key)) {
    mockError(429, "RATE_LIMITED", "Terlalu banyak permintaan reset. Coba lagi dalam 1 jam.")
  }
  forgotPasswordLimiter.hit(key)

  const record = findByEmail(input.email)
  if (record) {
    const token = crypto.randomUUID().replaceAll("-", "")
    writeResetTokens({
      ...readResetTokens(),
      [token]: { user_id: record.id, expires_at: new Date(Date.now() + 60 * 60_000).toISOString(), used_at: null },
    })
    // Pengganti email: tautan reset ditulis di console browser.
    console.info(`[mock email] Tautan reset untuk ${record.email}: ${window.location.origin}/reset-password?token=${token}`)
  }
  return { message: "Jika email terdaftar, tautan reset sudah dikirim." }
}

export async function resetPassword(body: ResetPasswordRequest): Promise<ResetPasswordResult> {
  await mockDelay()
  mockRequireCsrf()
  const input = mockValidate(resetPasswordRequestSchema, body)
  const tokens = readResetTokens()
  const entry = tokens[input.token]
  if (!entry || entry.used_at || Date.parse(entry.expires_at) <= Date.now()) {
    mockError(400, "BAD_REQUEST", "Tautan reset tidak valid, sudah kedaluwarsa, atau sudah dipakai.")
  }

  updateUser(entry.user_id, { password: input.new_password })
  writeResetTokens({ ...tokens, [input.token]: { ...entry, used_at: new Date().toISOString() } })
  // Semua sesi dicabut.
  setMockSessionUserId(null)
  return { reset: true }
}

export async function getMe(): Promise<User> {
  await mockDelay()
  return toUser(currentUserOr401())
}

export async function changePassword(body: ChangePasswordRequest): Promise<void> {
  await mockDelay()
  mockRequireCsrf()
  const record = currentUserOr401()
  const input = mockValidate(changePasswordRequestSchema, body)
  if (input.current_password !== record.password) {
    mockError(422, "VALIDATION_ERROR", "Data tidak valid.", [{ field: "current_password", message: "Password lama salah." }])
  }
  // Sesi lain dicabut; di mock hanya ada satu sesi, jadi sesi ini tetap aktif.
  updateUser(record.id, { password: input.new_password })
}

/** Masuk cepat tanpa form, untuk panel mode mock di /login. */
export function signInAs(role: keyof typeof MOCK_ACCOUNTS) {
  setMockSessionUserId(MOCK_ACCOUNTS[role].id)
}
