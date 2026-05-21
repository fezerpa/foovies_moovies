import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=es-ES&page=1`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!res.ok) {
    return NextResponse.json(
      { results: [], error: `TMDB ${res.status}: ${res.statusText}` },
      { status: res.status }
    )
  }

  const data = await res.json()

  const results = (data.results ?? []).slice(0, 8).map((movie: any) => ({
    id: movie.id,
    title: movie.title,
    year: movie.release_date?.slice(0, 4) ?? '',
    poster_url: movie.poster_path
      ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
      : null,
    overview: movie.overview,
    vote_average: movie.vote_average,
  }))

  return NextResponse.json({ results })
}
