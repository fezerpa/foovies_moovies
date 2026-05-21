import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DiscoverRedirect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: memberships } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)

  const clubIds = (memberships ?? []).map((m) => m.club_id)
  if (clubIds.length === 0) redirect('/clubs')

  const { data: session } = await supabase
    .from('sessions')
    .select('club_id')
    .in('club_id', clubIds)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!session) redirect('/clubs')

  const { data: club } = await supabase
    .from('clubs')
    .select('invite_code')
    .eq('id', session.club_id)
    .single()

  redirect(`/clubs/${club?.invite_code}/session/discover`)
}
