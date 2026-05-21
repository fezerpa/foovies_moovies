import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clubId } = await req.json()
  if (!clubId) return NextResponse.json({ error: 'clubId required' }, { status: 400 })

  const { data: membership } = await supabase
    .from('club_members')
    .select('role')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch watched sessions with nominations and ratings
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

  // Build average rating per session
  const avgBySession: Record<string, number> = {}
  const ratingGroups: Record<string, number[]> = {}
  for (const r of ratings ?? []) {
    if (!ratingGroups[r.session_id]) ratingGroups[r.session_id] = []
    ratingGroups[r.session_id].push(r.rating)
  }
  for (const [sid, vals] of Object.entries(ratingGroups)) {
    avgBySession[sid] = vals.reduce((a, b) => a + b, 0) / vals.length
  }

  // Build movie list for prompt
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

  const prompt = `Eres un experto en cine. Este club de cine ha visto las siguientes películas con sus puntuaciones:

${movieLines}

Basándote en sus gustos (géneros, épocas, directores y puntuaciones), recomienda exactamente 5 películas que probablemente les encantarían. No incluyas ninguna de las que ya han visto: ${titlesWatched}.

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

    // Enrich each recommendation with TMDB data
    const recommendations = await Promise.all(
      raw.map(async (rec) => {
        try {
          const searchRes = await fetch(
            `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(rec.title)}&year=${rec.year}&language=es-ES`,
            { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
          )
          const searchData = await searchRes.json()
          const match = searchData.results?.[0]
          return {
            ...rec,
            tmdb_id: match?.id ?? null,
            poster_url: match?.poster_path
              ? `https://image.tmdb.org/t/p/w185${match.poster_path}`
              : null,
          }
        } catch {
          return { ...rec, tmdb_id: null, poster_url: null }
        }
      })
    )

    return NextResponse.json({ recommendations })
  } catch {
    return NextResponse.json({ error: 'Error parsing AI response' }, { status: 500 })
  }
}
