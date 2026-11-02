import { AdminGuard } from "@/components/app/guards"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>
}
