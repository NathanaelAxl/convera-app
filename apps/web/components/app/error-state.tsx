import { FileQuestionIcon, ShieldAlertIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

const VARIANTS = {
  404: {
    icon: FileQuestionIcon,
    title: "Halaman tidak ditemukan",
    description: "Halaman atau proyek yang Anda cari tidak ada, atau Anda tidak punya akses ke sana.",
  },
  403: {
    icon: ShieldAlertIcon,
    title: "Akses ditolak",
    description: "Halaman ini hanya bisa dibuka oleh admin.",
  },
} as const

type ErrorStateProps = {
  code: keyof typeof VARIANTS
  title?: string
  description?: string
}

/** Halaman 404/403 dengan tombol kembali ke Kelola Proyek (PRD 8.3). */
export function ErrorState({ code, title, description }: ErrorStateProps) {
  const variant = VARIANTS[code]
  const Icon = variant.icon

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted" aria-hidden="true">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <div className="max-w-md space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Error {code}</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{title ?? variant.title}</h1>
        <p className="text-sm text-muted-foreground">{description ?? variant.description}</p>
      </div>
      <Button asChild size="lg">
        <Link href="/projects">Kembali ke Kelola Proyek</Link>
      </Button>
    </div>
  )
}
