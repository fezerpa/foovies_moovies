import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [] })

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(q)}&language=es-ES`,
      { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
    )

    if (!res.ok) return NextResponse.json({ results: [] })

    const data = await res.json()
    const results = ((data.results ?? []) as any[]).slice(0, 6).map((p) => ({
      id: p.id as number,
      name: p.name as string,
    }))

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
