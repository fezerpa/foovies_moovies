import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { movies } = await req.json() as {
    movies: Array<{ tmdb_id: number; title: string; year: string; rating: number; poster_url: string | null }>
  }
  if (!movies || movies.length !== 3) {
    return NextResponse.json({ error: 'Se necesitan exactamente 3 películas' }, { status: 400 })
  }

  // Enrich each movie with TMDB genres + director
  const enriched = await Promise.all(
    movies.map(async (movie) => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?language=es-ES&append_to_response=credits`,
          { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
        )
        if (!res.ok) return { ...movie, genres: [] as string[], director: null as string | null }
        const data = await res.json()
        const genres: string[] = (data.genres ?? []).map((g: any) => g.name as string)
        const director: string | null = (data.credits?.crew ?? []).find((c: any) => c.job === 'Director')?.name ?? null
        return { ...movie, genres, director }
      } catch {
        return { ...movie, genres: [] as string[], director: null as string | null }
      }
    })
  )

  const movieLines = enriched.map((m) => {
    const parts = [`"${m.title}" (${m.year})`]
    if (m.director) parts.push(`dir. ${m.director}`)
    if (m.genres.length) parts.push(m.genres.join(', '))
    parts.push(`→ ${m.rating}/10`)
    return parts.join(' · ')
  }).join('\n')

  const message = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 120,
    messages: [{
      role: 'user',
      content: `Eres un crítico de cine. Basándote en las últimas 3 películas que ha visto este usuario y sus puntuaciones:\n\n${movieLines}\n\nEscribe en español una descripción breve (máximo 2 frases) del perfil cinematográfico de este usuario. Resalta géneros preferidos, directores o épocas, y qué tipo de experiencias busca. Sé específico y personal. Sin frases genéricas. Empieza directamente sin "Este usuario" ni similares.`,
    }],
  })

  const taste_summary = (message.choices[0].message.content ?? '').trim()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any).update({
    taste_summary,
    taste_movies: enriched,
  }).eq('id', user.id)

  return NextResponse.json({
    taste_summary,
    enriched_movies: enriched,
  })
}
