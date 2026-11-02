import { CircleAlertIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/** Error umum form yang tidak terikat ke satu field (mis. kredensial salah, rate limit, server error). */
export function FormAlert({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
