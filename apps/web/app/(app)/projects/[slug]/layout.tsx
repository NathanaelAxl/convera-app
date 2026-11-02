import { ProjectGuard } from "@/components/app/guards"

export default function ProjectLayout({ children }: LayoutProps<"/projects/[slug]">) {
  return <ProjectGuard>{children}</ProjectGuard>
}
