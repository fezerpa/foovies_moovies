'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  sessionId: string
  userId: string
  movie: { id: number; title: string; poster_url: string | null }
  initialNominated: boolean
  hasOtherNomination: boolean
  backUrl: string
}

export default function NominateButton({ sessionId, userId, movie, initialNominated, hasOtherNomination, backUrl }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [nominated, setNominated] = useState(initialNominated)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (nominated) {
    return (
      <div className="rounded-xl bg-green-900/40 py-3 text-center font-semibold text-green-400">
        ✓ Ya nominada en esta sesión
      </div>
    )
  }

  if (hasOtherNomination) {
    return (
      <div className="rounded-xl border border-gray-700 py-3 text-center text-sm text-gray-500">
        Ya tienes una nominación en esta sesión. Elimínala desde la sesión para nominar esta.
      </div>
    )
  }

  async function handleNominate() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.from('nominations').insert({
      session_id: sessionId,
      user_id: userId,
      tmdb_movie_id: movie.id,
      title: movie.title,
      poster_url: movie.poster_url,
    })
    if (!error || error.code === '23505') {
      setNominated(true)
      router.push(backUrl)
    } else {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleNominate}
        disabled={loading}
        className="w-full rounded-xl bg-pink-600 py-3 font-semibold transition hover:bg-pink-500 disabled:opacity-60"
      >
        {loading ? 'Nominando...' : '+ Nominar a la sesión'}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
