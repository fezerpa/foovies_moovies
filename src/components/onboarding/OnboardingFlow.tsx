"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type MovieResult = {
  id: number;
  title: string;
  year: string;
  poster_url: string | null;
};

type SelectedMovie = MovieResult & { rating: number };

function MoviePicker({
  slot,
  movie,
  onSelect,
  onClear,
}: {
  slot: number;
  movie: SelectedMovie | null;
  onSelect: (m: MovieResult) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MovieResult[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/discover?query=${encodeURIComponent(query)}`);
      const json = await res.json();
      const list: MovieResult[] = (json.results ?? []).map((m: any) => ({
        id: m.id, title: m.title, year: m.year, poster_url: m.poster_url,
      }));
      setResults(list);
      setOpen(list.length > 0);
    }, 350);
  }, [query]);

  if (movie) {
    return (
      <div className="flex items-center gap-3">
        {movie.poster_url ? (
          <img src={movie.poster_url} alt={movie.title} className="h-16 w-11 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="h-16 w-11 shrink-0 rounded-lg bg-gray-800" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{movie.title}</p>
          <p className="text-xs text-gray-500">{movie.year}</p>
        </div>
        <button onClick={onClear} className="shrink-0 text-gray-500 hover:text-gray-300">✕</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={`Película ${slot}...`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-10 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 text-sm text-gray-100 placeholder-gray-500 focus:border-pink-500 focus:outline-none"
      />
      {open && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl">
          {results.map((r) => (
            <li
              key={r.id}
              onMouseDown={() => { onSelect(r); setQuery(""); setOpen(false); }}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-800"
            >
              {r.poster_url ? (
                <img src={r.poster_url} alt={r.title} className="h-10 w-7 shrink-0 rounded object-cover" />
              ) : (
                <div className="h-10 w-7 shrink-0 rounded bg-gray-700" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="text-xs text-gray-500">{r.year}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RatingPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-8 w-8 rounded-lg text-sm font-semibold transition ${
            value === n
              ? "bg-pink-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export default function OnboardingFlow() {
  const [movies, setMovies] = useState<(SelectedMovie | null)[]>([null, null, null]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const canSubmit = movies.every((m) => m !== null && m.rating > 0);

  function selectMovie(index: number, movie: MovieResult) {
    setMovies((prev) => {
      const next = [...prev];
      next[index] = { ...movie, rating: prev[index]?.rating ?? 0 };
      return next;
    });
  }

  function clearMovie(index: number) {
    setMovies((prev) => { const next = [...prev]; next[index] = null; return next; });
  }

  function setRating(index: number, rating: number) {
    setMovies((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index]!, rating };
      return next;
    });
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setGenerating(true);
    setError(null);

    const payload = (movies as SelectedMovie[]).map((m) => ({
      tmdb_id: m.id,
      title: m.title,
      year: m.year,
      rating: m.rating,
      poster_url: m.poster_url,
    }));

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movies: payload }),
    });

    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Error al procesar."); setGenerating(false); return; }

    await supabase.auth.updateUser({
      data: {
        onboarding_completed: true,
        taste_summary: json.taste_summary,
        taste_movies: json.enriched_movies,
      },
    });

    router.push("/clubs");
  }

  return (
    <div className="container">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">¡Bienvenido a Foovies!</h1>
        <p className="text-gray-400">
          Cuéntanos las últimas 3 películas que has visto y puntúalas. Usaremos esto para personalizar tus recomendaciones.
        </p>
      </div>

      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-500">
              Película {i + 1}
            </p>
            <MoviePicker
              slot={i + 1}
              movie={movies[i]}
              onSelect={(m) => selectMovie(i, m)}
              onClear={() => clearMovie(i)}
            />
            {movies[i] && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-gray-400">Puntuación</p>
                <RatingPicker value={movies[i]!.rating} onChange={(v) => setRating(i, v)} />
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-900/30 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || generating}
 className="mt-6 w-full btn-primary py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Analizando tus gustos...
          </span>
        ) : (
          "Continuar →"
        )}
      </button>

      <p className="mt-4 text-center text-xs text-gray-600">
        Puedes actualizar esto más tarde desde tu perfil.
      </p>
    </div>
  );
}
