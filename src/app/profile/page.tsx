import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileForm from '@/components/profile/ProfileForm'
import WatchedMoviesList from '@/components/profile/WatchedMoviesList'
import PrivacyToggles from '@/components/profile/PrivacyToggles'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('username, show_taste, show_watched').eq('id', user.id).single(),
    supabase.from('club_members').select('role, clubs(id, name, invite_code)').eq('user_id', user.id),
  ])

  const clubs = (memberships ?? []).map((m) => ({
    ...(m.clubs as { id: string; name: string; invite_code: string }),
    role: m.role as string,
  }))

  const showTaste = (profile?.show_taste as boolean | undefined) ?? true
  const showWatched = (profile?.show_watched as boolean | undefined) ?? true

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
    <main className="container">
      <Link href="/clubs" className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 transition hover:text-white">
        ← Mis clubs
      </Link>
      <h1 className="mt-6 mb-8 text-3xl font-bold">Mi perfil</h1>

      <ProfileForm userId={user.id} initialUsername={username} avatarUrl={avatarUrl} clubs={clubs} />

      <div className="mt-8">
        <PrivacyToggles userId={user.id} initialShowTaste={showTaste} initialShowWatched={showWatched} />
      </div>

      {/* Taste profile */}
      {(tasteSummary || tasteMovies.length > 0) && (
        <div className="mt-8 card p-6">
          <h2 className="mb-4 font-semibold">Perfil cinematográfico</h2>
          {tasteSummary && (
            <p className="mb-5 text-sm leading-relaxed text-gray-300 italic">"{tasteSummary}"</p>
          )}
          {tasteMovies.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {tasteMovies.map((m) => {
                const href = clubs[0]
                  ? `/clubs/${clubs[0].invite_code}/session/discover/${m.tmdb_id}`
                  : null
                const card = (
                  <>
                    {m.poster_url ? (
                      <img src={m.poster_url} alt={m.title} className="aspect-[2/3] w-full object-cover" />
                    ) : (
                      <div className="aspect-[2/3] w-full bg-gray-800" />
                    )}
                    <div className="flex flex-1 flex-col p-3">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">{m.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{m.year}</p>
                      <p className="mt-auto pt-2 text-sm font-bold text-pink-400">
                        {m.rating}<span className="ml-0.5 text-xs font-normal text-gray-500">/10</span>
                      </p>
                    </div>
                  </>
                )
                return href ? (
                  <Link key={m.tmdb_id} href={href} className="movie-card">{card}</Link>
                ) : (
                  <div key={m.tmdb_id} className="movie-card">{card}</div>
                )
              })}
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
