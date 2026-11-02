"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useId, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { useChangePassword, useMe } from "@/lib/api/auth"
import { applyFieldErrors, getErrorMessage } from "@/lib/api/errors"
import { changePasswordFormSchema, type ChangePasswordFormValues } from "@/lib/validation/auth"

import { FormAlert } from "../form-alert"
import { FormField } from "../form-field"
import { SecretInput } from "../secret-input"
import { PasswordRequirements } from "./password-requirements"

const EMPTY_VALUES: ChangePasswordFormValues = {
  current_password: "",
  new_password: "",
  new_password_confirmation: "",
}

/** Ganti password (FR-05): password lama salah tampil di field; sesi lain dicabut, sesi ini tetap aktif. */
export function ChangePasswordForm() {
  const me = useMe()
  const changePassword = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)
  const requirementsId = useId()
  const formId = useId()

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: EMPTY_VALUES,
  })
  const [password, passwordConfirmation] = useWatch({
    control: form.control,
    name: ["new_password", "new_password_confirmation"],
  })

  const onSubmit = form.handleSubmit(async ({ current_password, new_password }) => {
    setFormError(null)
    try {
      await changePassword.mutateAsync({ current_password, new_password })
      form.reset(EMPTY_VALUES)
      toast.success("Password berhasil diganti. Sesi di perangkat lain sudah dikeluarkan.")
    } catch (error) {
      if (!applyFieldErrors(error, form.setError)) setFormError(getErrorMessage(error))
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Ganti password</h2>
        </CardTitle>
        <CardDescription>Setelah diganti, semua sesi di perangkat lain akan dikeluarkan.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id={formId} method="post" onSubmit={onSubmit} noValidate className="space-y-6">
          {formError && <FormAlert title="Gagal mengganti password">{formError}</FormAlert>}
          {/* Membantu password manager mengenali akun yang passwordnya diganti. */}
          <input type="email" name="username" autoComplete="username" value={me.data?.email ?? ""} readOnly hidden />
          <FieldGroup>
            <FormField
              control={form.control}
              name="current_password"
              label="Password lama"
              render={(props) => <SecretInput autoComplete="current-password" {...props} />}
            />
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
        </form>
      </CardContent>
      <CardFooter className="justify-end border-t pt-(--card-spacing)">
        <Button type="submit" form={formId} disabled={changePassword.isPending}>
          {changePassword.isPending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          Simpan password
        </Button>
      </CardFooter>
    </Card>
  )
}
