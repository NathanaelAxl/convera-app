import {
  BanIcon,
  BookOpenIcon,
  CalendarRangeIcon,
  ChartColumnIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MegaphoneIcon,
  SettingsIcon,
  SparklesIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  label: string
  icon: LucideIcon
  /** Kosong = menu fase berikutnya, tampil nonaktif dengan badge "Segera". */
  href?: string
  /** `exact`: aktif hanya bila path sama persis. Default: path sama atau turunannya. */
  match?: "exact" | "prefix"
}

/** Menu proyek (PRD 8.2). */
export function projectNav(slug: string): NavItem[] {
  return [
    { label: "Dashboard", icon: LayoutDashboardIcon, href: `/projects/${slug}/dashboard` },
    { label: "Event Log", icon: ListChecksIcon, href: `/projects/${slug}/events` },
    { label: "Pengaturan", icon: SettingsIcon, href: `/projects/${slug}/settings` },
    { label: "Blacklist", icon: BanIcon, href: `/projects/${slug}/blacklist` },
    { label: "Data Iklan", icon: MegaphoneIcon }, // Fase 4
    { label: "Laporan Bulanan", icon: CalendarRangeIcon }, // Fase 4
    { label: "Laporan Iklan", icon: ChartColumnIcon }, // Fase 4
  ]
}

/** Menu akun (PRD 8.2). */
export const accountNav: NavItem[] = [
  { label: "Kelola Proyek", icon: FolderKanbanIcon, href: "/projects", match: "exact" },
  { label: "Akun", icon: UserIcon, href: "/account" },
  { label: "Upgrade", icon: SparklesIcon }, // Fase 3
]

export const helpNav: NavItem[] = [
  { label: "Panduan", icon: BookOpenIcon }, // Fase 5
]

export function isNavItemActive(item: NavItem, pathname: string) {
  if (!item.href) return false
  if (item.match === "exact") return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
