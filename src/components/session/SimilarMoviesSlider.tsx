"use client";

import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Link from "next/link";

type SimilarMovie = {
  tmdb_id: number;
  title: string;
  year: string;
  poster_url: string | null;
  reason: string | null;
};

type Props = {
  clubId: string;
  clubSlug: string;
  movie: { id: number; title: string; year: string; director: string; genres: string[] };
};

export default function SimilarMoviesSlider({ clubId, clubSlug, movie }: Props) {
  const [movies, setMovies] = useState<SimilarMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [emblaRef] = useEmblaCarousel({ align: "start", dragFree: true });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/movie/similar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId, movie }),
    })
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setMovies(json.movies ?? []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) });
    return () => { cancelled = true; };
  }, [clubId, movie.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loading && movies.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="mb-4 font-semibold">El club también podría disfrutar</h2>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-1/2 min-w-0 shrink-0 sm:w-1/3 lg:w-1/4">
              <div className="mb-2 aspect-[2/3] w-full animate-pulse rounded-xl bg-gray-800" />
              <div className="mb-1 h-3 w-3/4 animate-pulse rounded bg-gray-800" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-gray-800" />
            </div>
          ))}
        </div>
      ) : (
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex gap-3">
            {movies.map((m) => (
              <Link
                key={m.tmdb_id}
                href={`/clubs/${clubSlug}/session/discover/${m.tmdb_id}`}
                className="w-1/2 min-w-0 shrink-0 sm:w-1/3 lg:w-1/4"
              >
                {m.poster_url ? (
                  <img
                    src={m.poster_url}
                    alt={m.title}
                    className="mb-2 w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="mb-2 aspect-[2/3] w-full rounded-xl bg-gray-800" />
                )}
                <p className="text-xs font-medium leading-tight">{m.title}</p>
                <p className="text-xs leading-tight text-gray-500">{m.year}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
