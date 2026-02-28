import { createClient } from "@/lib/supabase/server"
import { getUserMemberOrgsWithRoles, ROLES_CAN_CREATE_AGENCY } from "@/lib/db/organizations"
import { getSettingsProfile } from "@/app/actions/settings"
import SettingsPageInner from "@/components/pages/settings-page"

export default async function SettingsPage() {
  const profile = await getSettingsProfile()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const memberOrgsWithRoles = user ? await getUserMemberOrgsWithRoles(user.id) : []
  // Independent agents: Create Agency. Affiliated street-level/agency: Request Subagency. LOA/community: neither.
  const canCreateAgency = memberOrgsWithRoles.length === 0
  const canRequestSubagency =
    memberOrgsWithRoles.length > 0 &&
    memberOrgsWithRoles.some((m) => ROLES_CAN_CREATE_AGENCY.includes(m.role as (typeof ROLES_CAN_CREATE_AGENCY)[number]))

  return <SettingsPageInner initialProfile={profile ?? undefined} canCreateAgency={canCreateAgency} canRequestSubagency={canRequestSubagency} />
}
