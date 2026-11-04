"use client"

import { KeyRoundIcon, Loader2Icon } from "lucide-react"
import { useId, useRef, useState } from "react"
import { Controller, useWatch, type Control } from "react-hook-form"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getErrorMessage } from "@/lib/api/errors"
import { useCreateWebhookSecret } from "@/lib/api/settings"
import type { ProjectSettings } from "@/lib/api/types"
import { WA_PROVIDER_LABELS } from "@/lib/projects"
import { WA_PROVIDERS } from "@/lib/settings"
import type { ProjectSettingsFormValues } from "@/lib/validation/settings"

import { ConfirmDialog } from "../confirm-dialog"
import { CopyField } from "../copy-field"
import { FormField } from "../form-field"
import { SecretInput } from "../secret-input"
import { StatusBadge } from "../status-badge"
import { OneTimeSecretDialog } from "./one-time-secret-dialog"
import { ProviderGuide } from "./provider-guide"

type WhatsAppConnectionCardProps = {
  control: Control<ProjectSettingsFormValues>
  slug: string
  settings: ProjectSettings
  /** Dipanggil setelah sistem membuat secret baru, agar secret yang sempat diketik di form tidak menimpanya. */
  onSecretGenerated: () => void
}

/** Jenis koneksi, provider WABA + petunjuknya, Webhook URL, dan Webhook Secret (FR-15, FR-16, FR-17). */
export function WhatsAppConnectionCard({ control, slug, settings, onSecretGenerated }: WhatsAppConnectionCardProps) {
  const [connectionType, provider] = useWatch({ control, name: ["wa_connection_type", "wa_provider"] })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Koneksi WhatsApp</h2>
        </CardTitle>
        <CardDescription>
          Pesan masuk dan keluar dikirim provider ke Webhook URL proyek ini, lalu diubah menjadi event sesuai Event
          Mapping.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <ConnectionTypeField control={control} />

          {connectionType === "waba" && (
            <>
              <FormField
                control={control}
                name="wa_provider"
                label="Provider WABA"
                description="Mode generik bisa dipakai provider apa pun yang mampu mengirim webhook JSON. Adapter khusus provider lain menyusul."
                render={({ value, onChange, onBlur, ref, disabled, name, ...props }) => (
                  <Select name={name} value={value} onValueChange={onChange} disabled={disabled}>
                    <SelectTrigger ref={ref} onBlur={onBlur} className="w-full sm:w-72" {...props}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WA_PROVIDERS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {WA_PROVIDER_LABELS[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <ProviderGuide provider={provider} />
            </>
          )}

          <CopyField
            label="Webhook URL"
            value={settings.webhook_url}
            description="Unik untuk proyek ini. Tempel di pengaturan webhook dashboard provider."
          />

          <div className="space-y-3">
            <FormField
              control={control}
              name="webhook_secret"
              label="Webhook Secret"
              description={<WebhookSecretStatus hasSecret={settings.has_webhook_secret} />}
              render={(props) => (
                <SecretInput
                  placeholder={
                    settings.has_webhook_secret ? "Tempel secret baru untuk mengganti" : "Tempel secret dari provider"
                  }
                  {...props}
                />
              )}
            />
            {provider === "generic" && (
              <GenerateWebhookSecret slug={slug} hasSecret={settings.has_webhook_secret} onGenerated={onSecretGenerated} />
            )}
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

/** `RadioGroup` bergaya kartu. Scan QR baru aktif di Fase 5 (FR-15, FR-71). */
function ConnectionTypeField({ control }: { control: Control<ProjectSettingsFormValues> }) {
  const id = useId()
  const options = [
    {
      value: "waba",
      title: "WhatsApp Business API (WABA)",
      description: "Lewat provider resmi yang mengirim webhook pesan masuk dan keluar.",
      disabled: false,
    },
    {
      value: "qr",
      title: "Scan QR",
      description: "Hubungkan nomor WhatsApp lewat scan kode QR.",
      disabled: true,
    },
  ] as const

  return (
    <Controller
      control={control}
      name="wa_connection_type"
      render={({ field, fieldState }) => (
        <FieldSet data-invalid={fieldState.invalid || undefined}>
          <FieldLegend variant="label">Jenis koneksi</FieldLegend>
          <RadioGroup
            ref={field.ref}
            value={field.value}
            onValueChange={field.onChange}
            className="sm:grid-cols-2"
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.error ? `${id}-error` : undefined}
          >
            {options.map((option) => (
              <FieldLabel key={option.value} htmlFor={`${id}-${option.value}`}>
                <Field orientation="horizontal" data-disabled={option.disabled || undefined}>
                  <FieldContent>
                    <FieldTitle id={`${id}-${option.value}-title`}>
                      {option.title}
                      {option.disabled && <Badge variant="secondary">Segera hadir</Badge>}
                    </FieldTitle>
                    <FieldDescription id={`${id}-${option.value}-description`}>{option.description}</FieldDescription>
                  </FieldContent>
                  <RadioGroupItem
                    id={`${id}-${option.value}`}
                    value={option.value}
                    disabled={option.disabled}
                    aria-labelledby={`${id}-${option.value}-title`}
                    aria-describedby={`${id}-${option.value}-description`}
                  />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
          <FieldError id={`${id}-error`} errors={[fieldState.error]} />
        </FieldSet>
      )}
    />
  )
}

/** Secret tidak pernah ditampilkan ulang; yang terlihat hanya statusnya (FR-17, AC 5). Wajib: Pertanyaan Terbuka 4. */
function WebhookSecretStatus({ hasSecret }: { hasSecret: boolean }) {
  if (hasSecret) {
    return (
      <>
        <StatusBadge tone="success">Tersimpan</StatusBadge> Biarkan kosong agar secret ini tetap dipakai, atau tempel
        secret dari provider untuk menggantinya.
      </>
    )
  }
  return (
    <>
      <StatusBadge tone="warning">Belum ada</StatusBadge> Webhook ditolak sampai secret diisi. Tempel secret dari
      provider atau buat secret baru.
    </>
  )
}

/** Mode generik: sistem membuat secret, ditampilkan sekali di `OneTimeSecretDialog`. Secret lama langsung tidak berlaku. */
function GenerateWebhookSecret({
  slug,
  hasSecret,
  onGenerated,
}: {
  slug: string
  hasSecret: boolean
  onGenerated: () => void
}) {
  const createSecret = useCreateWebhookSecret()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [secret, setSecret] = useState("")
  const [secretOpen, setSecretOpen] = useState(false)

  async function generate() {
    try {
      const result = await createSecret.mutateAsync(slug)
      onGenerated()
      setSecret(result.webhook_secret)
      setSecretOpen(true)
    } catch (error) {
      toast.error(getErrorMessage(error))
      throw error
    }
  }

  function handleClick() {
    if (createSecret.isPending) return
    if (hasSecret) setConfirmOpen(true)
    else generate().catch(() => {})
  }

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        // `aria-disabled` selama request: fokus keyboard tetap di tombol.
        aria-disabled={createSecret.isPending || undefined}
        aria-busy={createSecret.isPending || undefined}
        onClick={handleClick}
      >
        {createSecret.isPending ? (
          <Loader2Icon className="animate-spin" aria-hidden="true" />
        ) : (
          <KeyRoundIcon aria-hidden="true" />
        )}
        Buat secret baru
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Ganti Webhook Secret?"
        description="Secret lama langsung tidak berlaku. Webhook dari provider ditolak sampai secret baru dipasang di provider."
        confirmLabel="Buat secret baru"
        onConfirm={generate}
        // Dialog tanpa trigger: fokus dikembalikan manual ke tombol, kecuali bila dialog secret sudah terbuka.
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (!secretOpen) buttonRef.current?.focus()
        }}
      />
      <OneTimeSecretDialog
        open={secretOpen}
        onOpenChange={setSecretOpen}
        secret={secret}
        onCloseAutoFocus={(event) => {
          // Secret dibuang dari memori setelah dialog benar-benar tertutup.
          setSecret("")
          event.preventDefault()
          buttonRef.current?.focus()
        }}
      />
    </>
  )
}
