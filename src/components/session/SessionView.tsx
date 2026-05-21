'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { NominationWithVotes } from '@/types/database'
import RatingModal from './RatingModal'

type Movie = {
  id: number
  title: string
  year: string
  poster_url: string | null
  overview: string
}

type Session = { id: string; status: 'open' | 'closed' | 'watched' }

type Props = {
  clubId: string
  clubSlug: string
  clubName: string
  userId: string
  isOwner: boolean
  initialSession: Session | null
  initialNominations: NominationWithVotes[]
  initialMyVoteNominationId: string | null
  initialMyNominationId: string | null
  initialMyRating: number | null
}

export default function SessionView({
  clubId,
  clubSlug,
  clubName,
  userId,
  isOwner,
  initialSession,
  initialNominations,
  initialMyVoteNominationId,
  initialMyNominationId,
  initialMyRating,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [session, setSession] = useState<Session | null>(initialSession)
  const [nominations, setNominations] = useState<NominationWithVotes[]>(initialNominations)
  const [myVoteNominationId, setMyVoteNominationId] = useState<string | null>(
    initialMyVoteNominationId
  )
  const [myNominationId, setMyNominationId] = useState<string | null>(initialMyNominationId)
  const [myRating, setMyRating] = useState<number | null>(initialMyRating)
  const [showRatingModal, setShowRatingModal] = useState(
    initialSession?.status === 'watched' && initialMyRating === null
  )
  const [submittingRating, setSubmittingRating] = useState(false)
  const [ratingError, setRatingError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Movie[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [nominatingId, setNominatingId] = useState<number | null>(null)
  const [voting, setVoting] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)
  const [markingWatched, setMarkingWatched] = useState(false)
  const [closingSession, setClosingSession] = useState(false)
  const [watchedError, setWatchedError] = useState<string | null>(null)
  const [showTiebreakerModal, setShowTiebreakerModal] = useState(false)
  const [tiedNoms, setTiedNoms] = useState<NominationWithVotes[]>([])

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refetchNominations = useCallback(
    async (sessionId: string) => {
      const [{ data: noms }, { data: vote }, { data: myNom }] = await Promise.all([
        supabase
          .from('nomination_vote_counts')
          .select('*')
          .eq('session_id', sessionId)
          .order('vote_count', { ascending: false }),
        supabase
          .from('votes')
          .select('nomination_id')
          .eq('session_id', sessionId)
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('nominations')
          .select('id')
          .eq('session_id', sessionId)
          .eq('user_id', userId)
          .maybeSingle(),
      ])
      if (noms) {
        const userIds = [...new Set(noms.map((n) => n.nominated_by))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds)
        const usernameMap: Record<string, string> = {}
        for (const p of profiles ?? []) usernameMap[p.id] = p.username
        setNominations(noms.map((n) => ({
          ...n,
          nominated_by: usernameMap[n.nominated_by] ?? n.nominated_by,
        })))
      }
      setMyVoteNominationId(vote?.nomination_id ?? null)
      setMyNominationId(myNom?.id ?? null)
    },
    [supabase, userId]
  )

  // Realtime: nominations, votes, and session status changes
  const sessionId = session?.id
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nominations', filter: `session_id=eq.${sessionId}` },
        () => refetchNominations(sessionId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `session_id=eq.${sessionId}` },
        () => refetchNominations(sessionId)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload: any) => {
          const newStatus = payload.new?.status as Session['status'] | undefined
          if (newStatus) {
            setSession((prev) => (prev ? { ...prev, status: newStatus } : null))
            if (newStatus === 'watched') setShowRatingModal(true)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId, supabase, refetchNominations])

  // Debounced movie search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!query.trim()) { setSearchResults([]); setSearching(false); return }

    setSearching(true)
    setSearchError(null)
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/movies?q=${encodeURIComponent(query)}`)
      const json = await res.json()
      if (!res.ok) {
        setSearchError(json.error ?? 'Error al buscar películas')
        setSearchResults([])
      } else {
        setSearchResults(json.results ?? [])
      }
      setSearching(false)
    }, 400)

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [query])

  async function handleCreateSession() {
    setCreatingSession(true)
    const { data } = await supabase
      .from('sessions')
      .insert({ club_id: clubId, status: 'open' })
      .select('id, status')
      .single()
    if (data) setSession(data as Session)
    setCreatingSession(false)
  }

  async function handleNominate(movie: Movie) {
    if (!session || myNominationId) return
    setNominatingId(movie.id)
    const { data } = await supabase
      .from('nominations')
      .insert({
        session_id: session.id,
        user_id: userId,
        tmdb_movie_id: movie.id,
        title: movie.title,
        poster_url: movie.poster_url,
      })
      .select('id')
      .single()
    if (data) setMyNominationId(data.id)
    await refetchNominations(session.id)
    setQuery('')
    setSearchResults([])
    setNominatingId(null)
  }

  async function handleRemoveNomination() {
    if (!session || !myNominationId) return
    const { error } = await supabase.from('nominations').delete().eq('id', myNominationId)
    if (error) return
    setMyNominationId(null)
    await refetchNominations(session.id)
  }

  async function handleCloseSession() {
    if (!session || closingSession) return
    setClosingSession(true)
    await supabase.from('sessions').update({ status: 'closed' }).eq('id', session.id)
    setSession({ ...session, status: 'closed' })
    setClosingSession(false)
  }

  async function doMarkWatched(winner: NominationWithVotes) {
    if (!session) return
    setMarkingWatched(true)
    setWatchedError(null)
    const { error } = await supabase
      .from('sessions')
      .update({
        status: 'watched',
        winner_tmdb_id: winner.tmdb_movie_id ?? null,
        watched_at: new Date().toISOString(),
      })
      .eq('id', session.id)
    if (error) {
      setWatchedError(error.message)
      setMarkingWatched(false)
      return
    }
    setShowTiebreakerModal(false)
    setSession({ ...session, status: 'watched' })
    setShowRatingModal(true)
    setMarkingWatched(false)
  }

  async function handleMarkWatched() {
    if (!session || markingWatched || nominations.length === 0) return
    setWatchedError(null)
    const topVotes = Number(nominations[0].vote_count)
    const tied = nominations.filter((n) => Number(n.vote_count) === topVotes)
    if (tied.length > 1) {
      setTiedNoms(tied)
      setShowTiebreakerModal(true)
      return
    }
    await doMarkWatched(nominations[0])
  }

  async function handleVote(nominationId: string) {
    if (!session || voting) return
    setVoting(true)
    try {
      if (myVoteNominationId === nominationId) {
        await supabase.from('votes').delete().eq('session_id', session.id).eq('user_id', userId)
      } else {
        if (myVoteNominationId) {
          await supabase.from('votes').delete().eq('session_id', session.id).eq('user_id', userId)
        }
        await supabase.from('votes').insert({
          session_id: session.id,
          nomination_id: nominationId,
          user_id: userId,
        })
      }
      await refetchNominations(session.id)
    } finally {
      setVoting(false)
    }
  }

  async function handleSubmitRating(rating: number) {
    if (!session) return
    setSubmittingRating(true)
    setRatingError(null)
    const { error } = await supabase.from('session_ratings').upsert({
      session_id: session.id,
      user_id: userId,
      rating,
    })
    if (error) {
      setRatingError(error.message)
      setSubmittingRating(false)
      return
    }
    setMyRating(rating)
    setShowRatingModal(false)
    setSubmittingRating(false)
    router.push(`/clubs/${clubSlug}`)
  }

  function handleSkipRating() {
    setShowRatingModal(false)
    router.push(`/clubs/${clubSlug}`)
  }

  const alreadyNominated = new Set(nominations.map((n) => n.tmdb_movie_id))
  const maxVotes = nominations.reduce((m, n) => Math.max(m, Number(n.vote_count)), 0)
  const winner = nominations[0]

  return (
    <>
      {/* Tiebreaker modal */}
      {showTiebreakerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <h2 className="mb-2 text-xl font-bold">¡Hay empate!</h2>
            <p className="mb-5 text-sm text-gray-400">
              Varias películas tienen el mismo número de votos. Elige la ganadora.
            </p>
            <ul className="space-y-3">
              {tiedNoms.map((nom) => (
                <li key={nom.nomination_id}>
                  <button
                    onClick={() => doMarkWatched(nom)}
                    disabled={markingWatched}
                    className="flex w-full items-center gap-4 rounded-xl border border-gray-700 p-3 text-left transition hover:border-pink-600 hover:bg-pink-950/20 disabled:opacity-50"
                  >
                    {nom.poster_url ? (
                      <img src={nom.poster_url} alt={nom.title} className="h-16 w-11 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="h-16 w-11 shrink-0 rounded bg-gray-800" />
                    )}
                    <div>
                      <p className="font-semibold">{nom.title}</p>
                      <p className="text-xs text-gray-500">por {nom.nominated_by}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowTiebreakerModal(false)}
              className="mt-4 w-full rounded-xl border border-gray-700 py-2 text-sm text-gray-400 transition hover:border-gray-500 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Rating modal */}
      {showRatingModal && winner && (
        <RatingModal
          movieTitle={winner.title}
          posterUrl={winner.poster_url}
          onSubmit={handleSubmitRating}
          onSkip={handleSkipRating}
          loading={submittingRating}
          error={ratingError}
        />
      )}

      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href={`/clubs/${clubSlug}`}
          className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 transition hover:text-white"
        >
          ← {clubName}
        </Link>

        <h1 className="mt-6 mb-8 text-3xl font-bold">Sesión de votación</h1>

        {/* Sin sesión */}
        {!session && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-10 text-center">
            {isOwner ? (
              <>
                <p className="mb-5 text-gray-400">
                  No hay ninguna sesión activa. Crea una para empezar a votar.
                </p>
                <button
                  onClick={handleCreateSession}
                  disabled={creatingSession}
                  className="rounded-xl bg-pink-600 px-6 py-2.5 font-semibold transition hover:bg-pink-500 disabled:opacity-60"
                >
                  {creatingSession ? 'Creando...' : 'Crear sesión'}
                </button>
              </>
            ) : (
              <p className="text-gray-400">
                El propietario del club aún no ha iniciado una sesión de votación.
              </p>
            )}
          </div>
        )}

        {/* Cerrar votación (owner, sesión open con nominaciones) */}
        {session?.status === 'open' && isOwner && nominations.length > 0 && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={handleCloseSession}
              disabled={closingSession}
              className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 transition hover:border-red-800 hover:text-red-400 disabled:opacity-60"
            >
              {closingSession ? 'Cerrando...' : 'Cerrar votación'}
            </button>
          </div>
        )}

        {/* Sesión cerrada: marcar como vista (owner) */}
        {session?.status === 'closed' && isOwner && (
          <div className="mb-6 rounded-2xl border border-yellow-800/50 bg-yellow-950/20 p-5">
            <p className="mb-3 text-sm text-yellow-300">
              La votación está cerrada. ¿Ya habéis visto la película ganadora?
            </p>
            <button
              onClick={handleMarkWatched}
              disabled={markingWatched}
              className="rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-yellow-400 disabled:opacity-60"
            >
              {markingWatched ? 'Guardando...' : '✓ Marcar como vista'}
            </button>
            {watchedError && (
              <p className="mt-3 text-xs text-red-400">Error: {watchedError}</p>
            )}
          </div>
        )}

        {/* Sesión vista: ganadora + tu puntuación */}
        {session?.status === 'watched' && winner && (
          <div className="mb-6 rounded-2xl border border-green-800/50 bg-green-950/20 p-5">
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
                {myRating !== null ? (
                  <p className="mt-1 text-sm text-gray-400">
                    Tu puntuación: <span className="font-bold text-pink-400">{myRating}/10</span>
                  </p>
                ) : (
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="mt-2 text-sm text-yellow-400 underline underline-offset-2 hover:text-yellow-300"
                  >
                    Puntuar película
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Buscador + nominaciones (sesiones no watched) */}
        {session && session.status !== 'watched' && (
          <>
            {/* Buscador — solo cuando open */}
            {session.status === 'open' && (
              <div className="mb-8">
                <Link
                  href={`/clubs/${clubSlug}/session/discover`}
                  className="mb-5 flex items-center justify-between rounded-2xl border border-gray-800 bg-gray-900 px-5 py-4 transition hover:border-gray-600"
                >
                  <div>
                    <p className="font-medium">Ver catálogo de películas</p>
                    <p className="text-sm text-gray-500">Filtra por año, actores, directores y más</p>
                  </div>
                  <span className="text-lg text-gray-500">→</span>
                </Link>

                <label className="mb-2 block text-sm font-medium text-gray-400">
                  Nominar una película
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Busca por título..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm placeholder-gray-500 outline-none focus:border-pink-500"
                  />
                  {searching && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                      Buscando...
                    </span>
                  )}
                </div>

                {searchError && <p className="mt-2 text-xs text-red-400">{searchError}</p>}

                {searchResults.length > 0 && (
                  <ul className="mt-2 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl">
                    {searchResults.map((movie) => {
                      const nominated = alreadyNominated.has(movie.id)
                      return (
                        <li
                          key={movie.id}
                          className="flex items-center gap-3 border-b border-gray-800 px-4 py-3 last:border-0"
                        >
                          {movie.poster_url ? (
                            <img src={movie.poster_url} alt={movie.title} className="h-14 w-10 shrink-0 rounded object-cover" />
                          ) : (
                            <div className="h-14 w-10 shrink-0 rounded bg-gray-800" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{movie.title}</p>
                            <p className="text-xs text-gray-500">{movie.year}</p>
                          </div>
                          <button
                            onClick={() => handleNominate(movie)}
                            disabled={nominated || !!myNominationId || nominatingId === movie.id}
                            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500 enabled:bg-pink-600 enabled:hover:bg-pink-500"
                          >
                            {nominated ? 'Ya nominada' : nominatingId === movie.id ? '...' : myNominationId ? 'Ya nominaste' : '+ Nominar'}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* Lista de nominaciones */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">
                Nominaciones <span className="text-gray-500">({nominations.length})</span>
              </h2>

              {nominations.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Todavía no hay nominaciones. ¡Busca y nomina la primera!
                </p>
              ) : (
                <ul className="space-y-3">
                  {nominations.map((nom) => {
                    const isMyVote = myVoteNominationId === nom.nomination_id
                    const voteCount = Number(nom.vote_count)
                    const barPct = maxVotes > 0 ? (voteCount / maxVotes) * 100 : 0

                    return (
                      <li
                        key={nom.nomination_id}
                        className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
                          isMyVote ? 'border-pink-700 bg-pink-950/30' : 'border-gray-800 bg-gray-900'
                        }`}
                      >
                        {nom.poster_url ? (
                          <img src={nom.poster_url} alt={nom.title} className="h-20 w-14 shrink-0 rounded object-cover" />
                        ) : (
                          <div className="h-20 w-14 shrink-0 rounded bg-gray-800" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{nom.title}</p>
                          <p className="mt-0.5 text-xs text-gray-500">por {nom.nominated_by}</p>
                          <p className="mt-0.5 text-sm text-gray-400">
                            {voteCount} {voteCount === 1 ? 'voto' : 'votos'}
                          </p>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                            <div
                              className="h-full rounded-full bg-pink-500 transition-all duration-500"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </div>
                        {session.status === 'open' && (
                          <div className="flex shrink-0 gap-2">
                            {nom.nomination_id === myNominationId && (
                              <button
                                onClick={handleRemoveNomination}
                                className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-semibold transition hover:border-red-600 hover:text-red-400"
                              >
                                Eliminar
                              </button>
                            )}
                            <button
                              onClick={() => handleVote(nom.nomination_id)}
                              disabled={voting}
                              className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                                isMyVote
                                  ? 'bg-green-600 hover:bg-green-700'
                                  : 'border border-gray-700 hover:border-green-600 hover:text-green-400'
                              }`}
                            >
                              {isMyVote ? '★ Mi voto' : 'Votar'}
                            </button>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}
