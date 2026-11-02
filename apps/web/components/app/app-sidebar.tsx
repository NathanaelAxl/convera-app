"use client"

import { LogOutIcon } from "lucide-react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { useEffect, useId, useSyncExternalStore } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useLogout, useMe } from "@/lib/api/auth"
import { useProjects } from "@/lib/api/projects"
import { cn } from "@/lib/utils"

import { Logo } from "./logo"
import { accountNav, helpNav, isNavItemActive, projectNav, type NavItem } from "./nav-config"
import { ProjectSwitcher } from "./project-switcher"
import { UserCard } from "./user-card"

const LAST_PROJECT_KEY = "convera.last-project"
const noopSubscribe = () => () => {}

/** Proyek yang terakhir dibuka, supaya menu proyek tetap mengarah ke sana dari /projects atau /account. */
function useLastProjectSlug() {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.localStorage.getItem(LAST_PROJECT_KEY),
    () => null,
  )
}

type AppSidebarProps = {
  /** Dipanggil setelah memilih menu, untuk menutup Sheet di layar kecil. */
  onNavigate?: () => void
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname()
  const params = useParams<{ slug?: string }>()
  const me = useMe()
  const projects = useProjects()
  const logout = useLogout()
  const lastSlug = useLastProjectSlug()

  const known = (slug: string | null | undefined) => projects.data?.find((project) => project.slug === slug)?.slug
  const currentSlug = known(params.slug)
  const activeSlug = currentSlug ?? known(lastSlug) ?? projects.data?.[0]?.slug

  useEffect(() => {
    if (currentSlug) window.localStorage.setItem(LAST_PROJECT_KEY, currentSlug)
  }, [currentSlug])

  function handleLogout() {
    // Muat ulang penuh agar cache data user sebelumnya ikut terhapus.
    logout.mutate(undefined, { onSettled: () => window.location.replace("/login") })
  }

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <Link href="/projects" onNavigate={onNavigate} className="flex h-9 items-center rounded-lg px-2 touch:h-11" aria-label="Convera, ke Kelola Proyek">
        <Logo />
      </Link>

      <ProjectSwitcher projects={projects.data} activeSlug={activeSlug} onNavigate={onNavigate} />

      <nav aria-label="Menu utama" className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1">
        {activeSlug && (
          <NavSection title="Proyek" items={projectNav(activeSlug)} pathname={pathname} onNavigate={onNavigate} />
        )}
        <NavSection title="Akun" items={accountNav} pathname={pathname} onNavigate={onNavigate} />
        <NavSection items={helpNav} pathname={pathname} onNavigate={onNavigate} />
      </nav>

      <div className="space-y-2">
        <Separator />
        {me.data && <UserCard user={me.data} />}
        <Button
          variant="ghost"
          size="lg"
          className="w-full justify-start"
          onClick={handleLogout}
          disabled={logout.isPending}
        >
          <LogOutIcon aria-hidden="true" />
          Keluar
        </Button>
      </div>
    </div>
  )
}

function NavSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title?: string
  items: NavItem[]
  pathname: string
  onNavigate?: () => void
}) {
  const headingId = useId()

  return (
    <div className="space-y-1">
      {title && (
        <h2 id={headingId} className="px-2 text-xs font-medium text-muted-foreground">
          {title}
        </h2>
      )}
      <ul className="space-y-0.5" aria-labelledby={title ? headingId : undefined}>
        {items.map((item) => (
          <li key={item.label}>
            <NavLink item={item} active={isNavItemActive(item, pathname)} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </div>
  )
}

const navItemClass =
  "flex h-9 w-full items-center gap-2 rounded-lg px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 touch:h-11 [&>svg]:size-4 [&>svg]:shrink-0"

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon

  if (!item.href) {
    return (
      <span aria-disabled="true" className={cn(navItemClass, "cursor-not-allowed text-muted-foreground")}>
        <Icon aria-hidden="true" />
        <span className="truncate">{item.label}</span>
        <Badge variant="secondary" className="ml-auto">
          Segera
        </Badge>
      </span>
    )
  }

  return (
    <Link
      href={item.href}
      onNavigate={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        navItemClass,
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
      )}
    >
      <Icon aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}
