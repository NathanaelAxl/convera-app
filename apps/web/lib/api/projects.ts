import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"

import { api, unwrap } from "./client"
import { isMocked } from "./config"
import * as mocks from "./mocks/projects"
import type { Project } from "./types"

export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
}

/** `GET /projects` */
export async function listProjects(): Promise<Project[]> {
  if (isMocked("projects")) return mocks.listProjects()
  return (await unwrap(api.GET("/projects"))).data
}

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: listProjects,
  })
}

/** Proyek dari segmen `[slug]` di URL; `project` kosong bila slug tidak ada di daftar milik user. */
export function useCurrentProject() {
  const { slug } = useParams<{ slug?: string }>()
  const projects = useProjects()
  return {
    slug,
    project: slug ? projects.data?.find((project) => project.slug === slug) : undefined,
    isPending: projects.isPending,
    error: projects.error,
  }
}
