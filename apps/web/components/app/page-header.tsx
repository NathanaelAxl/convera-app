import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: string
  description?: ReactNode
  /** Nama proyek yang ditampilkan sebagai chip di samping judul. */
  projectName?: string
  /** Slot aksi di kanan (tombol, filter). */
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, projectName, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 md:flex-row md:items-start md:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
          {projectName && (
            <Badge variant="outline" className="max-w-full truncate">
              <span className="sr-only">Proyek: </span>
              {projectName}
            </Badge>
          )}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
    </header>
  )
}
