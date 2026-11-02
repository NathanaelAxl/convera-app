"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, MailCheckIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useForgotPassword } from "@/lib/api/auth"
import { isMocked } from "@/lib/api/config"
import { applyFieldErrors, getErrorMessage } from "@/lib/api/errors"
import { forgotPasswordRequestSchema, type ForgotPasswordFormValues } from "@/lib/validation/auth"

import { FormAlert } from "../form-alert"
import { FormField } from "../form-field"

export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword()
  const [formError, setFormError] = useState<string | null>(null)
  const [sentMessage, setSentMessage] = useState<string | null>(null)

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordRequestSchema),
    defaultValues: { email: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const result = await forgotPassword.mutateAsync(values)
      setSentMessage(result.message)
    } catch (error) {
      if (!applyFieldErrors(error, form.setError)) setFormError(getErrorMessage(error))
    }
  })

  // Pesan sukses selalu sama, terdaftar atau tidak (AC 4).
  if (sentMessage) {
    return (
      <div className="space-y-6">
        <Alert role="status">
          <MailCheckIcon aria-hidden="true" />
          <AlertTitle>Periksa email Anda</AlertTitle>
          <AlertDescription>
            {sentMessage} Tautan berlaku 60 menit dan hanya bisa dipakai sekali.
            {isMocked("auth") && " (Mode mock: tautan ditulis di console browser.)"}
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/login">Kembali ke halaman masuk</Link>
        </Button>
      </div>
    )
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-6">
      {formError && <FormAlert title="Permintaan gagal">{formError}</FormAlert>}
      <FieldGroup>
        <FormField
          control={form.control}
          name="email"
          label="Email"
          description="Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat password baru."
          render={(props) => <Input type="email" inputMode="email" autoComplete="email" {...props} />}
        />
      </FieldGroup>
      <Button type="submit" size="lg" className="w-full" disabled={forgotPassword.isPending}>
        {forgotPassword.isPending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        Kirim tautan reset
      </Button>
    </form>
  )
}
