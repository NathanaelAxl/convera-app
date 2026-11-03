import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"

import { api, unwrap, withMockCsrf } from "./client"
import { isMocked } from "./config"
import * as mocks from "./mocks/projects"
import type {
  CreateProjectRequest,
  DeleteProjectRequest,
  Project,
  ProjectDetail,
  ProjectStatusResult,
  UpdateProjectStatusRequest,
} from "./types"

export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
  detail: (slug: string) => [...projectKeys.all, "detail", slug] as const,
}

/** `GET /projects` */
export async function listProjects(): Promise<Project[]> {
  if (isMocked("projects")) return mocks.listProjects()
  return (await unwrap(api.GET("/projects"))).data
}

/** `POST /projects` */
export async function createProject(body: CreateProjectRequest): Promise<Project> {
  if (isMocked("projects")) return withMockCsrf(() => mocks.createProject(body))
  return (await unwrap(api.POST("/projects", { body }))).data
}

/** `GET /projects/{slug}` */
export async function getProject(slug: string): Promise<ProjectDetail> {
  if (isMocked("projects")) return mocks.getProject(slug)
  return (await unwrap(api.GET("/projects/{slug}", { params: { path: { slug } } }))).data
}

/** `PATCH /projects/{slug}/status` */
export async function updateProjectStatus(slug: string, body: UpdateProjectStatusRequest): Promise<ProjectStatusResult> {
  if (isMocked("projects")) return withMockCsrf(() => mocks.updateProjectStatus(slug, body))
  return (await unwrap(api.PATCH("/projects/{slug}/status", { params: { path: { slug } }, body }))).data
}

/** `DELETE /projects/{slug}` */
export async function deleteProject(slug: string, body: DeleteProjectRequest): Promise<void> {
  if (isMocked("projects")) return withMockCsrf(() => mocks.deleteProject(slug, body))
  await unwrap(api.DELETE("/projects/{slug}", { params: { path: { slug } }, body }))
}

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: listProjects,
  })
}

export function useProject(slug: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(slug ?? ""),
    queryFn: () => getProject(slug ?? ""),
    enabled: Boolean(slug),
  })
}

/** Proyek dari segmen `[slug]` di URL lewat `GET /projects/{slug}`; slug yang tidak ada atau milik user lain → error 404. */
export function useCurrentProject() {
  const { slug } = useParams<{ slug?: string }>()
  const project = useProject(slug)
  return {
    slug,
    project: project.data,
    isPending: project.isPending,
    error: project.error,
    refetch: project.refetch,
  }
}

/** Proyek baru langsung muncul di sidebar dan Kelola Proyek, paling atas seperti urutan `GET /projects`. */
export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProject,
    onSuccess: (project) => {
      queryClient.setQueryData<Project[]>(projectKeys.list(), (projects) => projects && [project, ...projects])
      void queryClient.invalidateQueries({ queryKey: projectKeys.list() })
    },
  })
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, ...body }: { slug: string } & UpdateProjectStatusRequest) => updateProjectStatus(slug, body),
    onSuccess: ({ slug, is_active }) => {
      queryClient.setQueryData<Project[]>(projectKeys.list(), (projects) =>
        projects?.map((project) => (project.slug === slug ? { ...project, is_active } : project)),
      )
      queryClient.setQueryData<ProjectDetail>(projectKeys.detail(slug), (project) => project && { ...project, is_active })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, ...body }: { slug: string } & DeleteProjectRequest) => deleteProject(slug, body),
    onSuccess: (_, { slug }) => {
      queryClient.setQueryData<Project[]>(projectKeys.list(), (projects) =>
        projects?.filter((project) => project.slug !== slug),
      )
      queryClient.removeQueries({ queryKey: projectKeys.detail(slug) })
    },
  })
}
