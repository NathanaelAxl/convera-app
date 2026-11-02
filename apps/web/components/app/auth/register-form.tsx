"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useRegister } from "@/lib/api/auth"
import { applyFieldErrors, getErrorMessage } from "@/lib/api/errors"
import { registerFormSchema, type RegisterFormValues } from "@/lib/validation/auth"

import { FormAlert } from "../form-alert"
import { FormField } from "../form-field"
import { SecretInput } from "../secret-input"
import { PasswordRequirements } from "./password-requirements"

export function RegisterForm() {
  const router = useRouter()
  const register = useRegister()
  const [formError, setFormError] = useState<string | null>(null)
  const requirementsId = useId()

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", password_confirmation: "" },
  })
  const [password, passwordConfirmation] = useWatch({
    control: form.control,
    name: ["password", "password_confirmation"],
  })

  const onSubmit = form.handleSubmit(async ({ name, email, phone, password }) => {
    setFormError(null)
    try {
      await register.mutateAsync({ name, email, phone, password })
      toast.success("Akun berhasil dibuat. Selamat datang di Convera!")
      router.replace("/projects")
    } catch (error) {
      // 409 email sudah terdaftar dan 422 tampil di field terkait lewat `error.details`.
      if (!applyFieldErrors(error, form.setError)) setFormError(getErrorMessage(error))
    }
  })

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-6">
      {formError && <FormAlert title="Gagal mendaftar">{formError}</FormAlert>}
      <FieldGroup>
        <FormField
          control={form.control}
          name="name"
          label="Nama lengkap"
          render={(props) => <Input autoComplete="name" {...props} />}
        />
        <FormField
          control={form.control}
          name="email"
          label="Email"
          render={(props) => <Input type="email" inputMode="email" autoComplete="email" {...props} />}
        />
        <FormField
          control={form.control}
          name="phone"
          label="Nomor HP"
          description={
            <>
              Contoh: <span className="whitespace-nowrap">081234567890</span> atau{" "}
              <span className="whitespace-nowrap">+62 812-3456-7890</span>.
            </>
          }
          render={(props) => <Input type="tel" inputMode="tel" autoComplete="tel" {...props} />}
        />
        <FormField
          control={form.control}
          name="password"
          label="Password"
          describedBy={requirementsId}
          render={(props) => <SecretInput autoComplete="new-password" {...props} />}
        />
        <FormField
          control={form.control}
          name="password_confirmation"
          label="Konfirmasi password"
          describedBy={requirementsId}
          render={(props) => <SecretInput autoComplete="new-password" {...props} />}
        />
        <PasswordRequirements id={requirementsId} password={password} confirmation={passwordConfirmation} />
      </FieldGroup>
      <Button type="submit" size="lg" className="w-full" disabled={register.isPending}>
        {register.isPending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        Daftar
      </Button>
    </form>
  )
}
