import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import NominateButton from '@/components/session/NominateButton'
import CastSlider from '@/components/session/CastSlider'
import MovieHero from '@/components/session/MovieHero'
import MovieProviders from '@/components/session/MovieProviders'
import SimilarMoviesSlider from '@/components/session/SimilarMoviesSlider'

async function fetchMovieDetails(movieId: string) {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}?language=es-ES&append_to_response=credits,videos`,
    {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
      next: { revalidate: 3600 },
    }
  )
  if (!res.ok) return null
  return res.json()
}

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string; movieId: string }>
}) {
  const { id: slug, movieId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: club } = await supabase
    .from('clubs')
    .select('id')
    .eq('invite_code', slug)
    .single()

  if (!club) notFound()

  const [{ data: membership }, movie] = await Promise.all([
    supabase
      .from('club_members')
      .select('role')
      .eq('club_id', club.id)
      .eq('user_id', user.id)
      .single(),
    fetchMovieDetails(movieId),
  ])

  if (!membership) redirect('/clubs')
  if (!movie) notFound()

  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('club_id', club.id)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let alreadyNominated = false
  let hasOtherNomination = false
  if (session) {
    const { data: myNom } = await supabase
      .from('nominations')
      .select('tmdb_movie_id')
      .eq('session_id', session.id)
      .eq('user_id', user.id)
      .maybeSingle()
    alreadyNominated = myNom?.tmdb_movie_id === Number(movieId)
    hasOtherNomination = !!myNom && myNom.tmdb_movie_id !== Number(movieId)
  }

  const directors: any[] = (movie.credits?.crew ?? []).filter((c: any) => c.job === 'Director')
  const writers: any[] = (movie.credits?.crew ?? [])
    .filter((c: any) => ['Screenplay', 'Writer', 'Story'].includes(c.job))
    .slice(0, 3)
  const cast: any[] = (movie.credits?.cast ?? []).slice(0, 8)

  const posterUrl: string | null = movie.poster_path
    ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
    : null
  const posterStoreUrl: string | null = movie.poster_path
    ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
    : null
  const backdropUrl: string | null = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : null
  const videos: any[] = movie.videos?.results ?? []
  const originalLang: string = movie.original_language ?? 'en'
  const trailerKey: string | null = (
    videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube' && v.official && v.iso_639_1 === originalLang) ??
    videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube' && v.iso_639_1 === originalLang) ??
    videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube' && v.official) ??
    videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube')
  )?.key ?? null

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <Link
        href={`/clubs/${slug}/session/discover`}
        className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 transition hover:text-white"
      >
        ← Volver al catálogo
      </Link>

      <MovieHero
        title={movie.title}
        backdropUrl={backdropUrl}
        posterUrl={posterUrl}
        trailerKey={trailerKey}
      />

      <div className={`mb-8 flex gap-6 ${backdropUrl ? '' : 'mt-6'}`}>
        {posterUrl && !backdropUrl && (
          <img
            src={posterUrl}
            alt={movie.title}
            className="h-48 w-32 shrink-0 rounded-xl object-cover shadow-lg"
          />
        )}
        <div className="min-w-0">
          <h1 className="text-3xl font-bold leading-tight">{movie.title}</h1>
          {movie.tagline && (
            <p className="mt-1 italic text-gray-400">{movie.tagline}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-400">
            {movie.release_date && <span>{(movie.release_date as string).slice(0, 4)}</span>}
            {movie.runtime > 0 && <span>{movie.runtime} min</span>}
            {movie.vote_average > 0 && (
              <span className="font-semibold text-yellow-400">
                ★ {(movie.vote_average as number).toFixed(1)}
                <span className="ml-1 font-normal text-gray-500">
                  ({movie.vote_count?.toLocaleString()} votos)
                </span>
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(movie.genres ?? []).map((g: any) => (
              <Link
                key={g.id}
                href={`/clubs/${slug}/session/discover?genre=${g.id}`}
                className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300 transition hover:bg-gray-700 hover:text-white"
              >
                {g.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <MovieProviders movieId={movieId} />

      {session && (
        <div className="mb-8">
          <NominateButton
            sessionId={session.id}
            userId={user.id}
            movie={{
              id: movie.id,
              title: movie.title,
              poster_url: posterStoreUrl,
              genres: (movie.genres ?? []).map((g: any) => g.name as string),
              release_year: movie.release_date ? Number((movie.release_date as string).slice(0, 4)) : null,
              director: directors[0]?.name ?? null,
            }}
            initialNominated={alreadyNominated}
            hasOtherNomination={hasOtherNomination}
            backUrl={`/clubs/${slug}/session/discover`}
          />
        </div>
      )}

      {movie.overview && (
        <div className="mb-8">
          <h2 className="mb-2 font-semibold">Sinopsis</h2>
          <p className="text-sm leading-relaxed text-gray-300">{movie.overview}</p>
        </div>
      )}

      {(directors.length > 0 || writers.length > 0) && (
        <div className="mb-8 grid grid-cols-2 gap-6">
          {directors.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-500">
                Dirección
              </p>
              {directors.map((d) => (
                <Link
                  key={d.id}
                  href={`/clubs/${slug}/session/discover/actor/${d.id}`}
                  className="block text-sm transition hover:text-pink-400"
                >
                  {d.name}
                </Link>
              ))}
            </div>
          )}
          {writers.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-500">
                Guion
              </p>
              {writers.map((w) => (
                <Link
                  key={`${w.id}-${w.job}`}
                  href={`/clubs/${slug}/session/discover/actor/${w.id}`}
                  className="block text-sm transition hover:text-pink-400"
                >
                  {w.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {cast.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-4 font-semibold">Reparto principal</h2>
          <CastSlider cast={cast} clubSlug={slug} />
        </div>
      )}

      <SimilarMoviesSlider
        clubId={club.id}
        clubSlug={slug}
        movie={{
          id: movie.id,
          title: movie.title,
          year: (movie.release_date as string | undefined)?.slice(0, 4) ?? '',
          director: directors[0]?.name ?? '',
          genres: (movie.genres ?? []).map((g: any) => g.name as string),
        }}
      />
    </main>
  )
}
