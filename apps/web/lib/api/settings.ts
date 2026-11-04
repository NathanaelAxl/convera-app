import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, unwrap, withMockCsrf } from "./client"
import { isMocked } from "./config"
import * as mocks from "./mocks/settings"
import { projectKeys } from "./projects"
import type {
  Project,
  ProjectDetail,
  ProjectSettings,
  TestCapiResult,
  UpdateProjectSettingsRequest,
  WebhookSecretResult,
} from "./types"

export const settingsKeys = {
  all: ["settings"] as const,
  detail: (slug: string) => [...settingsKeys.all, slug] as const,
}

/** `GET /projects/{slug}/settings` */
export async function getProjectSettings(slug: string): Promise<ProjectSettings> {
  if (isMocked("settings")) return mocks.getSettings(slug)
  return (await unwrap(api.GET("/projects/{slug}/settings", { params: { path: { slug } } }))).data
}

/** `PUT /projects/{slug}/settings` */
export async function updateProjectSettings(slug: string, body: UpdateProjectSettingsRequest): Promise<ProjectSettings> {
  if (isMocked("settings")) return withMockCsrf(() => mocks.updateSettings(slug, body))
  return (await unwrap(api.PUT("/projects/{slug}/settings", { params: { path: { slug } }, body }))).data
}

/** `POST /projects/{slug}/settings/test-capi` */
export async function testProjectCapi(slug: string): Promise<TestCapiResult> {
  if (isMocked("settings")) return withMockCsrf(() => mocks.testCapi(slug))
  return (await unwrap(api.POST("/projects/{slug}/settings/test-capi", { params: { path: { slug } } }))).data
}

/** `POST /projects/{slug}/settings/webhook-secret` */
export async function createWebhookSecret(slug: string): Promise<WebhookSecretResult> {
  if (isMocked("settings")) return withMockCsrf(() => mocks.createWebhookSecret(slug))
  return (await unwrap(api.POST("/projects/{slug}/settings/webhook-secret", { params: { path: { slug } } }))).data
}

export function useProjectSettings(slug: string) {
  return useQuery({
    queryKey: settingsKeys.detail(slug),
    queryFn: () => getProjectSettings(slug),
  })
}

/** Nama, kategori, dan koneksi WhatsApp juga tampil di sidebar, Kelola Proyek, dan chip proyek: cache-nya ikut diperbarui. */
export function useUpdateProjectSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, ...body }: { slug: string } & UpdateProjectSettingsRequest) => updateProjectSettings(slug, body),
    onSuccess: (settings, { slug }) => {
      queryClient.setQueryData(settingsKeys.detail(slug), settings)
      const { name, business_category, wa_connection_type, wa_provider, pixel_id, has_capi_access_token } = settings
      const changes = { name, business_category, wa_connection_type, wa_provider }
      queryClient.setQueryData<Project[]>(projectKeys.list(), (projects) =>
        projects?.map((project) => (project.slug === slug ? { ...project, ...changes } : project)),
      )
      queryClient.setQueryData<ProjectDetail>(
        projectKeys.detail(slug),
        (project) => project && { ...project, ...changes, pixel_id, has_capi_access_token },
      )
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useTestProjectCapi() {
  return useMutation({ mutationFn: testProjectCapi })
}

export function useCreateWebhookSecret() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createWebhookSecret,
    onSuccess: ({ has_webhook_secret }, slug) => {
      queryClient.setQueryData<ProjectSettings>(
        settingsKeys.detail(slug),
        (settings) => settings && { ...settings, has_webhook_secret },
      )
    },
  })
}
