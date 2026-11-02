import { Skeleton } from "@/components/ui/skeleton"

/** Kerangka halaman saat data awal dimuat. */
export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only" role="status">
        Memuat…
      </span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )
}

/** Kerangka AppShell saat sesi diperiksa. */
export function ShellSkeleton() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="hidden h-dvh space-y-4 border-r bg-sidebar p-3 lg:block">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="min-w-0">
        <div className="h-14 border-b lg:hidden" />
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
          <PageSkeleton />
        </div>
      </div>
    </div>
  )
}
