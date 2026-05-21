import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function SessionHistoryPage({
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
    .eq('club_id', (club as any).id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/clubs')

  const { data: session } = await supabase
    .from('sessions')
    .select('id, watched_at, winner_tmdb_id, status')
    .eq('id', sessionId)
    .eq('club_id', (club as any).id)
    .single()

  if (!session || (session as any).status !== 'watched') notFound()

  const [{ data: nominations }, { data: ratings }] = await Promise.all([
    supabase
      .from('nomination_vote_counts')
      .select('*')
      .eq('session_id', sessionId)
      .order('vote_count', { ascending: false }),
    supabase
      .from('session_ratings')
      .select('user_id, rating')
      .eq('session_id', sessionId),
  ])

  const userIds = [
    ...new Set([
      ...(nominations ?? []).map((n: any) => n.nominated_by as string),
      ...(ratings ?? []).map((r: any) => r.user_id as string),
    ]),
  ]
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, username').in('id', userIds)
    : { data: [] as Array<{ id: string; username: string }> }

  const usernameMap: Record<string, string> = {}
  for (const p of profiles ?? []) usernameMap[(p as any).id] = (p as any).username

  const s = session as any
  const winner = (nominations ?? []).find((n: any) => n.tmdb_movie_id === s.winner_tmdb_id) as any
  const watchedDate = s.watched_at
    ? new Date(s.watched_at as string).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const ratingsList = ratings ?? []
  const avgRating =
    ratingsList.length > 0
      ? (ratingsList.reduce((sum: number, r: any) => sum + (r.rating as number), 0) / ratingsList.length).toFixed(1)
      : null

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href={`/clubs/${slug}`}
        className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 transition hover:text-white"
      >
        ← {(club as any).name}
      </Link>

      <div className="mt-6 mb-8">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-gray-500">
          Sesión vista{watchedDate ? ` · ${watchedDate}` : ''}
        </p>
        <h1 className="text-3xl font-bold">{winner?.title ?? 'Sesión'}</h1>
      </div>

      {winner && (
        <div className="mb-8 rounded-2xl border border-green-800/50 bg-green-950/20 p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-green-400">
            Película elegida
          </p>
          <div className="flex items-center gap-4">
            {winner.poster_url ? (
              <img
                src={winner.poster_url}
                alt={winner.title}
                className="h-24 w-16 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="h-24 w-16 shrink-0 rounded-lg bg-gray-800" />
            )}
            <div>
              <p className="text-xl font-bold">{winner.title}</p>
              <p className="mt-0.5 text-sm text-gray-400">
                Nominada por {usernameMap[winner.nominated_by] ?? winner.nominated_by}
              </p>
              {avgRating !== null && (
                <p className="mt-3 text-3xl font-bold text-pink-400">
                  {avgRating}
                  <span className="ml-1 text-sm font-normal text-gray-500">/10 de media</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {ratingsList.length > 0 && (
        <div className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 font-semibold">
            Puntuaciones{' '}
            <span className="text-gray-500">({ratingsList.length})</span>
          </h2>
          <ul className="divide-y divide-gray-800">
            {(ratingsList as any[]).map((r) => (
              <li key={r.user_id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-gray-300">{usernameMap[r.user_id] ?? 'Usuario'}</span>
                <span className="font-bold text-pink-400">{r.rating}/10</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 font-semibold">
          Todas las nominaciones{' '}
          <span className="text-gray-500">({(nominations ?? []).length})</span>
        </h2>
        <ul className="space-y-3">
          {(nominations ?? [] as any[]).map((nom: any) => {
            const isWinner = nom.tmdb_movie_id === s.winner_tmdb_id
            const voteCount = Number(nom.vote_count)
            return (
              <li
                key={nom.nomination_id}
                className={`flex items-center gap-4 rounded-xl p-3 ${
                  isWinner ? 'bg-green-950/30 ring-1 ring-green-800/50' : 'bg-gray-800/50'
                }`}
              >
                {nom.poster_url ? (
                  <img
                    src={nom.poster_url}
                    alt={nom.title}
                    className="h-16 w-11 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-16 w-11 shrink-0 rounded bg-gray-800" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{nom.title}</p>
                    {isWinner && (
                      <span className="shrink-0 text-xs text-green-400">✓ Ganadora</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    por {usernameMap[nom.nominated_by] ?? nom.nominated_by}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold">{voteCount}</p>
                  <p className="text-xs text-gray-500">{voteCount === 1 ? 'voto' : 'votos'}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
