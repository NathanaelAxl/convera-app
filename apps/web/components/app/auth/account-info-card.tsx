"use client"

import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useMe } from "@/lib/api/auth"
import { formatPhone } from "@/lib/phone"

import { LoadError } from "../load-error"

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{children}</dd>
    </div>
  )
}

/** Info akun read-only: nama, email, nomor HP, role (FR-04). */
export function AccountInfoCard() {
  const me = useMe()

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Info akun</h2>
        </CardTitle>
        <CardDescription>Data ini diisi saat pendaftaran dan tidak bisa diubah dari sini.</CardDescription>
      </CardHeader>
      <CardContent>
        {me.data ? (
          <dl className="space-y-3">
            <InfoRow label="Nama">{me.data.name}</InfoRow>
            <InfoRow label="Email">{me.data.email}</InfoRow>
            <InfoRow label="Nomor HP">{formatPhone(me.data.phone)}</InfoRow>
            <InfoRow label="Role">
              <Badge variant={me.data.role === "admin" ? "default" : "secondary"}>
                {me.data.role === "admin" ? "Admin" : "User"}
              </Badge>
            </InfoRow>
          </dl>
        ) : me.isError ? (
          <LoadError error={me.error} onRetry={() => me.refetch()} />
        ) : (
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only" role="status">
              Memuat info akun…
            </span>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-5 w-full max-w-64" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
