import type { Project } from "../types"
import { mockDelay } from "./utils"

const projects: Project[] = [
  {
    id: "0f8e2c1a-6b3d-4f5e-8a9b-7c6d5e4f3a2b",
    name: "Toko Dummy & Co. 2026!",
    slug: "toko-dummy-co-2026",
    business_category: "ecommerce",
    is_active: true,
    wa_connection_type: "waba",
    wa_provider: "generic",
    webhook_url: "https://api.example.com/api/v1/webhooks/wa/k7Qm2xPz9LwR4tVb8NcY1sDf6GhJ3aEu",
    subscription_status: "trial",
    trial_ends_at: "2026-11-09T03:16:00Z",
    subscription_ends_at: null,
    created_at: "2026-11-02T03:16:00Z",
  },
  {
    id: "3a7b9c1d-2e4f-4a6b-8c0d-1e3f5a7b9c2d",
    name: "Klinik Gigi Senyum Sehat",
    slug: "klinik-gigi-senyum-sehat",
    business_category: "health",
    is_active: true,
    wa_connection_type: "waba",
    wa_provider: "generic",
    webhook_url: "https://api.example.com/api/v1/webhooks/wa/P3rT8vW1yZ6bD9fH2kM5nQ7sU0xA4cE6",
    subscription_status: "active",
    trial_ends_at: "2026-10-12T04:30:00Z",
    subscription_ends_at: "2027-01-05T04:30:00Z",
    created_at: "2026-10-05T04:30:00Z",
  },
  {
    id: "6c8d0e2f-4a5b-4c7d-9e1f-3a5b7c9d1e3f",
    name: "Warung Makan Bu Sari",
    slug: "warung-makan-bu-sari",
    business_category: "fnb",
    is_active: false,
    wa_connection_type: "waba",
    wa_provider: "generic",
    webhook_url: "https://api.example.com/api/v1/webhooks/wa/G5hJ8kL2mN4pQ6rS9tV1wX3yZ7aB0cD2",
    subscription_status: "expired",
    trial_ends_at: "2026-09-21T01:00:00Z",
    subscription_ends_at: null,
    created_at: "2026-09-14T01:00:00Z",
  },
]

export async function listProjects(): Promise<Project[]> {
  await mockDelay()
  return projects
}
