import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'

const TMDB_HEADERS = { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }

async function tmdbSearch(title: string, year: number) {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&year=${year}&language=es-ES`,
    { headers: TMDB_HEADERS }
  )
  const data = await res.json()
  return data.results?.[0] ?? null
}

export async function POST(req: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clubId, movie } = await req.json() as {
    clubId: string
    movie: { id: number; title: string; year: string; director: string; genres: string[] }
  }

  const { data: membership } = await supabase
    .from('club_members')
    .select('role')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fall back to TMDB recommendations if club has no watch history
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, winner_tmdb_id, nominations(title, genres, release_year, director, tmdb_movie_id)')
    .eq('club_id', clubId)
    .eq('status', 'watched')

  if (!sessions || sessions.length === 0) {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.id}/recommendations?language=es-ES&page=1`,
      { headers: TMDB_HEADERS, next: { revalidate: 3600 } }
    )
    if (!res.ok) return NextResponse.json({ movies: [] })
    const data = await res.json()
    const movies = ((data.results ?? []) as any[]).slice(0, 6).map((m: any) => ({
      tmdb_id: m.id as number,
      title: m.title as string,
      year: (m.release_date as string | undefined)?.slice(0, 4) ?? '',
      poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path as string}` : null,
      reason: null,
    }))
    return NextResponse.json({ movies })
  }

  // Build club history context
  const sessionIds = sessions.map((s) => s.id)
  const { data: ratings } = await supabase
    .from('session_ratings')
    .select('session_id, rating')
    .in('session_id', sessionIds)

  const ratingGroups: Record<string, number[]> = {}
  for (const r of ratings ?? []) {
    if (!ratingGroups[r.session_id]) ratingGroups[r.session_id] = []
    ratingGroups[r.session_id].push(r.rating as number)
  }

  const watchedMovies = sessions.map((s) => {
    const noms = s.nominations as Array<{
      title: string; genres: string[] | null; release_year: number | null
      director: string | null; tmdb_movie_id: number
    }>
    const winner = noms.find((n) => n.tmdb_movie_id === s.winner_tmdb_id) ?? noms[0]
    const vals = ratingGroups[s.id] ?? []
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    return {
      title: winner?.title ?? 'Desconocida',
      year: winner?.release_year ?? null,
      director: winner?.director ?? null,
      genres: winner?.genres ?? [],
      rating: avg != null ? Math.round(avg * 10) / 10 : null,
    }
  })

  const movieLines = watchedMovies.map((m) => {
    const parts: string[] = [m.title]
    if (m.year) parts.push(`(${m.year})`)
    if (m.director) parts.push(`dir. ${m.director}`)
    if (m.genres?.length) parts.push(m.genres.join(', '))
    if (m.rating != null) parts.push(`→ ${m.rating}/10`)
    return parts.join(' · ')
  }).join('\n')

  const titlesWatched = watchedMovies.map((m) => m.title).join(', ')

  const movieInfo = [
    `"${movie.title}"`,
    movie.year ? `(${movie.year})` : null,
    movie.director ? `dir. ${movie.director}` : null,
    movie.genres?.length ? movie.genres.join(', ') : null,
  ].filter(Boolean).join(' · ')

  const prompt = `Eres un experto en cine. Un club está viendo los detalles de: ${movieInfo}.

El club ha visto anteriormente:
${movieLines}

Recomienda exactamente 5 películas similares a "${movie.title}" que puedan gustarle a este club, considerando tanto la película actual como su historial y puntuaciones. No incluyas "${movie.title}" ni las ya vistas: ${titlesWatched}.

Responde SOLO con un array JSON, sin texto adicional:
[
  { "title": "Título original", "year": 2001, "reason": "Una frase corta de por qué les gustará." },
  ...
]`

  const message = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (message.choices[0].message.content ?? '').trim()

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const raw: Array<{ title: string; year: number; reason: string }> =
      jsonMatch ? JSON.parse(jsonMatch[0]) : []

    const movies = await Promise.all(
      raw.map(async (rec) => {
        try {
          const match = await tmdbSearch(rec.title, rec.year)
          return {
            tmdb_id: match?.id ?? null,
            title: (match?.title ?? rec.title) as string,
            year: ((match?.release_date as string | undefined)?.slice(0, 4) ?? String(rec.year)) as string,
            poster_url: match?.poster_path
              ? `https://image.tmdb.org/t/p/w185${match.poster_path as string}`
              : null,
            reason: rec.reason,
          }
        } catch {
          return { tmdb_id: null, title: rec.title, year: String(rec.year), poster_url: null, reason: rec.reason }
        }
      })
    )

    return NextResponse.json({ movies: movies.filter((m) => m.tmdb_id !== null) })
  } catch {
    return NextResponse.json({ movies: [] })
  }
}
