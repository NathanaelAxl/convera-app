"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useId, type FormEvent } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Skeleton } from "@/components/ui/skeleton"
import { applyFieldErrors, getErrorMessage, isApiError } from "@/lib/api/errors"
import { useEventSlots, useUpdateEventSlots } from "@/lib/api/mapping"
import { useProjectSettings, useUpdateProjectSettings } from "@/lib/api/settings"
import type { EventSlot, ProjectSettings } from "@/lib/api/types"
import {
  eventMappingFormSchema,
  slotsToFormValues,
  toSlotFormField,
  toUpdateEventSlotsRequest,
  type EventMappingFormValues,
} from "@/lib/validation/mapping"
import {
  projectSettingsFormSchema,
  settingsToFormValues,
  toUpdateSettingsRequest,
  type ProjectSettingsFormValues,
  type ValidProjectSettingsFormValues,
} from "@/lib/validation/settings"

import { ErrorState } from "../error-state"
import { LoadError } from "../load-error"
import { EventMappingCard } from "../mapping/event-mapping-card"
import { UnsavedChangesGuard } from "../unsaved-changes-guard"
import { MetaCapiCard } from "./meta-capi-card"
import { ProjectInfoCard } from "./project-info-card"
import { StickySaveBar } from "./sticky-save-bar"
import { WhatsAppConnectionCard } from "./whatsapp-connection-card"

const CHECK_FIELDS_MESSAGE = "Periksa kembali isian yang ditandai."

/** Isi halaman Pengaturan Proyek: semua kartu, termasuk Event Mapping, disimpan bersama lewat `StickySaveBar` (PRD 8.3). */
export function ProjectSettingsForm({ slug }: { slug: string }) {
  const settings = useProjectSettings(slug)
  const slots = useEventSlots(slug)

  if (settings.isPending || slots.isPending) return <SettingsSkeleton />
  const error = settings.error ?? slots.error
  if (isApiError(error) && error.status === 404) return <ErrorState code={404} />
  if (settings.isError || slots.isError) {
    return (
      <LoadError
        error={error}
        onRetry={() => {
          if (settings.isError) void settings.refetch()
          if (slots.isError) void slots.refetch()
        }}
      />
    )
  }
  return <SettingsEditor key={slug} slug={slug} settings={settings.data} slots={slots.data} />
}

function SettingsEditor({ slug, settings, slots }: { slug: string; settings: ProjectSettings; slots: EventSlot[] }) {
  const formId = useId()
  const updateSettings = useUpdateProjectSettings()
  const updateSlots = useUpdateEventSlots()
  const form = useForm<ProjectSettingsFormValues, unknown, ValidProjectSettingsFormValues>({
    resolver: zodResolver(projectSettingsFormSchema),
    defaultValues: settingsToFormValues(settings),
  })
  // Modul `mapping` punya endpoint sendiri (PUT /event-slots), jadi slot memakai form terpisah yang disimpan bersama.
  const mapping = useForm<EventMappingFormValues>({
    resolver: zodResolver(eventMappingFormSchema),
    defaultValues: slotsToFormValues(slots),
  })
  const { isDirty, dirtyFields } = form.formState
  const dirty = isDirty || mapping.formState.isDirty
  const pending = updateSettings.isPending || updateSlots.isPending
  const capiDirty = Boolean(dirtyFields.pixel_id || dirtyFields.capi_access_token || dirtyFields.test_event_code)

  function discard() {
    form.reset(settingsToFormValues(settings))
    mapping.reset(slotsToFormValues(slots))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    // Kedua form divalidasi dulu; tidak ada yang dikirim bila salah satunya tidak valid. Event Mapping diperiksa
    // lebih dulu supaya fokus akhirnya jatuh ke error pertama di halaman (kartu pengaturan ada di atasnya).
    let mappingValues: EventMappingFormValues | undefined
    let settingsValues: ValidProjectSettingsFormValues | undefined
    await mapping.handleSubmit((values) => {
      mappingValues = values
    })()
    await form.handleSubmit((values) => {
      settingsValues = values
    })()
    if (!mappingValues || !settingsValues) {
      toast.error(CHECK_FIELDS_MESSAGE)
      return
    }

    const saveSettings = form.formState.isDirty
    const saveMapping = mapping.formState.isDirty
    if (!saveSettings && !saveMapping) return

    const [settingsResult, mappingResult] = await Promise.allSettled([
      saveSettings ? updateSettings.mutateAsync({ slug, ...toUpdateSettingsRequest(settingsValues) }) : null,
      saveMapping ? updateSlots.mutateAsync({ slug, ...toUpdateEventSlotsRequest(mappingValues) }) : null,
    ])

    // Field token dan secret kembali kosong; yang tersimpan tampil sebagai status tersamar.
    if (settingsResult.status === "fulfilled" && settingsResult.value) form.reset(settingsToFormValues(settingsResult.value))
    // Slot baru mendapat ID dari server; ID slot lama tetap (AC 6).
    if (mappingResult.status === "fulfilled" && mappingResult.value) mapping.reset(slotsToFormValues(mappingResult.value))

    const mappingError = mappingResult.status === "rejected" ? mappingResult.reason : undefined
    const settingsError = settingsResult.status === "rejected" ? settingsResult.reason : undefined
    if (!mappingError && !settingsError) {
      toast.success("Pengaturan disimpan.")
      return
    }

    // Urutan sama dengan validasi di atas: fokus akhirnya di error pertama di halaman.
    const mappingFieldErrors = applyFieldErrors(mappingError, mapping.setError, toSlotFormField)
    const settingsFieldErrors = applyFieldErrors(settingsError, form.setError)
    const reason =
      mappingFieldErrors || settingsFieldErrors ? CHECK_FIELDS_MESSAGE : getErrorMessage(settingsError ?? mappingError)
    const partlySaved = (saveSettings && !settingsError) || (saveMapping && !mappingError)
    if (!partlySaved) {
      toast.error(reason)
      return
    }
    const unsaved = settingsError ? "Info proyek, Meta CAPI, dan koneksi WhatsApp" : "Event Mapping"
    toast.error(`${unsaved} belum tersimpan; perubahan lain sudah tersimpan. ${reason}`)
  }

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
        <EventMappingCard form={mapping} />
      </form>
      <StickySaveBar formId={formId} dirty={dirty} pending={pending} onDiscard={discard} />
      <UnsavedChangesGuard
        when={dirty}
        onLeave={discard}
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
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}
