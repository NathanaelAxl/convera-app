"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useLogin } from "@/lib/api/auth"
import { applyFieldErrors, getErrorMessage } from "@/lib/api/errors"
import { safeNextPath } from "@/lib/navigation"
import { loginRequestSchema, type LoginFormValues } from "@/lib/validation/auth"

import { FormAlert } from "../form-alert"
import { FormField } from "../form-field"
import { SecretInput } from "../secret-input"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      await login.mutateAsync(values)
      router.replace(safeNextPath(searchParams.get("next")))
    } catch (error) {
      // 401 sengaja umum ("Email atau password salah") agar tidak membocorkan email yang terdaftar.
      if (!applyFieldErrors(error, form.setError)) setFormError(getErrorMessage(error))
    }
  })

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-6">
      {formError && <FormAlert title="Gagal masuk">{formError}</FormAlert>}
      <FieldGroup>
        <FormField
          control={form.control}
          name="email"
          label="Email"
          render={(props) => <Input type="email" inputMode="email" autoComplete="email" {...props} />}
        />
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="password"
            label="Password"
            render={(props) => <SecretInput autoComplete="current-password" {...props} />}
          />
          <Link
            href="/forgot-password"
            className="inline-flex text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline touch:min-h-11 touch:items-center"
          >
            Lupa password?
          </Link>
        </div>
      </FieldGroup>
      <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
        {login.isPending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        Masuk
      </Button>
    </form>
  )
}
