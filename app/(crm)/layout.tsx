import { fetchCRMData } from "@/app/actions/crm-data"
import { CrmLayoutClient } from "@/components/crm-layout-client"

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  const initialData = await fetchCRMData()
  return <CrmLayoutClient initialData={initialData ?? undefined}>{children}</CrmLayoutClient>
}
