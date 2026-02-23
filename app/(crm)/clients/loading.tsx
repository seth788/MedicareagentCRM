import { Skeleton } from "@/components/ui/skeleton"

/** Skeleton matches clients-page layout: header, toolbar (search + filters), table. */
export default function ClientsLoading() {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-5 w-px" />
        <Skeleton className="h-5 w-20" />
        <div className="ml-auto">
          <Skeleton className="h-8 w-28" />
        </div>
      </header>
      <div className="flex-1 overflow-auto">
        <div className="flex flex-wrap items-center gap-2 border-b px-6 py-3">
          <div className="relative flex-1 md:max-w-xs">
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-7 w-12 rounded-md" />
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
        </div>
        <div className="p-6">
          <div className="rounded-lg border">
            <div className="flex h-11 items-center border-b px-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="ml-6 h-4 w-20 hidden md:block" />
              <Skeleton className="ml-6 h-4 w-16 hidden lg:block" />
              <Skeleton className="ml-6 h-4 w-20 hidden md:block" />
              <Skeleton className="ml-6 h-4 w-24" />
              <Skeleton className="ml-6 h-4 w-24 hidden lg:block" />
            </div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="flex h-12 items-center border-b px-4 last:border-b-0"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="ml-6 h-4 w-28 hidden md:block" />
                <Skeleton className="ml-6 h-4 w-36 hidden lg:block" />
                <Skeleton className="ml-6 h-4 w-24 hidden md:block" />
                <Skeleton className="ml-6 h-4 w-20" />
                <Skeleton className="ml-6 h-4 w-24 hidden lg:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
