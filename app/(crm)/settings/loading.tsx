import { Skeleton } from "@/components/ui/skeleton"

/** Skeleton matches settings-page layout: title block, Profile card, Notifications card, About card. */
export default function SettingsLoading() {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-5 w-px" />
        <Skeleton className="h-5 w-20" />
      </header>
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl p-6">
          <div className="mb-6 space-y-2">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="grid gap-6">
            <Skeleton className="h-[340px] rounded-lg" />
            <Skeleton className="h-[220px] rounded-lg" />
            <Skeleton className="h-[120px] rounded-lg" />
          </div>
        </div>
      </div>
    </>
  )
}
