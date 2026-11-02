import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber, formatRupiah } from "@/lib/format"

type KpiCardProps = {
  label: string
  value: number
  format?: "number" | "currency"
  /** Keterangan di bawah angka, misalnya jumlah closing. */
  hint?: ReactNode
  icon?: LucideIcon
  /** Slot aksi di pojok kanan atas. */
  action?: ReactNode
  loading?: boolean
}

export function KpiCard({ label, value, format = "number", hint, icon: Icon, action, loading }: KpiCardProps) {
  return (
    <Card size="sm" aria-busy={loading || undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {Icon && <Icon className="size-4" aria-hidden="true" />}
          {label}
        </CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <>
            <Skeleton className="h-8 w-24" />
            <span className="sr-only">Memuat {label}</span>
          </>
        ) : (
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {format === "currency" ? formatRupiah(value) : formatNumber(value)}
          </p>
        )}
        {hint && !loading && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
