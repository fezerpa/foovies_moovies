import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

async function fetchPerson(personId: string) {
  const res = await fetch(
    `https://api.themoviedb.org/3/person/${personId}?language=es-ES&append_to_response=movie_credits`,
    {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
      next: { revalidate: 3600 },
    }
  )
  if (!res.ok) return null
  return res.json()
}

export default async function ActorDetailPage({
  params,
}: {
  params: Promise<{ id: string; personId: string }>
}) {
  const { id: slug, personId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: club } = await supabase
    .from('clubs')
    .select('id')
    .eq('invite_code', slug)
    .single()

  if (!club) notFound()

  const [{ data: membership }, person] = await Promise.all([
    supabase
      .from('club_members')
      .select('role')
      .eq('club_id', (club as any).id)
      .eq('user_id', user.id)
      .single(),
    fetchPerson(personId),
  ])

  if (!membership) redirect('/clubs')
  if (!person) notFound()

  const profileUrl: string | null = person.profile_path
    ? `https://image.tmdb.org/t/p/w342${person.profile_path as string}`
    : null

  const movies: any[] = ((person.movie_credits?.cast ?? []) as any[])
    .filter((m: any) => m.poster_path && m.vote_count > 50)
    .sort((a: any, b: any) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 15)

  const age = person.birthday
    ? Math.floor(
        (Date.now() - new Date(person.birthday as string).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25)
      )
    : null

  const DEPT_LABELS: Record<string, string> = {
    Acting: 'Actor / Actriz',
    Directing: 'Dirección',
    Writing: 'Guion',
    Production: 'Producción',
    'Sound': 'Sonido',
    'Camera': 'Fotografía',
  }
  const knownFor = DEPT_LABELS[person.known_for_department] ?? person.known_for_department

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <Link
        href={`/clubs/${slug}/session/discover`}
        className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 transition hover:text-white"
      >
        ← Volver al catálogo
      </Link>

      {/* Profile hero */}
      <div className="mt-6 mb-8 flex gap-6">
        {profileUrl ? (
          <img
            src={profileUrl}
            alt={person.name}
            className="h-48 w-32 shrink-0 rounded-xl object-cover shadow-lg"
          />
        ) : (
          <div className="h-48 w-32 shrink-0 rounded-xl bg-gray-800" />
        )}
        <div className="min-w-0">
          <h1 className="text-3xl font-bold leading-tight">{person.name}</h1>
          {knownFor && (
            <p className="mt-1 text-sm text-gray-400">{knownFor}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
            {person.birthday && (
              <span>
                {new Date(person.birthday as string).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                {age !== null && !person.deathday && (
                  <span className="ml-1 text-gray-500">({age} años)</span>
                )}
              </span>
            )}
            {person.place_of_birth && (
              <span className="text-gray-500">{person.place_of_birth}</span>
            )}
          </div>
          {person.deathday && (
            <p className="mt-1 text-sm text-gray-500">
              † {new Date(person.deathday as string).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>

      {/* Biography */}
      {person.biography && (
        <div className="mb-8">
          <h2 className="mb-2 font-semibold">Biografía</h2>
          <p className="text-sm leading-relaxed text-gray-300">{person.biography}</p>
        </div>
      )}

      {/* Filmography */}
      {movies.length > 0 && (
        <div>
          <h2 className="mb-4 font-semibold">
            Filmografía destacada{' '}
            <span className="text-gray-500">({movies.length})</span>
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {movies.map((movie) => (
              <Link
                key={movie.id}
                href={`/clubs/${slug}/session/discover/${movie.id as number}`}
                className="flex flex-col overflow-hidden card transition hover:border-gray-700"
              >
                {movie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${movie.poster_path as string}`}
                    alt={movie.title}
                    className="aspect-[2/3] w-full object-cover"
                  />
                ) : (
                  <div className="aspect-[2/3] w-full bg-gray-800" />
                )}
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{movie.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {(movie.release_date as string | undefined)?.slice(0, 4) ?? ''}
                    </span>
                    {(movie.vote_average as number) > 0 && (
                      <span className="text-xs font-medium text-yellow-400">
                        ★ {(movie.vote_average as number).toFixed(1)}
                      </span>
                    )}
                  </div>
                  {movie.character && (
                    <p className="mt-1 line-clamp-1 text-xs text-gray-500">{movie.character}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
