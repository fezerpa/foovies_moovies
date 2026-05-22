'use client'

import { useState } from 'react'

type Props = {
  movieTitle: string
  posterUrl: string | null
  onSubmit: (rating: number) => void
  onSkip: () => void
  loading: boolean
  error?: string | null
}

export default function RatingModal({ movieTitle, posterUrl, onSubmit, onSkip, loading, error }: Props) {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <h2 className="mb-1 text-xl font-bold">¿Qué te pareció?</h2>
        <p className="mb-5 truncate text-sm text-gray-400">{movieTitle}</p>

        {posterUrl && (
          <img
            src={posterUrl}
            alt={movieTitle}
            className="mx-auto mb-5 h-44 rounded-xl object-cover shadow-lg"
          />
        )}

        <p className="mb-3 text-center text-xs font-medium uppercase tracking-widest text-gray-500">
          Puntuación
        </p>

        {/* Botones 1–10 */}
        <div className="mb-6 grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setSelected(n)}
              className={`rounded-xl py-3 text-sm font-bold transition ${
                selected === n
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/40'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-3 text-xs text-red-400">{error}</p>
        )}
        <button
          onClick={() => selected !== null && onSubmit(selected)}
          disabled={selected === null || loading}
 className="mb-2 w-full btn-primary py-3 font-semibold disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Enviar puntuación'}
        </button>
        <button
          onClick={onSkip}
          disabled={loading}
          className="w-full rounded-xl py-2 text-sm text-gray-500 transition hover:text-gray-300 disabled:opacity-50"
        >
          Saltar
        </button>
      </div>
    </div>
  )
}
