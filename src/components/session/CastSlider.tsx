'use client'

import useEmblaCarousel from 'embla-carousel-react'
import Link from 'next/link'

type CastMember = {
  id: number
  name: string
  character: string
  profile_path: string | null
}

export default function CastSlider({
  cast,
  clubSlug,
}: {
  cast: CastMember[]
  clubSlug?: string
}) {
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    dragFree: true,
  })

  return (
    <div ref={emblaRef} className="overflow-hidden">
      <div className="flex gap-3">
        {cast.map((actor) => {
          const inner = (
            <>
              {actor.profile_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                  alt={actor.name}
                  className="mb-2 w-full rounded-xl object-cover"
                />
              ) : (
                <div className="mb-2 aspect-[2/3] w-full rounded-xl bg-gray-800" />
              )}
              <p className="text-xs font-medium leading-tight">{actor.name}</p>
              <p className="text-xs leading-tight text-gray-500">{actor.character}</p>
            </>
          )

          return clubSlug ? (
            <Link
              key={actor.id}
              href={`/clubs/${clubSlug}/session/discover/actor/${actor.id}`}
              className="w-1/2 min-w-0 shrink-0 transition sm:w-1/3 lg:w-1/4"
            >
              {inner}
            </Link>
          ) : (
            <div key={actor.id} className="w-1/2 min-w-0 shrink-0 sm:w-1/3 lg:w-1/4">
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
