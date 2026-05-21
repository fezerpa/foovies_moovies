'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteClubButton({ clubId }: { clubId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    setLoading(true)
    await supabase.from('clubs').delete().eq('id', clubId)
    router.push('/clubs')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full border border-red-800 px-3 py-1 text-sm text-red-400 transition hover:bg-red-900/30"
      >
        Eliminar club
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-6">
            <h2 className="mb-2 text-lg font-bold">¿Eliminar club?</h2>
            <p className="mb-6 text-sm text-gray-400">
              Esta acción es permanente. Se eliminarán el club, sus sesiones, nominaciones y votos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 rounded-xl border border-gray-700 py-2.5 text-sm font-medium transition hover:border-gray-500 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-700 py-2.5 text-sm font-semibold transition hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
