'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function JoinClubForm({ userId }: { userId: string }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id')
      .eq('invite_code', code.toUpperCase().trim())
      .single()

    if (clubError || !club) {
      setError('Código inválido. Comprueba que esté bien escrito.')
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase
      .from('club_members')
      .insert({ club_id: club.id, user_id: userId })

    if (memberError) {
      if (memberError.code === '23505') {
        setError('Ya eres miembro de este club.')
      } else {
        setError(memberError.message)
      }
    } else {
      router.push(`/clubs/${club.id}`)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        required
        placeholder="Código de 6 letras"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        maxLength={6}
        className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 font-mono text-sm uppercase placeholder-gray-500 outline-none focus:border-pink-500"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl border border-gray-700 py-2.5 text-sm font-semibold transition hover:bg-gray-800 disabled:opacity-60"
      >
        {loading ? 'Buscando...' : 'Unirse'}
      </button>
    </form>
  )
}
