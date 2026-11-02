import Link from "next/link"
import type { ReactNode } from "react"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Tautan teks antarhalaman autentikasi, dengan target sentuh 44 px. */
export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center font-medium text-foreground underline-offset-4 hover:underline touch:min-h-11"
    >
      {children}
    </Link>
  )
}

/** Pengganti form selama komponen yang membaca query string dimuat. */
export function AuthFormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

type AuthCardProps = {
  title: string
  description?: ReactNode
  /** Tautan ke halaman autentikasi lain, misalnya "Belum punya akun? Daftar". */
  footer?: ReactNode
  children: ReactNode
}

/** Kartu halaman publik autentikasi (masuk, daftar, lupa/reset password). */
export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="font-heading text-xl font-semibold">{title}</h1>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && <CardFooter className="justify-center text-sm text-muted-foreground">{footer}</CardFooter>}
    </Card>
  )
}
