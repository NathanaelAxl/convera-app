import { isProjectNameConfirmed, slugifyProjectName, uniqueSlug } from "@/lib/projects"
import {
  createProjectRequestSchema,
  deleteProjectRequestSchema,
  updateProjectStatusRequestSchema,
} from "@/lib/validation/projects"

import type {
  CreateProjectRequest,
  DeleteProjectRequest,
  Project,
  ProjectDetail,
  ProjectStatusResult,
  UpdateProjectStatusRequest,
} from "../types"
import { mockRequireCsrf } from "./csrf"
import { DEFAULT_MOCK_USER_ID, getMockSessionUserId } from "./session"
import { mockDelay, mockError, mockValidate, randomAlphanumeric } from "./utils"

// "Tabel" projects tiruan di localStorage, berisi proyek semua user, supaya slug unik global (FR-08)
// dan 404 untuk proyek milik user lain (FR-13) bisa dicoba. Modul `settings` (mocks/settings.ts) memakai tabel yang sama.

export type MockProjectRecord = Project & {
  user_id: string
  updated_at: string
  pixel_id: string | null
  /** Di server terenkripsi (`capi_access_token_enc`); mock menyimpannya apa adanya, tetapi tidak pernah mengirimnya utuh. */
  capi_access_token: string | null
  test_event_code: string | null
  /** Di server terenkripsi (`webhook_secret_enc`). */
  webhook_secret: string | null
  setup_complete: boolean
}

/** Versi di kunci dinaikkan saat bentuk record berubah, agar data lama di browser tidak terbaca dengan bentuk baru. */
const PROJECTS_KEY = "convera.mock-projects.v2"

/** Domain API masih placeholder (Pertanyaan Terbuka 1). */
const WEBHOOK_BASE_URL = "https://api.example.com/api/v1/webhooks/wa/"

/** Pemilik proyek contoh milik user lain; tidak ada di daftar akun mock, jadi tidak bisa dipakai masuk. */
export const OTHER_USER_ID = "7c4e2a9b-1d3f-4b5a-8e6c-0f2d4b6a8c1e"

const SEED_PROJECTS: MockProjectRecord[] = [
  {
    id: "0f8e2c1a-6b3d-4f5e-8a9b-7c6d5e4f3a2b",
    name: "Toko Dummy & Co. 2026!",
    slug: "toko-dummy-co-2026",
    business_category: "ecommerce",
    is_active: true,
    wa_connection_type: "waba",
    wa_provider: "generic",
    webhook_url: `${WEBHOOK_BASE_URL}k7Qm2xPz9LwR4tVb8NcY1sDf6GhJ3aEu`,
    subscription_status: "trial",
    trial_ends_at: "2026-11-09T03:16:00Z",
    subscription_ends_at: null,
    created_at: "2026-11-02T03:16:00Z",
    user_id: DEFAULT_MOCK_USER_ID,
    updated_at: "2026-11-02T03:16:00Z",
    pixel_id: "123456789012345",
    capi_access_token: "EAAGm0PX4ZCpsBAOZBk7rT2vWq9LdN3hXyQ1sF8uJcV5pR6mK0tZx9a",
    test_event_code: "TEST48213",
    webhook_secret: "whsec_9Hf3Kd7Lp2Qx6Rv1Tz8Wb4Nc5Mg0Js",
    setup_complete: false,
  },
  {
    id: "3a7b9c1d-2e4f-4a6b-8c0d-1e3f5a7b9c2d",
    name: "Klinik Gigi Senyum Sehat",
    slug: "klinik-gigi-senyum-sehat",
    business_category: "health",
    is_active: true,
    wa_connection_type: "waba",
    wa_provider: "generic",
    webhook_url: `${WEBHOOK_BASE_URL}P3rT8vW1yZ6bD9fH2kM5nQ7sU0xA4cE6`,
    subscription_status: "active",
    trial_ends_at: "2026-10-12T04:30:00Z",
    subscription_ends_at: "2027-01-05T04:30:00Z",
    created_at: "2026-10-05T04:30:00Z",
    user_id: DEFAULT_MOCK_USER_ID,
    updated_at: "2026-10-20T08:12:00Z",
    pixel_id: "987654321098765",
    capi_access_token: "EAAJx3Qm8ZBnW1oBAPk2Lr7Ty5Hs9Vd4Cf6Gu0Ne3Wa8Ki1Mz7Rb2",
    test_event_code: null,
    webhook_secret: "whsec_2Bv7Nc4Xz9Lk1Jh6Gf3Ds8Aq5Wr0Ty7",
    setup_complete: true,
  },
  {
    id: "6c8d0e2f-4a5b-4c7d-9e1f-3a5b7c9d1e3f",
    name: "Warung Makan Bu Sari",
    slug: "warung-makan-bu-sari",
    business_category: "fnb",
    is_active: false,
    wa_connection_type: "waba",
    wa_provider: "generic",
    webhook_url: `${WEBHOOK_BASE_URL}G5hJ8kL2mN4pQ6rS9tV1wX3yZ7aB0cD2`,
    subscription_status: "expired",
    trial_ends_at: "2026-09-21T01:00:00Z",
    subscription_ends_at: null,
    created_at: "2026-09-14T01:00:00Z",
    user_id: DEFAULT_MOCK_USER_ID,
    updated_at: "2026-09-30T02:45:00Z",
    pixel_id: null,
    capi_access_token: null,
    test_event_code: null,
    webhook_secret: null,
    setup_complete: false,
  },
  {
    id: "b2d4f6a8-0c1e-4a3b-9d5f-7e9a1c3e5b7d",
    name: "Butik Kebaya Ayu",
    slug: "butik-kebaya-ayu",
    business_category: "ecommerce",
    is_active: true,
    wa_connection_type: "waba",
    wa_provider: "generic",
    webhook_url: `${WEBHOOK_BASE_URL}Xw4Ty7Ua0Ib3Oc6Pd9Qe2Rf5Sg8Th1Ui`,
    subscription_status: "trial",
    trial_ends_at: "2026-11-08T07:00:00Z",
    subscription_ends_at: null,
    created_at: "2026-11-01T07:00:00Z",
    user_id: OTHER_USER_ID,
    updated_at: "2026-11-01T07:00:00Z",
    pixel_id: "556677889900112",
    capi_access_token: "EAAKp4Wn2ZBrT8oBAJm5Qs1Yv7Xc3Hd9Lg6Fe0Ub4Ri2Ot8Na5Kz1",
    test_event_code: null,
    webhook_secret: "whsec_6Mq1Wd8Ys3Pk5Lz7Hx0Bv4Ng2Rc9Tj1",
    setup_complete: true,
  },
]

export function readProjects(): MockProjectRecord[] {
  const raw = window.localStorage.getItem(PROJECTS_KEY)
  return raw ? (JSON.parse(raw) as MockProjectRecord[]) : SEED_PROJECTS
}

export function writeProjects(records: MockProjectRecord[]) {
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(records))
}

export function currentUserIdOr401() {
  return getMockSessionUserId() ?? mockError(401, "UNAUTHORIZED")
}

/** Pemeriksaan kepemilikan seperti `WHERE slug = $1 AND user_id = $2` (NFR-08): milik user lain → 404. */
export function findOwnedOr404(userId: string, slug: string) {
  const record = readProjects().find((project) => project.slug === slug && project.user_id === userId)
  return record ?? mockError(404, "NOT_FOUND", "Proyek tidak ditemukan.")
}

function toProject(record: MockProjectRecord): Project {
  const {
    id,
    name,
    slug,
    business_category,
    is_active,
    wa_connection_type,
    wa_provider,
    webhook_url,
    subscription_status,
    trial_ends_at,
    subscription_ends_at,
    created_at,
  } = record
  return {
    id,
    name,
    slug,
    business_category,
    is_active,
    wa_connection_type,
    wa_provider,
    webhook_url,
    subscription_status,
    trial_ends_at,
    subscription_ends_at,
    created_at,
  }
}

/** Trial atau langganan habis (Fase 3); mock memakai status yang tersimpan. */
export function isLocked(record: MockProjectRecord) {
  return record.subscription_status === "expired"
}

function toDetail(record: MockProjectRecord): ProjectDetail {
  return {
    ...toProject(record),
    is_locked: isLocked(record),
    has_capi_access_token: record.capi_access_token !== null,
    pixel_id: record.pixel_id,
    setup_complete: record.setup_complete,
  }
}

export async function listProjects(): Promise<Project[]> {
  await mockDelay()
  const userId = currentUserIdOr401()
  return readProjects()
    .filter((record) => record.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toProject)
}

export async function createProject(body: CreateProjectRequest): Promise<Project> {
  await mockDelay()
  mockRequireCsrf()
  const userId = currentUserIdOr401()
  const input = mockValidate(createProjectRequestSchema, body)

  const records = readProjects()
  const slug = uniqueSlug(slugifyProjectName(input.name), (candidate) =>
    records.some((record) => record.slug === candidate),
  )
  const now = new Date()
  const record: MockProjectRecord = {
    id: crypto.randomUUID(),
    name: input.name,
    slug,
    business_category: "general",
    is_active: true,
    wa_connection_type: "waba",
    wa_provider: "generic",
    webhook_url: `${WEBHOOK_BASE_URL}${randomAlphanumeric(32)}`,
    subscription_status: "trial",
    trial_ends_at: new Date(now.getTime() + 7 * 24 * 60 * 60_000).toISOString(),
    subscription_ends_at: null,
    created_at: now.toISOString(),
    user_id: userId,
    updated_at: now.toISOString(),
    pixel_id: null,
    capi_access_token: null,
    test_event_code: null,
    webhook_secret: null,
    setup_complete: false,
  }
  writeProjects([...records, record])
  return toProject(record)
}

export async function getProject(slug: string): Promise<ProjectDetail> {
  await mockDelay()
  const userId = currentUserIdOr401()
  return toDetail(findOwnedOr404(userId, slug))
}

export async function updateProjectStatus(slug: string, body: UpdateProjectStatusRequest): Promise<ProjectStatusResult> {
  await mockDelay()
  mockRequireCsrf()
  const userId = currentUserIdOr401()
  const record = findOwnedOr404(userId, slug)
  const input = mockValidate(updateProjectStatusRequestSchema, body)

  const updatedAt = new Date().toISOString()
  writeProjects(
    readProjects().map((project) =>
      project.id === record.id ? { ...project, is_active: input.is_active, updated_at: updatedAt } : project,
    ),
  )
  return { slug: record.slug, is_active: input.is_active, updated_at: updatedAt }
}

export async function deleteProject(slug: string, body: DeleteProjectRequest): Promise<void> {
  await mockDelay()
  mockRequireCsrf()
  const userId = currentUserIdOr401()
  const record = findOwnedOr404(userId, slug)
  const input = mockValidate(deleteProjectRequestSchema, body)
  if (!isProjectNameConfirmed(record.name, input.confirm_name)) {
    mockError(422, "VALIDATION_ERROR", "Data tidak valid.", [
      { field: "confirm_name", message: "Nama yang diketik tidak sama dengan nama proyek." },
    ])
  }
  writeProjects(readProjects().filter((project) => project.id !== record.id))
}
