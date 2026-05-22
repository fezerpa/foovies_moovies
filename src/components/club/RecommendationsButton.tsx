"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCountryCode } from "@/lib/geolocation";

type Recommendation = {
  title: string;
  year: number;
  director: string;
  genres: string[];
  reason: string;
  tmdb_id: number | null;
  poster_url: string | null;
  providers: string[];
  watch_url: string | null;
  in_theaters: boolean;
};

type Props = {
  clubId: string;
  clubSlug: string;
  sessionId: string | null;
  userId: string;
};

export default function RecommendationsButton({
  clubId,
  clubSlug,
  sessionId,
  userId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<"geo" | "ai">("geo");
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nominated, setNominated] = useState<Record<number, boolean>>({});
  const [nominating, setNominating] = useState<number | null>(null);
  const supabase = createClient();

  async function fetchRecommendations() {
    setLoading(true);
    setLoadingStep("geo");
    setError(null);
    setRecs([]);
    setOpen(true);

    const countryCode = await getCountryCode();

    setLoadingStep("ai");
    const res = await fetch("/api/clubs/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId, countryCode }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error ?? "Error al obtener recomendaciones.");
    else setRecs(json.recommendations);
    setLoading(false);
  }

  async function handleNominate(rec: Recommendation) {
    if (!sessionId || !rec.tmdb_id) return;
    setNominating(rec.tmdb_id);
    const { error } = await supabase.from("nominations").insert({
      session_id: sessionId,
      user_id: userId,
      tmdb_movie_id: rec.tmdb_id,
      title: rec.title,
      poster_url: rec.poster_url,
      genres: rec.genres,
      release_year: rec.year,
      director: rec.director,
    });
    if (!error || error.code === "23505") {
      setNominated((prev) => ({ ...prev, [rec.tmdb_id!]: true }));
    }
    setNominating(null);
  }

  return (
    <>
      <button
        onClick={fetchRecommendations}
        className="w-full rounded-xl border border-gray-700 py-2.5 text-sm font-medium text-gray-300 transition hover:border-pink-500 hover:text-pink-400"
      >
        No sé qué proponer... Dame recomendaciones
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-12">
          <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-950 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold">Recomendaciones para el club</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 transition hover:text-white"
              >
                ✕
              </button>
            </div>

            {loading && (
              <div className="flex flex-col items-center gap-3 py-10 text-gray-400">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
                <p className="text-sm">
                  {loadingStep === "geo"
                    ? "Detectando tu ubicación..."
                    : "Analizando vuestras preferencias..."}
                </p>
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-red-900/30 px-4 py-3 text-sm text-red-400">
                {error}
              </p>
            )}

            {recs.length > 0 && (
              <ul className="space-y-3">
                {recs.map((r, i) => (
                  <li
                    key={i}
                    className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900"
                  >
                    <div className="flex gap-3 p-4">
                      {/* Poster */}
                      {r.tmdb_id ? (
                        <Link
                          href={`/clubs/${clubSlug}/session/discover/${r.tmdb_id}`}
                          onClick={() => setOpen(false)}
                          className="shrink-0"
                        >
                          {r.poster_url ? (
                            <img
                              src={r.poster_url}
                              alt={r.title}
                              className="h-20 w-14 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-20 w-14 rounded-lg bg-gray-800" />
                          )}
                        </Link>
                      ) : (
                        <div className="h-20 w-14 shrink-0 rounded-lg bg-gray-800" />
                      )}

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        {r.tmdb_id ? (
                          <Link
                            href={`/clubs/${clubSlug}/session/discover/${r.tmdb_id}`}
                            onClick={() => setOpen(false)}
                            className="block transition hover:text-pink-400"
                          >
                            <p className="font-semibold leading-tight">
                              {r.title}
                            </p>
                          </Link>
                        ) : (
                          <p className="font-semibold leading-tight">
                            {r.title}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-gray-500">
                          {r.year} · {r.director}
                        </p>

                        {/* Genres */}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.genres?.map((g) => (
                            <span
                              key={g}
                              className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                            >
                              {g}
                            </span>
                          ))}
                        </div>

                        {/* Availability */}
                        {(r.in_theaters || r.providers?.length > 0) && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {r.in_theaters && (
                              <span className="rounded-full border border-emerald-800 bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-400">
                                En cines
                              </span>
                            )}
                            {r.providers?.map((p) =>
                              r.watch_url ? (
                                <a
                                  key={p}
                                  href={r.watch_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-full border border-blue-800/50 bg-blue-900/30 px-2 py-0.5 text-xs text-blue-400 transition hover:border-blue-600 hover:text-blue-300"
                                >
                                  {p}
                                </a>
                              ) : (
                                <span
                                  key={p}
                                  className="rounded-full border border-blue-800/50 bg-blue-900/30 px-2 py-0.5 text-xs text-blue-400"
                                >
                                  {p}
                                </span>
                              )
                            )}
                          </div>
                        )}

                        <p className="mt-1.5 text-xs text-gray-400">
                          {r.reason}
                        </p>
                      </div>
                    </div>

                    {/* Nominate button */}
                    {sessionId && r.tmdb_id && (
                      <div className="border-t border-gray-800 px-4 py-2">
                        {nominated[r.tmdb_id] ? (
                          <p className="text-center text-xs font-medium text-green-400">
                            ✓ Nominada
                          </p>
                        ) : (
                          <button
                            onClick={() => handleNominate(r)}
                            disabled={nominating === r.tmdb_id}
                            className="w-full text-xs font-medium text-pink-400 transition hover:text-pink-300 disabled:opacity-50"
                          >
                            {nominating === r.tmdb_id
                              ? "Nominando..."
                              : "+ Nominar a la sesión"}
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {!loading && recs.length > 0 && (
              <button
                onClick={fetchRecommendations}
                className="mt-4 w-full rounded-xl border border-gray-700 py-2 text-sm text-gray-400 transition hover:border-gray-500 hover:text-white"
              >
                Regenerar recomendaciones
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
