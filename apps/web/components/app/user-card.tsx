import { Badge } from "@/components/ui/badge"
import type { User } from "@/lib/api/types"

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

/** Nama, email, dan badge role user yang sedang login (PRD 8.2). */
export function UserCard({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3 px-2 py-1.5">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-medium"
        aria-hidden="true"
      >
        {initials(user.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
        {user.role === "admin" ? "Admin" : "User"}
      </Badge>
    </div>
  )
}
