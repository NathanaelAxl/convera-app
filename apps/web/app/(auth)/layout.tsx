import { Logo } from "@/components/app/logo"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <Logo className="text-lg" />
      <main className="w-full max-w-md space-y-6">{children}</main>
    </div>
  )
}
