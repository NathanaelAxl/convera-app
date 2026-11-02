import { MessageSquareShareIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Logo sementara; identitas visual final menunggu Pertanyaan Terbuka 25. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-heading text-base font-semibold", className)}>
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
        <MessageSquareShareIcon className="size-4" />
      </span>
      Convera
    </span>
  )
}
