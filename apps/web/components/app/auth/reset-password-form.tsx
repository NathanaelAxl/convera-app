"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useId, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { useResetPassword } from "@/lib/api/auth"
import { applyFieldErrors, getErrorMessage, isApiError } from "@/lib/api/errors"
import { resetPasswordFormSchema, type ResetPasswordFormValues } from "@/lib/validation/auth"

import { FormAlert } from "../form-alert"
import { FormField } from "../form-field"
import { SecretInput } from "../secret-input"
import { PasswordRequirements } from "./password-requirements"

export function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get("token")
  const resetPassword = useResetPassword()
  const [tokenInvalid, setTokenInvalid] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const requirementsId = useId()

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { new_password: "", new_password_confirmation: "" },
  })
  const [password, passwordConfirmation] = useWatch({
    control: form.control,
    name: ["new_password", "new_password_confirmation"],
  })

  const onSubmit = form.handleSubmit(async ({ new_password }) => {
    if (!token) return
    setFormError(null)
    try {
      await resetPassword.mutateAsync({ token, new_password })
      toast.success("Password berhasil diganti. Silakan masuk dengan password baru.")
      router.replace("/login")
    } catch (error) {
      // 400: token tidak valid, kedaluwarsa, atau sudah dipakai.
      if (isApiError(error) && error.status === 400) setTokenInvalid(true)
      else if (!applyFieldErrors(error, form.setError)) setFormError(getErrorMessage(error))
    }
  })

  if (!token || tokenInvalid) {
    return (
      <div className="space-y-6">
        <FormAlert title="Tautan reset tidak bisa dipakai">
          Tautan ini tidak valid, sudah kedaluwarsa (lebih dari 60 menit), atau sudah pernah dipakai. Minta tautan
          baru untuk membuat password baru.
        </FormAlert>
        <Button asChild size="lg" className="w-full">
          <Link href="/forgot-password">Minta tautan baru</Link>
        </Button>
      </div>
    )
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-6">
      {formError && <FormAlert title="Gagal mengganti password">{formError}</FormAlert>}
      <FieldGroup>
        <FormField
          control={form.control}
          name="new_password"
          label="Password baru"
          describedBy={requirementsId}
          render={(props) => <SecretInput autoComplete="new-password" {...props} />}
        />
        <FormField
          control={form.control}
          name="new_password_confirmation"
          label="Konfirmasi password baru"
          describedBy={requirementsId}
          render={(props) => <SecretInput autoComplete="new-password" {...props} />}
        />
        <PasswordRequirements id={requirementsId} password={password} confirmation={passwordConfirmation} />
      </FieldGroup>
      <Button type="submit" size="lg" className="w-full" disabled={resetPassword.isPending}>
        {resetPassword.isPending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        Simpan password baru
      </Button>
    </form>
  )
}
