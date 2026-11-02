import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  /** Tombol atau tautan aksi. */
  action?: ReactNode
  /** Konten tambahan, misalnya langkah singkat. */
  children?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, children, className }: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        {Icon && (
          <div className="flex size-12 items-center justify-center rounded-full bg-muted" aria-hidden="true">
            <Icon className="size-6 text-muted-foreground" />
          </div>
        )}
        <div className="max-w-md space-y-1">
          <h2 className="font-heading text-base font-medium">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
        {action && <div className="pt-1">{action}</div>}
      </CardContent>
    </Card>
  )
}
