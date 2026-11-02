import type { User } from "../types"
import { getMockSession, setMockSession } from "./session"
import { mockDelay, mockError } from "./utils"

const users: Record<"user" | "admin", User> = {
  user: {
    id: "5b1c8f4e-2a7d-4c1e-9a0b-1f2e3d4c5b6a",
    name: "Rina Saputri",
    email: "rina@contoh.id",
    phone: "6281234567890",
    role: "user",
    created_at: "2026-11-02T03:15:00Z",
  },
  admin: {
    id: "9d2e4f6a-8b1c-4d3e-a5f7-2c4e6a8b0d1f",
    name: "Admin Convera",
    email: "admin@contoh.id",
    phone: "6281100000001",
    role: "admin",
    created_at: "2026-10-01T02:00:00Z",
  },
}

export async function getMe(): Promise<User> {
  await mockDelay()
  const session = getMockSession()
  if (session === "signed-out") mockError(401, "UNAUTHORIZED")
  return users[session]
}

export async function logout(): Promise<void> {
  await mockDelay()
  setMockSession("signed-out")
}
