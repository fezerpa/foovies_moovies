import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id: slug, sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: club } = await supabase
    .from('clubs')
    .select('id, name')
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

  const [{ data: session }, { data: members }, { data: ratings }] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, watched_at, winner_tmdb_id, nominations(title, poster_url, tmdb_movie_id, profiles(username))')
      .eq('id', sessionId)
      .eq('club_id', club.id)
      .single(),
    supabase
      .from('club_members')
      .select('user_id, profiles(id, username)')
      .eq('club_id', club.id),
    supabase
      .from('session_ratings')
      .select('user_id, rating')
      .eq('session_id', sessionId),
  ])

  if (!session) notFound()

  const noms = session.nominations as Array<{
    title: string
    poster_url: string | null
    tmdb_movie_id: number
    profiles: { username: string } | null
  }>

  const winner = noms.find((n) => n.tmdb_movie_id === session.winner_tmdb_id) ?? noms[0]

  const ratingByUser: Record<string, number> = {}
  for (const r of ratings ?? []) {
    ratingByUser[r.user_id] = r.rating
  }

  const allRatings = Object.values(ratingByUser)
  const avgRating =
    allRatings.length > 0
      ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1)
      : null

  const watchedDate = session.watched_at
    ? new Date(session.watched_at).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <main className="container">
      <Link
        href={`/clubs/${slug}`}
        className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 transition hover:text-white"
      >
        ← {club.name}
      </Link>

      <div className="mt-6 flex gap-5">
        {winner?.poster_url ? (
          <img
            src={winner.poster_url}
            alt={winner.title}
            className="h-40 w-28 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="h-40 w-28 shrink-0 rounded-xl bg-gray-800" />
        )}
        <div className="flex flex-col justify-center">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            Película vista
          </p>
          <h1 className="mt-1 text-2xl font-bold">{winner?.title ?? 'Sin título'}</h1>
          {winner?.profiles?.username && (
            <p className="mt-1 text-sm text-gray-400">
              Nominada por <span className="text-white">{winner.profiles.username}</span>
            </p>
          )}
          {watchedDate && (
            <p className="mt-1 text-sm text-gray-500">{watchedDate}</p>
          )}
          {avgRating && (
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-pink-400">{avgRating}</span>
              <span className="text-sm text-gray-500">/10 promedio</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 card p-5">
        <h2 className="mb-4 font-semibold">Puntuaciones</h2>
        <ul className="divide-y divide-gray-800">
          {members?.map((m) => {
            const profile = m.profiles as { id: string; username: string } | null
            const rating = ratingByUser[m.user_id]

            return (
              <li
                key={m.user_id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <span className="text-sm">{profile?.username ?? 'Usuario'}</span>
                {rating !== undefined ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-pink-400">{rating}</span>
                    <span className="text-xs text-gray-500">/10</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-600">No calificó</span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
