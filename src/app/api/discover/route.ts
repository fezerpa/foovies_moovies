import { NextRequest, NextResponse } from 'next/server'

function mapMovie(m: any) {
  return {
    id: m.id as number,
    title: m.title as string,
    year: (m.release_date as string | undefined)?.slice(0, 4) ?? '',
    poster_url: m.poster_path
      ? `https://image.tmdb.org/t/p/w185${m.poster_path as string}`
      : null,
    overview: (m.overview as string) ?? '',
    vote_average: (m.vote_average as number) ?? 0,
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const query = searchParams.get('query')
  const yearFrom = searchParams.get('year_from')
  const yearTo = searchParams.get('year_to')
  const minVote = searchParams.get('min_vote')
  const sortBy = searchParams.get('sort_by') ?? 'vote_average.desc'
  const personId = searchParams.get('person')
  const genres = searchParams.get('genres')
  const nowPlaying = searchParams.get('now_playing') === 'true'
  const region = searchParams.get('region')
  const provider = searchParams.get('provider')
  const page = String(Math.min(Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1), 500))

  const apiKey = process.env.TMDB_API_KEY
  console.log('[discover] TMDB_API_KEY present:', !!apiKey, '| length:', apiKey?.length ?? 0, '| prefix:', apiKey?.slice(0, 8))
  const TMDB_HEADERS = { Authorization: `Bearer ${apiKey}` }

  try {
    let url: string

    if (nowPlaying && region) {
      const params = new URLSearchParams({ language: 'es-ES', page, region })
      url = `https://api.themoviedb.org/3/movie/now_playing?${params}`
    } else if (query) {
      const params = new URLSearchParams({
        query,
        language: 'es-ES',
        page,
        include_adult: 'false',
      })
      url = `https://api.themoviedb.org/3/search/movie?${params}`
    } else {
      const VALID_SORTS = new Set([
        'vote_average.desc', 'vote_average.asc',
        'primary_release_date.desc', 'primary_release_date.asc',
      ])
      const params = new URLSearchParams({
        language: 'es-ES',
        sort_by: VALID_SORTS.has(sortBy) ? sortBy : 'vote_average.desc',
        'vote_count.gte': '150',
        page,
      })
      if (yearFrom) params.set('primary_release_date.gte', `${yearFrom}-01-01`)
      if (yearTo) params.set('primary_release_date.lte', `${yearTo}-12-31`)
      if (minVote) params.set('vote_average.gte', minVote)
      if (personId) params.set('with_people', personId)
      if (genres) params.set('with_genres', genres.split(',').join('|'))
      if (provider && region) {
        params.set('with_watch_providers', provider)
        params.set('watch_region', region)
      }
      url = `https://api.themoviedb.org/3/discover/movie?${params}`
    }

    const res = await fetch(url, {
      headers: TMDB_HEADERS,
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      const body = await res.text()
      console.log('[discover] TMDB error:', res.status, res.statusText, '| body:', body)
      return NextResponse.json(
        { results: [], error: `TMDB ${res.status}: ${res.statusText}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    const results = ((data.results ?? []) as any[]).slice(0, 9).map(mapMovie)
    const has_more = (data.page ?? 1) < (data.total_pages ?? 1)
    return NextResponse.json({ results, has_more })
  } catch {
    return NextResponse.json({ results: [], error: 'Error de red' }, { status: 500 })
  }
}
