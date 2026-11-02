import { CheckIcon, CircleIcon } from "lucide-react"

import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth"
import { cn } from "@/lib/utils"

type PasswordRequirementsProps = {
  /** Ditautkan ke input password lewat `aria-describedby`. */
  id: string
  password: string
  /** Isi untuk juga menampilkan syarat konfirmasi password sama. */
  confirmation?: string
}

/** Indikator syarat password (PRD 8.3 Daftar). Status ditandai ikon dan teks, bukan hanya warna. */
export function PasswordRequirements({ id, password, confirmation }: PasswordRequirementsProps) {
  const rules = [
    { label: `Minimal ${PASSWORD_MIN_LENGTH} karakter`, met: password.length >= PASSWORD_MIN_LENGTH },
    ...(confirmation === undefined
      ? []
      : [{ label: "Konfirmasi password sama", met: password.length > 0 && password === confirmation }]),
  ]

  return (
    <ul id={id} aria-label="Syarat password" className="space-y-1 text-sm">
      {rules.map((rule) => (
        <li key={rule.label} className={cn("flex items-center gap-2", rule.met ? "text-success" : "text-muted-foreground")}>
          {rule.met ? (
            <CheckIcon className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <CircleIcon className="size-4 shrink-0" aria-hidden="true" />
          )}
          {rule.label}
          <span className="sr-only">{rule.met ? ", terpenuhi" : ", belum terpenuhi"}</span>
        </li>
      ))}
    </ul>
  )
}
