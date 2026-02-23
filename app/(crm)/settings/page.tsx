import { getSettingsProfile } from "@/app/actions/settings"
import SettingsPageInner from "@/components/pages/settings-page"

export default async function SettingsPage() {
  const profile = await getSettingsProfile()
  return <SettingsPageInner initialProfile={profile ?? undefined} />
}
