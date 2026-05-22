"use client";

import { useEffect, useState } from "react";
import { getCountryCode } from "@/lib/geolocation";

type Provider = { id: number; name: string; logo: string | null };

type Props = { movieId: string | number };

export default function MovieProviders({ movieId }: Props) {
  const [flatrate, setFlatrate] = useState<Provider[]>([]);
  const [link, setLink] = useState<string | null>(null);
  const [inTheaters, setInTheaters] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const region = await getCountryCode();
      if (!region) { setLoaded(true); return; }
      const res = await fetch(`/api/movie-providers?movieId=${movieId}&region=${region}`);
      if (cancelled) return;
      if (res.ok) {
        const json = await res.json();
        setFlatrate(json.flatrate ?? []);
        setLink(json.link ?? null);
        setInTheaters(json.in_theaters ?? false);
      }
      setLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  }, [movieId]);

  if (!loaded || (!inTheaters && flatrate.length === 0)) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-3 font-semibold">Dónde ver</h2>
      <div className="flex flex-wrap gap-2">
        {inTheaters && (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-sm font-medium text-emerald-300">
            🎬 En cartelera
          </span>
        )}
        {flatrate.map((p) => {
          const inner = (
            <>
              {p.logo && (
                <img src={p.logo} alt="" className="h-5 w-5 rounded-sm object-cover" />
              )}
              <span>{p.name}</span>
            </>
          );
          return link ? (
            <a
              key={p.id}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 transition hover:border-gray-500 hover:text-white"
            >
              {inner}
            </a>
          ) : (
            <span
              key={p.id}
              className="flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200"
            >
              {inner}
            </span>
          );
        })}
      </div>
    </div>
  );
}
