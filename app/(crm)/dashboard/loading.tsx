import { Skeleton } from "@/components/ui/skeleton"

/** Skeleton matches dashboard-page layout: header row, KPI grid, two widgets, pipeline chart. */
export default function DashboardLoading() {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-5 w-px" />
        <Skeleton className="h-5 w-24" />
      </header>
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="mb-1 space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-80" />
            </div>
            <div className="flex shrink-0 gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[88px] rounded-lg" />
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[320px] rounded-lg" />
            <Skeleton className="h-[320px] rounded-lg" />
          </div>
          <div className="mt-6">
            <Skeleton className="h-[280px] w-full rounded-lg" />
          </div>
        </div>
      </div>
    </>
  )
}
