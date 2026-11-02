import type { Metadata } from "next"
import { Suspense } from "react"

import { AuthCard, AuthFormSkeleton, AuthLink } from "@/components/app/auth/auth-card"
import { ResetPasswordForm } from "@/components/app/auth/reset-password-form"

export const metadata: Metadata = { title: "Reset password" }

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Buat password baru"
      description="Password baru berlaku untuk semua perangkat. Semua sesi yang sedang aktif akan dikeluarkan."
      footer={
        <p>
          Kembali ke <AuthLink href="/login">halaman masuk</AuthLink>
        </p>
      }
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  )
}
