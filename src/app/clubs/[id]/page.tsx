import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import SessionListener from '@/components/club/SessionListener'
import DeleteClubButton from '@/components/club/DeleteClubButton'

export default async function ClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  // Resolve slug (invite_code) → club
  const { data: club } = await supabase
    .from('clubs')
    .select('*')
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

  const [{ data: members }, { data: openSession }, { data: watchedSessions }] = await Promise.all([
    supabase
      .from('club_members')
      .select('role, joined_at, profiles(id, username)')
      .eq('club_id', club.id)
      .order('joined_at'),
    supabase
      .from('sessions')
      .select('id')
      .eq('club_id', club.id)
      .eq('status', 'open')
      .maybeSingle(),
    supabase
      .from('sessions')
      .select('id, watched_at, winner_tmdb_id, nominations(title, poster_url, tmdb_movie_id, profiles(username))')
      .eq('club_id', club.id)
      .eq('status', 'watched')
      .order('watched_at', { ascending: false }),
  ])

  const watchedIds = watchedSessions?.map((s) => s.id) ?? []
  const { data: ratingsData } = watchedIds.length > 0
    ? await supabase
        .from('session_ratings')
        .select('session_id, rating')
        .in('session_id', watchedIds)
    : { data: [] as Array<{ session_id: string; rating: number }> }

  const ratingsBySession: Record<string, number[]> = {}
  for (const r of ratingsData ?? []) {
    if (!ratingsBySession[r.session_id]) ratingsBySession[r.session_id] = []
    ratingsBySession[r.session_id].push(r.rating)
  }

  const winsByUsername: Record<string, number> = {}
  for (const s of watchedSessions ?? []) {
    const noms = s.nominations as Array<{ tmdb_movie_id: number; profiles: { username: string } | null }>
    const winner = noms.find((n) => n.tmdb_movie_id === s.winner_tmdb_id)
    if (winner?.profiles?.username) {
      const u = winner.profiles.username
      winsByUsername[u] = (winsByUsername[u] ?? 0) + 1
    }
  }

  const isOwner = membership.role === 'owner'
  const clubId = club.id

  async function createSession() {
    'use server'
    const supabase = await createClient()
    const { data } = await supabase
      .from('sessions')
      .insert({ club_id: clubId, status: 'open' })
      .select('id')
      .single()
    if (data) redirect(`/clubs/${slug}/session`)
    else redirect(`/clubs/${slug}`)
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <SessionListener clubId={clubId} />
      <Link
        href="/clubs"
        className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 transition hover:text-white"
      >
        ← Mis clubs
      </Link>

      <div className="mt-6 mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{club.name}</h1>
          {club.description && (
            <p className="mt-2 text-gray-400">{club.description}</p>
          )}
        </div>
        {isOwner && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-pink-900/50 px-3 py-1 text-sm text-pink-300">
              Owner
            </span>
            <DeleteClubButton clubId={clubId} />
          </div>
        )}
      </div>

      {/* Código de invitación */}
      <div className="mb-6 rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-gray-500">
          Código de invitación
        </p>
        <p className="font-mono text-3xl font-bold tracking-widest text-white">
          {club.invite_code}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Comparte este código con quien quieras que se una al club.
        </p>
      </div>

      {/* Sesión de votación */}
      {(isOwner || !!openSession) && (
        <div className="mb-6 rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 font-semibold">Sesión de votación</h2>
          {openSession ? (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-sm text-green-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                Sesión activa
              </span>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/clubs/${slug}/session/discover`}
                  className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-gray-500 hover:text-white"
                >
                  Ver catálogo
                </Link>
                <Link
                  href={`/clubs/${slug}/session`}
                  className="rounded-xl bg-pink-600 px-5 py-2 text-sm font-semibold transition hover:bg-pink-500"
                >
                  Ir a la sesión →
                </Link>
              </div>
            </div>
          ) : isOwner ? (
            <form action={createSession}>
              <button
                type="submit"
                className="rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-semibold transition hover:bg-pink-500"
              >
                Crear nueva sesión
              </button>
            </form>
          ) : null}
        </div>
      )}

      {/* Películas vistas */}
      <div className="mb-6 rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 font-semibold">
          Películas vistas{' '}
          <span className="text-gray-500">({watchedSessions?.length ?? 0})</span>
        </h2>
        {!watchedSessions || watchedSessions.length === 0 ? (
          <p className="text-sm text-gray-500">
            Todavía no habéis marcado ninguna película como vista.
          </p>
        ) : (
          <ul className="space-y-3">
            {watchedSessions.map((session) => {
              const noms = session.nominations as Array<{
                title: string
                poster_url: string | null
                tmdb_movie_id: number
                profiles: { username: string } | null
              }>
              const winner =
                noms.find((n) => n.tmdb_movie_id === session.winner_tmdb_id) ?? noms[0]
              const watchedDate = session.watched_at
                ? new Date(session.watched_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : null
              const sessionRatings = ratingsBySession[session.id] ?? []
              const avgRating =
                sessionRatings.length > 0
                  ? (sessionRatings.reduce((a, b) => a + b, 0) / sessionRatings.length).toFixed(1)
                  : null

              return (
                <li key={session.id}>
                  <Link
                    href={`/clubs/${slug}/sessions/${session.id}`}
                    className="flex items-center gap-4 rounded-xl transition hover:bg-gray-800 -mx-2 px-2 py-1"
                  >
                    {winner?.poster_url ? (
                      <img
                        src={winner.poster_url}
                        alt={winner.title}
                        className="h-16 w-11 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-16 w-11 shrink-0 rounded-lg bg-gray-800" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{winner?.title ?? 'Sin título'}</p>
                      {winner?.profiles?.username && (
                        <p className="text-xs text-gray-500">por {winner.profiles.username}</p>
                      )}
                      {watchedDate && (
                        <p className="mt-0.5 text-xs text-gray-500">{watchedDate}</p>
                      )}
                    </div>
                    {avgRating !== null ? (
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold text-pink-400">{avgRating}</p>
                        <p className="text-xs text-gray-500">/10</p>
                      </div>
                    ) : (
                      <span className="shrink-0 text-xs text-gray-600">Sin votos</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Lista de miembros */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 font-semibold">
          Miembros{' '}
          <span className="text-gray-500">({members?.length ?? 0})</span>
        </h2>
        <ul className="divide-y divide-gray-800">
          {members?.map((m) => {
            const profile = m.profiles as { id: string; username: string } | null
            return (
              <li
                key={profile?.id}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-sm">{profile?.username ?? 'Usuario'}</span>
                <div className="flex items-center gap-2">
                  {profile?.username && winsByUsername[profile.username] > 0 && (
                    <span className="text-xs text-yellow-400">
                      🏆 {winsByUsername[profile.username]}
                    </span>
                  )}
                  {m.role === 'owner' && (
                    <span className="rounded-full bg-pink-900/40 px-2 py-0.5 text-xs text-pink-300">
                      Owner
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
