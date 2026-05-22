import { NextRequest, NextResponse } from 'next/server'

// Well-known streaming platforms by TMDB provider_id
const KNOWN_PROVIDERS = new Set([
  8,    // Netflix
  9,    // Amazon Prime Video
  337,  // Disney Plus
  350,  // Apple TV Plus
  1899, // Max (HBO Max)
  384,  // HBO Max (legacy id)
  118,  // HBO
  531,  // Paramount Plus
  1773, // SkyShowtime
  149,  // Movistar Plus+
  11,   // Mubi
  63,   // Filmin
  283,  // Crunchyroll
  15,   // Hulu
  619,  // Pluton TV
])

export async function GET(req: NextRequest) {
  const region = new URL(req.url).searchParams.get('region')
  if (!region) return NextResponse.json({ results: [] })

  const res = await fetch(
    `https://api.themoviedb.org/3/watch/providers/movie?language=es-ES&watch_region=${region}`,
    {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
      next: { revalidate: 86400 },
    }
  )
  if (!res.ok) return NextResponse.json({ results: [] })

  const data = await res.json()
  const results = ((data.results ?? []) as Array<{
    provider_id: number
    provider_name: string
    logo_path: string | null
    display_priority: number
  }>)
    .filter((p) => KNOWN_PROVIDERS.has(p.provider_id))
    .sort((a, b) => a.display_priority - b.display_priority)
    .map(({ provider_id, provider_name, logo_path }) => ({
      id: provider_id,
      name: provider_name,
      logo: logo_path ? `https://image.tmdb.org/t/p/w45${logo_path}` : null,
    }))

  return NextResponse.json({ results })
}
