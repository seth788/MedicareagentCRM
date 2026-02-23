import { Skeleton } from "@/components/ui/skeleton"

/** Skeleton matches leads-page (flows) layout: header with buttons, filter bar, main content area. */
export default function FlowsLoading() {
  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-5 w-px" />
          <Skeleton className="h-5 w-14" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-28" />
          </div>
        </header>
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-card px-6 py-3">
          <Skeleton className="h-8 w-[160px] rounded-md" />
          <Skeleton className="h-8 flex-1 max-w-xs rounded-md md:max-w-xs" />
          <Skeleton className="h-8 w-[130px] rounded-md" />
          <Skeleton className="h-8 w-[130px] rounded-md" />
          <Skeleton className="ml-auto h-7 w-14 rounded-lg" />
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-auto p-6">
          <Skeleton className="h-full min-h-[400px] w-full rounded-lg" />
        </div>
      </div>
    </>
  )
}
