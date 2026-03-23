import { getCurrentUser } from "@/lib/auth"
import { getBusinessProfile } from "@/models/business-profile"
import { getSettings } from "@/models/settings"
import SetupWizard from "./components/setup-wizard"

export const dynamic = "force-dynamic"

export default async function SetupPage() {
  const user = await getCurrentUser()
  const profile = await getBusinessProfile(user.id)
  const settings = await getSettings(user.id)
  return <SetupWizard initialProfile={profile} settings={settings} />
}
