import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const movieId = searchParams.get('movieId')
  const region = searchParams.get('region')

  if (!movieId || !region) return NextResponse.json({ flatrate: [], link: null, in_theaters: false })

  const headers = { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }

  const [providersRes, releaseDatesRes] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/movie/${movieId}/watch/providers`, {
      headers,
      next: { revalidate: 3600 },
    }),
    fetch(`https://api.themoviedb.org/3/movie/${movieId}/release_dates`, {
      headers,
      next: { revalidate: 3600 },
    }),
  ])

  let flatrate: { id: number; name: string; logo: string | null }[] = []
  let link: string | null = null
  let in_theaters = false

  if (providersRes.ok) {
    const data = await providersRes.json()
    const regionData = data.results?.[region]
    link = regionData?.link ?? null
    flatrate = ((regionData?.flatrate ?? []) as any[]).slice(0, 5).map((p: any) => ({
      id: p.provider_id as number,
      name: p.provider_name as string,
      logo: p.logo_path ? `https://image.tmdb.org/t/p/w45${p.logo_path as string}` : null,
    }))
  }

  if (releaseDatesRes.ok) {
    const data = await releaseDatesRes.json()
    const regionDates = (data.results ?? []).find((r: any) => r.iso_3166_1 === region)
    const theatricalDates = (regionDates?.release_dates ?? []).filter((d: any) => d.type === 3)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    in_theaters = theatricalDates.some((d: any) => {
      const releaseDate = new Date(d.release_date as string)
      return releaseDate >= sixtyDaysAgo && releaseDate <= new Date()
    })
  }

  return NextResponse.json({ flatrate, link, in_theaters })
}
