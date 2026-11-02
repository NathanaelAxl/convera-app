import type { Metadata } from "next"

import { AuthCard, AuthLink } from "@/components/app/auth/auth-card"
import { RegisterForm } from "@/components/app/auth/register-form"

export const metadata: Metadata = { title: "Daftar" }

export default function RegisterPage() {
  return (
    <AuthCard
      title="Daftar"
      description="Buat akun Convera untuk mulai mengirim event konversi dari WhatsApp ke Meta."
      footer={
        <p>
          Sudah punya akun? <AuthLink href="/login">Masuk</AuthLink>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  )
}
