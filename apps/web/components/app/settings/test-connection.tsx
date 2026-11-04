"use client"

import { CircleAlertIcon, CircleCheckIcon, Loader2Icon, SendIcon } from "lucide-react"
import { useId, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/api/errors"
import { useTestProjectCapi } from "@/lib/api/settings"
import type { ProjectSettings, TestCapiResult } from "@/lib/api/types"
import { testConnectionBlocker } from "@/lib/settings"

type Outcome = { type: "response"; result: TestCapiResult } | { type: "error"; message: string }

type TestConnectionProps = {
  slug: string
  settings: ProjectSettings
  hasUnsavedChanges: boolean
}

/**
 * Tombol "Uji koneksi" + `Alert` hasil (FR-18, AC 6): jumlah event yang diterima Meta atau pesan error dari Meta.
 * Nonaktif dengan keterangan bila Pixel ID atau token belum tersimpan, atau isian Meta CAPI belum disimpan.
 */
export function TestConnection({ slug, settings, hasUnsavedChanges }: TestConnectionProps) {
  const testCapi = useTestProjectCapi()
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const headingId = useId()
  const hintId = useId()
  const blocker = testConnectionBlocker(settings, hasUnsavedChanges)

  async function run() {
    setOutcome(null)
    try {
      setOutcome({ type: "response", result: await testCapi.mutateAsync(slug) })
    } catch (error) {
      setOutcome({ type: "error", message: getErrorMessage(error) })
    }
  }

  return (
    <section aria-labelledby={headingId} className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 id={headingId} className="text-sm font-medium">
            Uji koneksi
          </h3>
          <p id={hintId} className="text-sm text-muted-foreground">
            {blocker ??
              (settings.test_event_code
                ? `Mengirim satu event uji ke Meta dengan Test Event Code ${settings.test_event_code}.`
                : "Test Event Code kosong: event uji akan tercatat sebagai event biasa di Events Manager.")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={blocker !== null}
          // Saat menunggu Meta: `aria-disabled`, bukan `disabled`, agar fokus keyboard tetap di tombol.
          aria-disabled={testCapi.isPending || undefined}
          aria-describedby={hintId}
          aria-busy={testCapi.isPending || undefined}
          onClick={() => !testCapi.isPending && run()}
        >
          {testCapi.isPending ? (
            <Loader2Icon className="animate-spin" aria-hidden="true" />
          ) : (
            <SendIcon aria-hidden="true" />
          )}
          Uji koneksi
        </Button>
      </div>
      {outcome && <OutcomeAlert outcome={outcome} />}
    </section>
  )
}

function OutcomeAlert({ outcome }: { outcome: Outcome }) {
  if (outcome.type === "error") {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>Uji koneksi gagal</AlertTitle>
        <AlertDescription>{outcome.message}</AlertDescription>
      </Alert>
    )
  }

  const { success, events_received, fbtrace_id, message, used_test_event_code } = outcome.result
  const trace = fbtrace_id && (
    <p className="text-xs">
      ID jejak Meta (fbtrace_id): <span className="font-mono break-all">{fbtrace_id}</span>
    </p>
  )

  if (!success) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>Meta menolak event uji</AlertTitle>
        <AlertDescription>
          <p>Pesan dari Meta: {message ?? "tidak ada keterangan."}</p>
          <p>Periksa Pixel ID dan Access Token, simpan, lalu uji lagi.</p>
          {trace}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-success/30 text-success">
      <CircleCheckIcon aria-hidden="true" />
      <AlertTitle>Meta menerima {events_received} event uji</AlertTitle>
      <AlertDescription>
        <p>
          {used_test_event_code
            ? `Dikirim dengan Test Event Code ${used_test_event_code}. Cek tab Test Events di Meta Events Manager.`
            : "Dikirim tanpa Test Event Code, jadi tercatat sebagai event biasa di Events Manager."}
        </p>
        {trace}
      </AlertDescription>
    </Alert>
  )
}
