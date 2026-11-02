"use client"

import { TriangleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/api/errors"

import { EmptyState } from "./empty-state"

/** Data gagal dimuat (bukan 401/404): tampilkan pesan dan tombol coba lagi. */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert">
      <EmptyState
        icon={TriangleAlertIcon}
        title="Data gagal dimuat"
        description={getErrorMessage(error)}
        action={
          <Button variant="outline" onClick={onRetry}>
            Coba lagi
          </Button>
        }
      />
    </div>
  )
}
