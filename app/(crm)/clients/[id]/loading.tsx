import { Skeleton } from "@/components/ui/skeleton"

/** Skeleton matches client-profile-page: header with breadcrumb, profile card (banner + avatar + name), tabs + content. */
export default function ClientProfileLoading() {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-5 w-px" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-px" />
        <Skeleton className="h-5 w-40" />
      </header>
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Skeleton className="h-28 w-full rounded-t-xl sm:h-32" />
            <div className="relative px-5 pb-6 sm:px-7">
              <div className="-mt-14 mb-4 flex items-end justify-between sm:-mt-16">
                <Skeleton className="h-24 w-24 rounded-2xl sm:h-28 sm:w-28" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex gap-1 border-b">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-t-md" />
              ))}
            </div>
            <div className="mt-4 space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
