import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileForm from '@/components/profile/ProfileForm'
import WatchedMoviesList from '@/components/profile/WatchedMoviesList'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', user.id).single(),
    supabase.from('club_members').select('role, clubs(id, name, invite_code)').eq('user_id', user.id),
  ])

  const clubs = (memberships ?? []).map((m) => ({
    ...(m.clubs as { id: string; name: string; invite_code: string }),
    role: m.role as string,
  }))

  const username = (profile?.username as string | undefined)
    ?? (user.user_metadata?.full_name as string | undefined)
    ?? 'Usuario'
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null
  const tasteSummary = (user.user_metadata?.taste_summary as string | undefined) ?? null
  const tasteMovies = (user.user_metadata?.taste_movies as Array<{
    tmdb_id: number; title: string; year: string; poster_url: string | null
    rating: number; genres: string[]; director: string | null
  }> | undefined) ?? []

  // First page of watched sessions (server-side)
  const { data: clubMemberships } = await supabase
    .from('club_members').select('club_id').eq('user_id', user.id)
  const clubIds = (clubMemberships ?? []).map((m) => m.club_id as string)

  let initialSessions: Array<{
    id: string; watched_at: string | null; title: string; poster_url: string | null
    tmdb_id: number | null; club_name: string | null; club_slug: string | null; my_rating: number | null
  }> = []
  let initialHasMore = false

  if (clubIds.length > 0) {
    const { data: sessions, count } = await supabase
      .from('sessions')
      .select('id, watched_at, winner_tmdb_id, nominations(title, poster_url, tmdb_movie_id), clubs(name, invite_code)', { count: 'exact' })
      .in('club_id', clubIds)
      .eq('status', 'watched')
      .order('watched_at', { ascending: false })
      .range(0, 5)

    const sessionIds = (sessions ?? []).map((s) => s.id as string)
    const { data: ratings } = sessionIds.length > 0
      ? await supabase.from('session_ratings').select('session_id, rating').eq('user_id', user.id).in('session_id', sessionIds)
      : { data: [] as Array<{ session_id: string; rating: number }> }

    const ratingMap: Record<string, number> = {}
    for (const r of ratings ?? []) ratingMap[r.session_id] = r.rating as number

    initialSessions = (sessions ?? []).map((s) => {
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
    initialHasMore = (count ?? 0) > 6
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/clubs" className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 transition hover:text-white">
        ← Mis clubs
      </Link>
      <h1 className="mt-6 mb-8 text-3xl font-bold">Mi perfil</h1>

      <ProfileForm userId={user.id} initialUsername={username} avatarUrl={avatarUrl} clubs={clubs} />

      {/* Taste profile */}
      {(tasteSummary || tasteMovies.length > 0) && (
        <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 font-semibold">Perfil cinematográfico</h2>
          {tasteSummary && (
            <p className="mb-5 text-sm leading-relaxed text-gray-300 italic">"{tasteSummary}"</p>
          )}
          {tasteMovies.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {tasteMovies.map((m) => (
                <div key={m.tmdb_id} className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-950 p-2">
                  {m.poster_url ? (
                    <img src={m.poster_url} alt={m.title} className="h-12 w-8 rounded-md object-cover" />
                  ) : (
                    <div className="h-12 w-8 rounded-md bg-gray-800" />
                  )}
                  <div>
                    <p className="text-xs font-medium leading-tight">{m.title}</p>
                    <p className="text-xs text-gray-500">{m.year}</p>
                    <p className="text-xs font-semibold text-pink-400">{m.rating}/10</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/onboarding"
            className="mt-4 block text-xs text-gray-500 transition hover:text-pink-400"
          >
            Actualizar preferencias →
          </Link>
        </div>
      )}

      {/* Watched movies */}
      <div className="mt-8">
        <h2 className="mb-4 font-semibold">Películas vistas</h2>
        <WatchedMoviesList initialSessions={initialSessions} initialHasMore={initialHasMore} />
      </div>
    </main>
  )
}
