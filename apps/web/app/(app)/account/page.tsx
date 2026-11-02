import type { Metadata } from "next"

import { AccountInfoCard } from "@/components/app/auth/account-info-card"
import { ChangePasswordForm } from "@/components/app/auth/change-password-form"
import { PageHeader } from "@/components/app/page-header"

export const metadata: Metadata = { title: "Akun" }

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Akun" description="Info akun Anda dan pengaturan password." />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <AccountInfoCard />
        <ChangePasswordForm />
      </div>
    </div>
  )
}
