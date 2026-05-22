import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user: viewer } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, show_taste, show_watched, taste_summary, taste_movies, created_at')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const isOwner = viewer?.id === profile.id
  const showTaste = isOwner || (profile.show_taste ?? true)
  const showWatched = isOwner || (profile.show_watched ?? true)

  const createdAt = profile.created_at
    ? new Date(profile.created_at as string).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : null

  const tasteSummary = profile.taste_summary as string | null
  const tasteMovies = (profile.taste_movies as Array<{
    tmdb_id: number; title: string; year: string; poster_url: string | null; rating: number
  }> | null) ?? []

  // Watched sessions
  type Session = {
    id: string; watched_at: string | null; title: string; poster_url: string | null
    tmdb_id: number | null; club_name: string | null; club_slug: string | null
  }
  let sessions: Session[] = []

  if (showWatched) {
    const { data: clubMemberships } = await supabase
      .from('club_members').select('club_id').eq('user_id', profile.id as string)
    const clubIds = (clubMemberships ?? []).map((m) => m.club_id as string)

    if (clubIds.length > 0) {
      const { data: rawSessions } = await supabase
        .from('sessions')
        .select('id, watched_at, winner_tmdb_id, nominations(title, poster_url, tmdb_movie_id), clubs(name, invite_code)')
        .in('club_id', clubIds)
        .eq('status', 'watched')
        .order('watched_at', { ascending: false })
        .range(0, 5)

      sessions = (rawSessions ?? []).map((s) => {
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
        }
      })
    }
  }

  return (
    <main className="container">
      <Link href="/clubs" className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 transition hover:text-white">
        ← Volver
      </Link>

      {/* Header */}
      <div className="mt-6 mb-8 flex items-center gap-5">
        <Avatar
          src={profile.avatar_url as string | null}
          alt={profile.username as string}
          className="h-20 w-20 shrink-0 rounded-full ring-2 ring-gray-700"
        />
        <div>
          <h1 className="text-2xl font-bold">{profile.username as string}</h1>
          {createdAt && <p className="mt-1 text-sm text-gray-500">Miembro desde {createdAt}</p>}
          {isOwner && (
            <Link href="/profile" className="mt-2 inline-block text-xs text-pink-400 transition hover:text-pink-300">
              Editar perfil →
            </Link>
          )}
        </div>
      </div>

      {/* Taste profile */}
      {showTaste && (tasteSummary || tasteMovies.length > 0) && (
        <div className="mb-8 card p-6">
          <h2 className="mb-4 font-semibold">Perfil cinematográfico</h2>
          {tasteSummary && (
            <p className="mb-5 text-sm leading-relaxed text-gray-300 italic">"{tasteSummary}"</p>
          )}
          {tasteMovies.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {tasteMovies.map((m) => (
                <div key={m.tmdb_id} className="movie-card">
                  {m.poster_url ? (
                    <img src={m.poster_url} alt={m.title} className="aspect-[2/3] w-full object-cover" />
                  ) : (
                    <div className="aspect-[2/3] w-full bg-gray-800" />
                  )}
                  <div className="flex flex-1 flex-col p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{m.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{m.year}</p>
                    {isOwner && (
                      <p className="mt-auto pt-2 text-sm font-bold text-pink-400">
                        {m.rating}<span className="ml-0.5 text-xs font-normal text-gray-500">/10</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Watched movies */}
      {showWatched && sessions.length > 0 && (
        <div>
          <h2 className="mb-4 font-semibold">Películas vistas</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {sessions.map((s) => {
              const date = s.watched_at
                ? new Date(s.watched_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                : null
              const inner = (
                <>
                  {s.poster_url ? (
                    <img src={s.poster_url} alt={s.title} className="aspect-[2/3] w-full object-cover" />
                  ) : (
                    <div className="aspect-[2/3] w-full bg-gray-800" />
                  )}
                  <div className="flex flex-1 flex-col p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{s.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {s.club_name && <span className="truncate text-xs text-gray-500">{s.club_name}</span>}
                      {date && <span className="text-xs text-gray-600">{date}</span>}
                    </div>
                  </div>
                </>
              )
              return s.club_slug ? (
                <Link key={s.id} href={`/clubs/${s.club_slug}/sessions/${s.id}`} className="movie-card">
                  {inner}
                </Link>
              ) : (
                <div key={s.id} className="movie-card">{inner}</div>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
