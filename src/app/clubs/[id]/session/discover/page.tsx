import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import DiscoverView from '@/components/session/DiscoverView'

type Genre = { id: number; name: string }

async function fetchGenres(): Promise<Genre[]> {
  try {
    const res = await fetch(
      'https://api.themoviedb.org/3/genre/movie/list?language=es-ES',
      {
        headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        next: { revalidate: 86400 },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.genres ?? []
  } catch {
    return []
  }
}

export default async function DiscoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ genre?: string }>
}) {
  const [{ id: slug }, sp] = await Promise.all([params, searchParams])
  const initialGenre = sp.genre ?? 'all'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: club } = await supabase
    .from('clubs')
    .select('id')
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

  const [{ data: session }, genres] = await Promise.all([
    supabase
      .from('sessions')
      .select('id')
      .eq('club_id', club.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchGenres(),
  ])

  if (!session) redirect(`/clubs/${slug}/session`)

  const [{ data: nominations }, { data: myNomination }] = await Promise.all([
    supabase.from('nominations').select('tmdb_movie_id').eq('session_id', session.id),
    supabase
      .from('nominations')
      .select('tmdb_movie_id')
      .eq('session_id', session.id)
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const nominatedIds = (nominations ?? []).map((n) => n.tmdb_movie_id as number)

  return (
    <DiscoverView
      clubSlug={slug}
      sessionId={session.id}
      userId={user.id}
      initialNominatedIds={nominatedIds}
      myNominatedMovieId={myNomination?.tmdb_movie_id ?? null}
      genres={genres}
      initialGenre={initialGenre}
    />
  )
}
