import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'

const TMDB = { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }

async function tmdb(path: string) {
  const res = await fetch(`https://api.themoviedb.org/3${path}`, TMDB)
  return res.json()
}

export async function POST(req: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clubId, countryCode } = await req.json()
  if (!clubId) return NextResponse.json({ error: 'clubId required' }, { status: 400 })

  const { data: membership } = await supabase
    .from('club_members')
    .select('role')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, winner_tmdb_id, nominations(title, genres, release_year, director, tmdb_movie_id)')
    .eq('club_id', clubId)
    .eq('status', 'watched')

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ error: 'No hay películas vistas aún.' }, { status: 400 })
  }

  const sessionIds = sessions.map((s) => s.id)
  const { data: ratings } = await supabase
    .from('session_ratings')
    .select('session_id, rating')
    .in('session_id', sessionIds)

  const ratingGroups: Record<string, number[]> = {}
  for (const r of ratings ?? []) {
    if (!ratingGroups[r.session_id]) ratingGroups[r.session_id] = []
    ratingGroups[r.session_id].push(r.rating)
  }
  const avgBySession: Record<string, number> = {}
  for (const [sid, vals] of Object.entries(ratingGroups)) {
    avgBySession[sid] = vals.reduce((a, b) => a + b, 0) / vals.length
  }

  const watchedMovies = sessions.map((s) => {
    const noms = s.nominations as Array<{
      title: string
      genres: string[] | null
      release_year: number | null
      director: string | null
      tmdb_movie_id: number
    }>
    const winner = noms.find((n) => n.tmdb_movie_id === s.winner_tmdb_id) ?? noms[0]
    const avg = avgBySession[s.id]
    return {
      title: winner?.title ?? 'Desconocida',
      year: winner?.release_year ?? null,
      director: winner?.director ?? null,
      genres: winner?.genres ?? [],
      rating: avg != null ? Math.round(avg * 10) / 10 : null,
    }
  })

  const movieLines = watchedMovies
    .map((m) => {
      const parts = [m.title]
      if (m.year) parts.push(`(${m.year})`)
      if (m.director) parts.push(`dir. ${m.director}`)
      if (m.genres?.length) parts.push(m.genres.join(', '))
      if (m.rating != null) parts.push(`→ ${m.rating}/10`)
      return parts.join(' · ')
    })
    .join('\n')

  const titlesWatched = watchedMovies.map((m) => m.title).join(', ')

  // Fetch now-playing movies + streaming providers for the user's country
  let cinemaContext = ''
  const nowPlayingIds = new Set<number>()

  if (countryCode) {
    try {
      const npData = await tmdb(`/movie/now_playing?language=es-ES&region=${countryCode}&page=1`)
      const nowPlaying: Array<{ id: number; title: string; release_date: string }> =
        (npData.results ?? []).slice(0, 10)

      for (const m of nowPlaying) nowPlayingIds.add(m.id)

      if (nowPlaying.length > 0) {
        const withProviders = await Promise.all(
          nowPlaying.map(async (movie) => {
            try {
              const pvData = await tmdb(`/movie/${movie.id}/watch/providers`)
              const cp = pvData.results?.[countryCode]
              const streaming: string[] = (cp?.flatrate ?? [])
                .slice(0, 3)
                .map((p: { provider_name: string }) => p.provider_name)
              return { title: movie.title, year: movie.release_date?.slice(0, 4) ?? null, streaming }
            } catch {
              return { title: movie.title, year: null, streaming: [] as string[] }
            }
          })
        )

        const lines = withProviders
          .map((m) => {
            const platform =
              m.streaming.length > 0 ? `Streaming: ${m.streaming.join(', ')}` : 'Solo en cines'
            return `- "${m.title}"${m.year ? ` (${m.year})` : ''}: ${platform}`
          })
          .join('\n')

        cinemaContext = `\nPelículas actualmente en cartelera en ${countryCode}:\n${lines}\nSi alguna de estas encaja con los gustos del club, puedes incluirla entre las recomendaciones.\n`
      }
    } catch {
      // proceed without cinema context
    }
  }

  const prompt = `Eres un experto en cine. Este club de cine ha visto las siguientes películas con sus puntuaciones:

${movieLines}

Basándote en sus gustos (géneros, épocas, directores y puntuaciones), recomienda exactamente 5 películas que probablemente les encantarían. No incluyas ninguna de las que ya han visto: ${titlesWatched}.
${cinemaContext}
Responde SOLO con un array JSON con este formato exacto, sin texto adicional:
[
  { "title": "Título", "year": 2001, "director": "Nombre Director", "genres": ["Género1", "Género2"], "reason": "Una frase explicando por qué les gustará." },
  ...
]`

  const message = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (message.choices[0].message.content ?? '').trim()

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const raw: Array<{ title: string; year: number; director: string; genres: string[]; reason: string }> =
      jsonMatch ? JSON.parse(jsonMatch[0]) : []

    const recommendations = await Promise.all(
      raw.map(async (rec) => {
        try {
          const searchData = await tmdb(
            `/search/movie?query=${encodeURIComponent(rec.title)}&year=${rec.year}&language=es-ES`
          )
          const match = searchData.results?.[0]

          let providers: string[] = []
          let watch_url: string | null = null
          const in_theaters = match?.id ? nowPlayingIds.has(match.id) : false

          if (match?.id && countryCode) {
            try {
              const pvData = await tmdb(`/movie/${match.id}/watch/providers`)
              const cp = pvData.results?.[countryCode]
              watch_url = cp?.link ?? null
              providers = ((cp?.flatrate ?? cp?.rent) ?? [])
                .slice(0, 3)
                .map((p: { provider_name: string }) => p.provider_name)
            } catch {
              // no providers
            }
          }

          return {
            ...rec,
            tmdb_id: match?.id ?? null,
            poster_url: match?.poster_path
              ? `https://image.tmdb.org/t/p/w185${match.poster_path}`
              : null,
            providers,
            watch_url,
            in_theaters,
          }
        } catch {
          return { ...rec, tmdb_id: null, poster_url: null, providers: [], watch_url: null, in_theaters: false }
        }
      })
    )

    return NextResponse.json({ recommendations })
  } catch {
    return NextResponse.json({ error: 'Error parsing AI response' }, { status: 500 })
  }
}
