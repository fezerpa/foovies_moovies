import { createClient } from '@/lib/supabase/server'
import WelcomeModal from './WelcomeModal'

export default async function WelcomePrompt() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  if (!user.user_metadata?.onboarding_completed) {
    return <WelcomeModal type="onboarding" />
  }

  const { count } = await supabase
    .from('club_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) === 0) {
    return <WelcomeModal type="no-clubs" />
  }

  return null
}
