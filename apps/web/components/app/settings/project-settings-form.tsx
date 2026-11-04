"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useId } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Skeleton } from "@/components/ui/skeleton"
import { applyFieldErrors, getErrorMessage, isApiError } from "@/lib/api/errors"
import { useProjectSettings, useUpdateProjectSettings } from "@/lib/api/settings"
import type { ProjectSettings } from "@/lib/api/types"
import {
  projectSettingsFormSchema,
  settingsToFormValues,
  toUpdateSettingsRequest,
  type ProjectSettingsFormValues,
  type ValidProjectSettingsFormValues,
} from "@/lib/validation/settings"

import { ErrorState } from "../error-state"
import { LoadError } from "../load-error"
import { UnsavedChangesGuard } from "../unsaved-changes-guard"
import { MetaCapiCard } from "./meta-capi-card"
import { ProjectInfoCard } from "./project-info-card"
import { StickySaveBar } from "./sticky-save-bar"
import { WhatsAppConnectionCard } from "./whatsapp-connection-card"

/** Isi halaman Pengaturan Proyek: semua kartu disimpan bersama lewat `StickySaveBar` (PRD 8.3). */
export function ProjectSettingsForm({ slug }: { slug: string }) {
  const settings = useProjectSettings(slug)

  if (settings.isPending) return <SettingsSkeleton />
  if (isApiError(settings.error) && settings.error.status === 404) return <ErrorState code={404} />
  if (settings.isError) return <LoadError error={settings.error} onRetry={() => settings.refetch()} />
  return <SettingsEditor key={slug} slug={slug} settings={settings.data} />
}

function SettingsEditor({ slug, settings }: { slug: string; settings: ProjectSettings }) {
  const formId = useId()
  const updateSettings = useUpdateProjectSettings()
  const form = useForm<ProjectSettingsFormValues, unknown, ValidProjectSettingsFormValues>({
    resolver: zodResolver(projectSettingsFormSchema),
    defaultValues: settingsToFormValues(settings),
  })
  const { isDirty, dirtyFields } = form.formState
  const capiDirty = Boolean(dirtyFields.pixel_id || dirtyFields.capi_access_token || dirtyFields.test_event_code)

  const onSubmit = form.handleSubmit(
    async (values) => {
      if (!form.formState.isDirty) return
      try {
        const saved = await updateSettings.mutateAsync({ slug, ...toUpdateSettingsRequest(values) })
        // Field token dan secret kembali kosong; yang tersimpan tampil sebagai status tersamar.
        form.reset(settingsToFormValues(saved))
        toast.success("Pengaturan disimpan.")
      } catch (error) {
        if (applyFieldErrors(error, form.setError)) toast.error("Periksa kembali isian yang ditandai.")
        else toast.error(getErrorMessage(error))
      }
    },
    () => toast.error("Periksa kembali isian yang ditandai."),
  )

  return (
    <>
      <form id={formId} method="post" onSubmit={onSubmit} noValidate className="max-w-3xl space-y-6">
        <ProjectInfoCard control={form.control} />
        <MetaCapiCard control={form.control} slug={slug} settings={settings} hasUnsavedChanges={capiDirty} />
        <WhatsAppConnectionCard
          control={form.control}
          slug={slug}
          settings={settings}
          onSecretGenerated={() => form.resetField("webhook_secret", { defaultValue: "" })}
        />
      </form>
      <StickySaveBar
        formId={formId}
        dirty={isDirty}
        pending={updateSettings.isPending}
        onDiscard={() => form.reset(settingsToFormValues(settings))}
      />
      <UnsavedChangesGuard
        when={isDirty}
        onLeave={() => form.reset(settingsToFormValues(settings))}
        description="Perubahan di halaman Pengaturan yang belum disimpan akan dibuang."
      />
    </>
  )
}

function SettingsSkeleton() {
  return (
    <div aria-busy="true" className="max-w-3xl space-y-6">
      <span className="sr-only" role="status">
        Memuat pengaturan…
      </span>
      <Skeleton className="h-52 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}
