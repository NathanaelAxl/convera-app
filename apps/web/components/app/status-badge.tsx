import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral"

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
  info: "border-info/25 bg-info/10 text-info",
  neutral: "border-border bg-muted text-foreground",
}

const DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground",
}

type StatusBadgeProps = {
  tone: StatusTone
  /** Teks status wajib ada: status tidak boleh hanya dibedakan warna (NFR-17). */
  children: ReactNode
  className?: string
}

/** Badge status berteks. Pemetaan status → tone + teks dibuat di masing-masing fitur. */
export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[tone], className)}>
      <span className={cn("size-1.5 rounded-full", DOT_CLASSES[tone])} aria-hidden="true" />
      {children}
    </Badge>
  )
}
