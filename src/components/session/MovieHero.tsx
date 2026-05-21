'use client'

import { useState } from 'react'

type Props = {
  title: string
  backdropUrl: string | null
  posterUrl: string | null
  trailerKey: string | null
}

export default function MovieHero({ title, backdropUrl, posterUrl, trailerKey }: Props) {
  const [open, setOpen] = useState(false)

  const imageUrl = backdropUrl ?? posterUrl
  if (!imageUrl) return null

  return (
    <>
      <div className="relative mt-6 mb-8 overflow-hidden rounded-2xl">
        <img src={imageUrl} alt={title} className="w-full object-cover" />

        {trailerKey && (
          <button
            onClick={() => setOpen(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition hover:bg-black/50"
            aria-label="Reproducir trailer"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-xl transition hover:scale-105">
              <svg
                className="ml-1 h-7 w-7 text-gray-900"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        )}
      </div>

      {open && trailerKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&cc_load_policy=1&cc_lang_pref=es`}
                title={`Trailer de ${title}`}
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 text-white/70 transition hover:text-white"
            aria-label="Cerrar"
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}
