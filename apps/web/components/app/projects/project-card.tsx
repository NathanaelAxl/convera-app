"use client"

import { EllipsisVerticalIcon, ListChecksIcon, PowerIcon, PowerOffIcon, SettingsIcon, Trash2Icon } from "lucide-react"
import Link from "next/link"
import { useRef } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Project } from "@/lib/api/types"
import { BUSINESS_CATEGORY_LABELS, waConnectionLabel } from "@/lib/projects"
import { cn } from "@/lib/utils"

import { CopyField } from "../copy-field"
import { StatusBadge } from "../status-badge"

/** Id tombol aksi kartu, tujuan fokus setelah dialog yang dibuka dari menunya ditutup. */
export function projectActionsTriggerId(slug: string) {
  return `project-actions-${slug}`
}

type ProjectCardProps = {
  project: Project
  onChangeStatus: (project: Project) => void
  onDelete: (project: Project) => void
}

/** Kartu proyek di Kelola Proyek (PRD 8.3): info proyek, Webhook URL, tautan, dan menu Nonaktifkan/Aktifkan + Hapus. */
export function ProjectCard({ project, onChangeStatus, onDelete }: ProjectCardProps) {
  // Menu yang ditutup mengembalikan fokus ke tombolnya; saat membuka dialog, fokus harus tetap di dialog.
  const openingDialog = useRef(false)

  function openDialog(open: (project: Project) => void) {
    openingDialog.current = true
    open(project)
  }

  return (
    <Card className={cn("h-full", !project.is_active && "bg-muted/30")}>
      <CardHeader>
        <CardTitle className="min-w-0">
          <h2 className="truncate" title={project.name}>
            {project.name}
          </h2>
        </CardTitle>
        <CardDescription className="min-w-0 truncate font-mono text-xs">
          <span className="sr-only">Slug: </span>/{project.slug}
        </CardDescription>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id={projectActionsTriggerId(project.slug)}
                variant="ghost"
                size="icon"
                aria-label={`Aksi proyek ${project.name}`}
              >
                <EllipsisVerticalIcon aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-auto min-w-44"
              onCloseAutoFocus={(event) => {
                if (!openingDialog.current) return
                openingDialog.current = false
                event.preventDefault()
              }}
            >
              <DropdownMenuItem onSelect={() => openDialog(onChangeStatus)}>
                {project.is_active ? <PowerOffIcon aria-hidden="true" /> : <PowerIcon aria-hidden="true" />}
                {project.is_active ? "Nonaktifkan" : "Aktifkan"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => openDialog(onDelete)}>
                <Trash2Icon aria-hidden="true" />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={project.is_active ? "success" : "neutral"}>
            {project.is_active ? "Aktif" : "Nonaktif"}
          </StatusBadge>
          <Badge variant="secondary">
            <span className="sr-only">Kategori: </span>
            {BUSINESS_CATEGORY_LABELS[project.business_category]}
          </Badge>
          <Badge variant="outline">
            <span className="sr-only">Koneksi WhatsApp: </span>
            {waConnectionLabel(project)}
          </Badge>
        </div>
        <CopyField label="Webhook URL" value={project.webhook_url} className="mt-auto" />
      </CardContent>

      <CardFooter className="flex-wrap gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/projects/${project.slug}/settings`}>
            <SettingsIcon aria-hidden="true" />
            Pengaturan<span className="sr-only"> {project.name}</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/projects/${project.slug}/events`}>
            <ListChecksIcon aria-hidden="true" />
            Event Log<span className="sr-only"> {project.name}</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
