"use client"

import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useState, type ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SecretInputProps = Omit<ComponentProps<typeof Input>, "type">

/** Input rahasia (password, token) dengan tombol tampil/sembunyi (`aria-pressed`). Bisa dipakai dengan react-hook-form. */
export function SecretInput({ className, ...props }: SecretInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        autoComplete="off"
        spellCheck={false}
        className={cn("pr-9 touch:pr-12", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-0.5 -translate-y-1/2"
        aria-label="Tampilkan nilai"
        aria-pressed={visible}
        disabled={props.disabled}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
      </Button>
    </div>
  )
}
