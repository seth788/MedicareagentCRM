import { Skeleton } from "@/components/ui/skeleton"

/** Skeleton matches pending-page layout: header, toolbar, summary badges, table. */
export default function PendingLoading() {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-5 w-px" />
        <Skeleton className="h-5 w-36" />
        <div className="ml-auto">
          <Skeleton className="h-8 w-28" />
        </div>
      </header>
      <div className="flex-1 overflow-auto">
        {/* Tab bar skeleton */}
        <div className="flex items-center gap-0 border-b px-6">
          <Skeleton className="h-5 w-24 my-3" />
          <Skeleton className="h-5 w-20 my-3 ml-4" />
        </div>
        {/* Filter bar skeleton */}
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-6 py-3">
          <div className="relative flex-1 md:max-w-xs">
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-7 w-10 rounded-md" />
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-6 py-3">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="px-6 pb-6">
          <div className="rounded-lg border">
            <div className="flex h-11 items-center border-b px-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="ml-6 h-4 w-12 hidden md:block" />
              <Skeleton className="ml-6 h-4 w-20 hidden md:block" />
              <Skeleton className="ml-6 h-4 w-36 hidden lg:block" />
              <Skeleton className="ml-6 h-4 w-20 hidden lg:block" />
              <Skeleton className="ml-6 h-4 w-20 hidden xl:block" />
              <Skeleton className="ml-6 h-4 w-14 hidden md:block" />
              <Skeleton className="ml-6 h-4 w-10" />
              <Skeleton className="ml-6 h-4 w-12" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex h-12 items-center border-b px-4 last:border-b-0"
              >
                <Skeleton className="h-4 w-28" />
                <Skeleton className="ml-6 h-5 w-12 rounded-full hidden md:block" />
                <Skeleton className="ml-6 h-4 w-20 hidden md:block" />
                <Skeleton className="ml-6 h-4 w-44 hidden lg:block" />
                <Skeleton className="ml-6 h-4 w-20 hidden lg:block" />
                <Skeleton className="ml-6 h-4 w-28 hidden xl:block" />
                <Skeleton className="ml-6 h-5 w-14 rounded-full hidden md:block" />
                <Skeleton className="ml-6 h-5 w-5 rounded-full" />
                <Skeleton className="ml-6 h-4 w-4 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
