"use client"

import type { Control } from "react-hook-form"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { ProjectSettings } from "@/lib/api/types"
import { maskedSuffix } from "@/lib/settings"
import { PIXEL_ID_MAX_LENGTH, PIXEL_ID_MIN_LENGTH, type ProjectSettingsFormValues } from "@/lib/validation/settings"

import { FormField } from "../form-field"
import { SecretInput } from "../secret-input"
import { StatusBadge } from "../status-badge"
import { TestConnection } from "./test-connection"

type MetaCapiCardProps = {
  control: Control<ProjectSettingsFormValues>
  slug: string
  /** Pengaturan yang tersimpan: token tersamar dan syarat uji koneksi. */
  settings: ProjectSettings
  /** Pixel ID, Access Token, atau Test Event Code sedang diubah dan belum disimpan. */
  hasUnsavedChanges: boolean
}

/** Pixel ID, Access Token CAPI, Test Event Code, dan uji koneksi (FR-14, FR-18). */
export function MetaCapiCard({ control, slug, settings, hasUnsavedChanges }: MetaCapiCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Meta Conversions API</h2>
        </CardTitle>
        <CardDescription>
          Tujuan event konversi. Pixel ID, Access Token, dan Test Event Code diambil dari Meta Events Manager.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FieldGroup>
          <FormField
            control={control}
            name="pixel_id"
            label="Pixel ID"
            description={`Hanya angka, ${PIXEL_ID_MIN_LENGTH}–${PIXEL_ID_MAX_LENGTH} digit.`}
            render={(props) => (
              <Input
                inputMode="numeric"
                autoComplete="off"
                placeholder="Contoh: 123456789012345"
                className="sm:max-w-72"
                {...props}
              />
            )}
          />
          <FormField
            control={control}
            name="capi_access_token"
            label="Access Token"
            description={<AccessTokenStatus masked={settings.capi_access_token_masked} />}
            render={(props) => (
              <SecretInput
                placeholder={settings.has_capi_access_token ? "Tempel token baru untuk mengganti" : "Tempel Access Token"}
                {...props}
              />
            )}
          />
          <FormField
            control={control}
            name="test_event_code"
            label={
              <>
                Test Event Code <span className="font-normal text-muted-foreground">(opsional)</span>
              </>
            }
            description="Dari tab Test Events di Events Manager, untuk menguji tanpa masuk ke data produksi. Kosongkan saat proyek sudah live."
            render={(props) => (
              <Input
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="Contoh: TEST48213"
                className="sm:max-w-72"
                {...props}
              />
            )}
          />
        </FieldGroup>
        <TestConnection
          // Hasil uji lama tidak berlaku lagi setelah pengaturan Meta CAPI yang tersimpan berubah.
          key={`${settings.pixel_id}|${settings.capi_access_token_masked}|${settings.test_event_code}`}
          slug={slug}
          settings={settings}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </CardContent>
    </Card>
  )
}

/** AC 2: token yang tersimpan hanya tampil tersamar; screen reader membacakan "berakhiran Zx9a". */
function AccessTokenStatus({ masked }: { masked: string | null }) {
  if (masked === null) {
    return (
      <>
        <StatusBadge tone="warning">Belum ada</StatusBadge> Event tidak bisa dikirim ke Meta sampai token diisi.
      </>
    )
  }
  const suffix = maskedSuffix(masked)
  return (
    <>
      <StatusBadge tone="success">Tersimpan</StatusBadge>{" "}
      <span aria-hidden="true">
        <span className="font-mono">{masked}</span>.
      </span>
      {suffix && <span className="sr-only">berakhiran {suffix}.</span>} Biarkan kosong untuk tetap memakai token ini.
    </>
  )
}
