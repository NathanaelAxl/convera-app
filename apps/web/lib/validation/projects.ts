import { z } from "zod"

// Aturan yang sama dengan server (openapi.yaml: CreateProjectRequest, UpdateProjectStatusRequest,
// DeleteProjectRequest). Skema ini juga dipakai mock untuk mensimulasikan 422 dari server.

export const PROJECT_NAME_MAX_LENGTH = 100

export const createProjectRequestSchema = z.object({
  name: z
    .string({ error: "Nama proyek wajib diisi." })
    .trim()
    .min(1, "Nama proyek wajib diisi.")
    .max(PROJECT_NAME_MAX_LENGTH, `Nama proyek maksimal ${PROJECT_NAME_MAX_LENGTH} karakter.`),
})

export const updateProjectStatusRequestSchema = z.object({
  is_active: z.boolean({ error: "Status aktif wajib diisi dengan true atau false." }),
})

/** Kecocokan dengan nama proyek dicek server (dan tombol Hapus permanen di client) karena butuh data proyek. */
export const deleteProjectRequestSchema = z.object({
  confirm_name: z
    .string({ error: "Ketik nama proyek untuk konfirmasi." })
    .trim()
    .min(1, "Ketik nama proyek untuk konfirmasi.")
    .max(PROJECT_NAME_MAX_LENGTH, `Nama proyek maksimal ${PROJECT_NAME_MAX_LENGTH} karakter.`),
})

export type CreateProjectFormValues = z.infer<typeof createProjectRequestSchema>
export type DeleteProjectFormValues = z.infer<typeof deleteProjectRequestSchema>
