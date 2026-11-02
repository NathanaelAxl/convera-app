import type { Metadata } from "next"
import { Suspense } from "react"

import { AuthCard, AuthFormSkeleton, AuthLink } from "@/components/app/auth/auth-card"
import { LoginForm } from "@/components/app/auth/login-form"
import { MockSessionPanel } from "@/components/app/mock-session-panel"

export const metadata: Metadata = { title: "Masuk" }

export default function LoginPage() {
  return (
    <>
      <AuthCard
        title="Masuk"
        description="Masuk untuk memantau event konversi proyek Anda."
        footer={
          <p>
            Belum punya akun? <AuthLink href="/register">Daftar</AuthLink>
          </p>
        }
      >
        <Suspense fallback={<AuthFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </AuthCard>
      <Suspense>
        <MockSessionPanel />
      </Suspense>
    </>
  )
}
