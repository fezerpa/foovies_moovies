import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import SessionView from '@/components/session/SessionView'
import type { NominationWithVotes } from '@/types/database'

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, invite_code')
    .eq('invite_code', slug)
    .single()

  if (!club) notFound()

  const { data: membership } = await supabase
    .from('club_members')
    .select('role')
    .eq('club_id', club.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/clubs')

  const isOwner = membership.role === 'owner'

  const { data: session } = await supabase
    .from('sessions')
    .select('id, status')
    .eq('club_id', club.id)
    .in('status', ['open', 'closed', 'watched'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let nominations: NominationWithVotes[] = []
  let myVoteNominationId: string | null = null
  let myNominationId: string | null = null
  let myRating: number | null = null

  if (session) {
    const [{ data: noms }, { data: vote }, { data: ratingRow }, { data: myNom }] = await Promise.all([
      supabase
        .from('nomination_vote_counts')
        .select('*')
        .eq('session_id', session.id)
        .order('vote_count', { ascending: false }),
      supabase
        .from('votes')
        .select('nomination_id')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('session_ratings')
        .select('rating')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('nominations')
        .select('id')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .maybeSingle(),
    ])
    const rawNoms = noms ?? []
    if (rawNoms.length > 0) {
      const userIds = [...new Set(rawNoms.map((n) => n.nominated_by))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds)
      const usernameMap: Record<string, string> = {}
      for (const p of profiles ?? []) usernameMap[p.id] = p.username
      nominations = rawNoms.map((n) => ({
        ...n,
        nominated_by: usernameMap[n.nominated_by] ?? n.nominated_by,
      }))
    }
    myVoteNominationId = vote?.nomination_id ?? null
    myNominationId = myNom?.id ?? null
    myRating = ratingRow?.rating ?? null
  }

  return (
    <SessionView
      clubId={club.id}
      clubSlug={slug}
      clubName={club.name}
      userId={user.id}
      isOwner={isOwner}
      initialSession={session ? { id: session.id, status: session.status } : null}
      initialNominations={nominations}
      initialMyVoteNominationId={myVoteNominationId}
      initialMyNominationId={myNominationId}
      initialMyRating={myRating}
    />
  )
}
