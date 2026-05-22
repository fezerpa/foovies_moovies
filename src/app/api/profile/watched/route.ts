import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 6

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const page = Math.max(1, parseInt(new URL(req.url).searchParams.get('page') ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: memberships } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)

  const clubIds = (memberships ?? []).map((m) => m.club_id as string)
  if (clubIds.length === 0) return NextResponse.json({ sessions: [], has_more: false })

  const { data: sessions, count } = await supabase
    .from('sessions')
    .select(
      'id, watched_at, winner_tmdb_id, nominations(title, poster_url, tmdb_movie_id), clubs(name, invite_code)',
      { count: 'exact' }
    )
    .in('club_id', clubIds)
    .eq('status', 'watched')
    .order('watched_at', { ascending: false })
    .range(from, to)

  const sessionIds = (sessions ?? []).map((s) => s.id as string)
  const { data: ratings } = sessionIds.length > 0
    ? await supabase
        .from('session_ratings')
        .select('session_id, rating')
        .eq('user_id', user.id)
        .in('session_id', sessionIds)
    : { data: [] as Array<{ session_id: string; rating: number }> }

  const ratingMap: Record<string, number> = {}
  for (const r of ratings ?? []) ratingMap[r.session_id] = r.rating as number

  const result = (sessions ?? []).map((s) => {
    const noms = s.nominations as Array<{ title: string; poster_url: string | null; tmdb_movie_id: number }>
    const winner = noms.find((n) => n.tmdb_movie_id === s.winner_tmdb_id) ?? noms[0]
    const club = s.clubs as { name: string; invite_code: string } | null
    return {
      id: s.id as string,
      watched_at: s.watched_at as string | null,
      title: winner?.title ?? 'Sin título',
      poster_url: winner?.poster_url ?? null,
      tmdb_id: winner?.tmdb_movie_id ?? null,
      club_name: club?.name ?? null,
      club_slug: club?.invite_code ?? null,
      my_rating: ratingMap[s.id as string] ?? null,
    }
  })

  return NextResponse.json({
    sessions: result,
    has_more: (count ?? 0) > to + 1,
  })
}
