import type { Metadata } from "next"

import { AuthCard, AuthLink } from "@/components/app/auth/auth-card"
import { ForgotPasswordForm } from "@/components/app/auth/forgot-password-form"

export const metadata: Metadata = { title: "Lupa password" }

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Lupa password"
      footer={
        <p>
          Ingat password Anda? <AuthLink href="/login">Masuk</AuthLink>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
