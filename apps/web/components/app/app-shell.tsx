"use client"

import { MenuIcon } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

import { AppSidebar } from "./app-sidebar"
import { Logo } from "./logo"

/** Layout semua halaman setelah login: sidebar tetap di ≥ 1024 px, Sheet di bawahnya (NFR-16). */
export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-background px-3 py-2 text-sm font-medium ring-2 ring-ring focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Lewati ke konten
      </a>

      <aside className="sticky top-0 hidden h-dvh border-r bg-sidebar text-sidebar-foreground lg:block">
        <AppSidebar />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur lg:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Buka menu">
                <MenuIcon aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>Navigasi proyek dan akun</SheetDescription>
              </SheetHeader>
              <AppSidebar onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <Logo />
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl p-4 outline-none md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
