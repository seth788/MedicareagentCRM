import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createOrganization } from "@/app/actions/organization-create"
import { ForceLightTheme } from "@/components/force-light-theme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function CreateOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ parent_org_id?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/organization/create")

  const { parent_org_id } = await searchParams
  const isSubAgency = !!parent_org_id

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4">
      <ForceLightTheme />
      <div className="mb-8 flex items-center justify-center">
        <Link href="/dashboard">
          <Image src="/logo.svg" alt="AdvantaCRM" width={140} height={36} className="h-9 w-auto" priority />
        </Link>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSubAgency ? "Set up your agency" : "Create organization"}</CardTitle>
          <CardDescription>
            {isSubAgency
              ? "You've joined as an agency. Create your sub-agency to get started."
              : "Create a new agency to invite and manage agents."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={createOrganization as unknown as (formData: FormData) => Promise<void>}
            className="flex flex-col gap-4"
          >
            {parent_org_id ? <input type="hidden" name="parent_org_id" value={parent_org_id} /> : null}
            <div className="grid gap-2">
              <Label htmlFor="name">Organization name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Acme Medicare Agency"
                required
                autoComplete="organization"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="organization_type">Organization type</Label>
              <select
                id="organization_type"
                name="organization_type"
                required
                defaultValue={isSubAgency ? "sub_agency" : "agency"}
                className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background pl-3 pr-10 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundPosition: "right 0.75rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1rem 1rem",
                }}
              >
                <option value="agency">Agency</option>
                <option value="sub_agency">Sub-Agency</option>
              </select>
            </div>
            <Button type="submit" className="w-full">
              Create organization
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
