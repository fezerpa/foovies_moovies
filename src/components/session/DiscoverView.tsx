"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getCountryCode } from "@/lib/geolocation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type Movie = {
  id: number;
  title: string;
  year: string;
  poster_url: string | null;
  overview: string;
  vote_average: number;
};

type Person = { id: number; name: string };
type Provider = { id: number; name: string; logo: string | null };

function PersonPicker({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: Person | null;
  onChange: (p: Person | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/people?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      const people: Person[] = json.results ?? [];
      setResults(people);
      setOpen(people.length > 0);
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  function select(p: Person) {
    onChange(p);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-400">
        {label}
      </label>
      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5">
          <span className="flex-1 truncate text-sm">{value.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-gray-500 hover:text-gray-300"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="h-10"
          />
          {open && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl">
              {results.map((p) => (
                <li
                  key={p.id}
                  onMouseDown={() => select(p)}
                  className="cursor-pointer px-4 py-2.5 text-sm hover:bg-gray-800"
                >
                  {p.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

type Genre = { id: number; name: string };

type Props = {
  clubSlug: string;
  sessionId: string;
  userId: string;
  initialNominatedIds: number[];
  myNominatedMovieId: number | null;
  genres: Genre[];
  initialGenre?: string;
};

const VOTE_LABELS: Record<string, string> = {
  all: "Todas",
  "6.5": "Aclamada (≥6.5)",
  "7.5": "Muy aclamada (≥7.5)",
  "8": "Obra maestra (≥8)",
};

const SORT_LABELS: Record<string, string> = {
  "vote_average.desc": "Puntuación: mayor a menor",
  "vote_average.asc": "Puntuación: menor a mayor",
  "primary_release_date.desc": "Año: más reciente primero",
  "primary_release_date.asc": "Año: más antiguo primero",
};

export default function DiscoverView({
  clubSlug,
  sessionId,
  userId,
  initialNominatedIds,
  myNominatedMovieId,
  genres,
  initialGenre = "all",
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [myMovieId, setMyMovieId] = useState<number | null>(myNominatedMovieId);
  const [genre, setGenre] = useState(initialGenre);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [minVote, setMinVote] = useState("all");
  const [sortBy, setSortBy] = useState("vote_average.desc");
  const [person, setPerson] = useState<Person | null>(null);
  const [titleQuery, setTitleQuery] = useState("");

  // Location-based filters
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [nowPlaying, setNowPlaying] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  // Floating back-to-top button
  const filtersPanelRef = useRef<HTMLDivElement>(null);
  const [filtersPanelVisible, setFiltersPanelVisible] = useState(true);

  useEffect(() => {
    if (!filtersPanelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFiltersPanelVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(filtersPanelRef.current);
    return () => observer.disconnect();
  }, []);

  // Keep latest filter values accessible without stale closures in fetchMore
  const filtersRef = useRef({ genre, yearFrom, yearTo, minVote, sortBy, person, titleQuery, nowPlaying, selectedProviders, countryCode });
  filtersRef.current = { genre, yearFrom, yearTo, minVote, sortBy, person, titleQuery, nowPlaying, selectedProviders, countryCode };

  const mounted = useRef(false);

  // Detect country + load providers once on mount
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const cc = await getCountryCode();
      if (cancelled || !cc) return;
      setCountryCode(cc);
      const res = await fetch(`/api/providers?region=${cc}`);
      const json = await res.json();
      if (!cancelled) setProviders(json.results ?? []);
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const isFiltered =
    genre !== "all" ||
    yearFrom !== "" ||
    yearTo !== "" ||
    minVote !== "all" ||
    person !== null ||
    titleQuery !== "" ||
    nowPlaying ||
    selectedProviders.length > 0;

  function buildParams(f = filtersRef.current) {
    const params = new URLSearchParams();
    if (f.nowPlaying && f.countryCode) {
      params.set("now_playing", "true");
      params.set("region", f.countryCode);
    } else if (f.titleQuery.trim()) {
      params.set("query", f.titleQuery.trim());
    } else {
      if (f.yearFrom) params.set("year_from", f.yearFrom);
      if (f.yearTo) params.set("year_to", f.yearTo);
      if (f.minVote && f.minVote !== "all") params.set("min_vote", f.minVote);
      if (f.sortBy) params.set("sort_by", f.sortBy);
      if (f.person) params.set("person", String(f.person.id));
      if (f.genre && f.genre !== "all") params.set("genres", f.genre);
      if (f.selectedProviders.length > 0 && f.countryCode) {
        params.set("provider", f.selectedProviders.join("|"));
        params.set("region", f.countryCode);
      }
    }
    return params;
  }

  function clearFilters() {
    setGenre("all");
    setYearFrom("");
    setYearTo("");
    setMinVote("all");
    setSortBy("vote_average.desc");
    setPerson(null);
    setTitleQuery("");
    setNowPlaying(false);
    setSelectedProviders([]);
  }

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [nominatedIds, setNominatedIds] = useState(
    () => new Set(initialNominatedIds),
  );
  const [nominatingId, setNominatingId] = useState<number | null>(null);
  const [nominateError, setNominateError] = useState<string | null>(null);

  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);
  hasMoreRef.current = hasMore;
  const fetchMoreRef = useRef<() => void>(() => {});

  function buildParamsWithPage(page: number, f = filtersRef.current) {
    const params = buildParams(f);
    params.set("page", String(page));
    return params;
  }

  async function fetchMovies() {
    pageRef.current = 1;
    setLoading(true);
    setFetchError(null);
    setHasMore(false);
    const res = await fetch(`/api/discover?${buildParamsWithPage(1)}`);
    const json = await res.json();
    if (!res.ok) {
      setFetchError(json.error ?? "Error al cargar películas");
      setMovies([]);
    } else {
      setMovies(json.results ?? []);
      setHasMore(json.has_more ?? false);
    }
    setLoading(false);
  }

  async function fetchMore() {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    const res = await fetch(`/api/discover?${buildParamsWithPage(nextPage)}`);
    const json = await res.json();
    if (res.ok) {
      setMovies((prev) => [...prev, ...(json.results ?? [])]);
      setHasMore(json.has_more ?? false);
      pageRef.current = nextPage;
    }
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }
  fetchMoreRef.current = fetchMore;

  // Set up sentinel observer once — uses refs so it always reads latest state
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchMoreRef.current(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    fetchMovies();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-search on select / toggle changes (immediate)
  useEffect(() => {
    if (!mounted.current) return;
    fetchMovies();
  }, [genre, minVote, sortBy, person, nowPlaying, selectedProviders]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-search on text inputs (debounced)
  useEffect(() => {
    if (!mounted.current) return;
    const timer = setTimeout(() => fetchMovies(), 500);
    return () => clearTimeout(timer);
  }, [titleQuery, yearFrom, yearTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark mounted AFTER the effects above so they skip the initial run
  useEffect(() => {
    mounted.current = true;
  }, []);

  async function handleNominate(movie: Movie) {
    if (myMovieId) return;
    setNominatingId(movie.id);
    setNominateError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("nominations") as any).insert({
      session_id: sessionId,
      user_id: userId,
      tmdb_movie_id: movie.id,
      title: movie.title,
      poster_url: movie.poster_url,
    });
    if (!error || error.code === "23505") {
      setNominatedIds((prev) => new Set([...prev, movie.id]));
      setMyMovieId(movie.id);
    } else {
      setNominateError(error.message);
    }
    setNominatingId(null);
  }

  async function handleRemoveNomination(movie: Movie) {
    setNominateError(null);
    const { error } = await supabase
      .from("nominations")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", userId);
    if (!error) {
      setNominatedIds((prev) => {
        const next = new Set(prev);
        next.delete(movie.id);
        return next;
      });
      setMyMovieId(null);
    } else {
      setNominateError(error.message);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <Link
        href={`/clubs/${clubSlug}/session`}
        className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 transition hover:text-white"
      >
        ← Volver a la sesión
      </Link>

      <h1 className="mt-6 mb-8 text-3xl font-bold">Descubrir películas</h1>

      {/* Filters */}
      <div ref={filtersPanelRef} className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-5">

        {/* Location-based filters */}
        {countryCode && (
          <div className="mb-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">
                Disponibilidad
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = !nowPlaying;
                  setNowPlaying(next);
                  if (next) setSelectedProviders([]);
                }}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  nowPlaying
                    ? "border-emerald-500 bg-emerald-900/30 text-emerald-300"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-white"
                }`}
              >
                🎬 En cartelera
              </button>
            </div>

            {providers.length > 0 && !nowPlaying && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Plataforma de streaming
                </label>
                <div className="flex flex-wrap gap-2">
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      title={p.name}
                      onClick={() =>
                        setSelectedProviders((prev) =>
                          prev.includes(String(p.id))
                            ? prev.filter((x) => x !== String(p.id))
                            : [...prev, String(p.id)]
                        )
                      }
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                        selectedProviders.includes(String(p.id))
                          ? "border-pink-500 bg-pink-900/30 text-pink-300"
                          : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-white"
                      }`}
                    >
                      {p.logo && (
                        <img
                          src={p.logo}
                          alt=""
                          className="h-4 w-4 rounded-sm object-cover"
                        />
                      )}
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Standard filters — hidden in now_playing mode */}
        {!nowPlaying && (
          <>
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-400">
                Buscar por título
              </label>
              <Input
                type="text"
                placeholder="Ej: El Padrino..."
                value={titleQuery}
                onChange={(e) => setTitleQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") fetchMovies(); }}
                className="h-10"
              />
            </div>
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Rango de años
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Desde"
                    value={yearFrom}
                    onChange={(e) => setYearFrom(e.target.value)}
                    min="1900"
                    max={new Date().getFullYear()}
                    className="h-10"
                  />
                  <span className="shrink-0 text-xs text-gray-600">—</span>
                  <Input
                    type="number"
                    placeholder="Hasta"
                    value={yearTo}
                    onChange={(e) => setYearTo(e.target.value)}
                    min="1900"
                    max={new Date().getFullYear()}
                    className="h-10"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Premios / valoración
                </label>
                <Select
                  value={minVote}
                  onValueChange={(v) => setMinVote(v ?? "all")}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-gray-700 bg-gray-800 text-sm text-gray-100">
                    <SelectValue>
                      {(v) => VOTE_LABELS[v ?? "all"] ?? "Todas"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    sideOffset={3}
                    alignItemWithTrigger={false}
                    className="rounded-xl border-gray-700 bg-gray-900 text-gray-100"
                  >
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="6.5">Aclamada (≥6.5)</SelectItem>
                    <SelectItem value="7.5">Muy aclamada (≥7.5)</SelectItem>
                    <SelectItem value="8">Obra maestra (≥8)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-4">
              <PersonPicker
                label="Crew"
                placeholder="Busca cualquier persona del equipo..."
                value={person}
                onChange={setPerson}
              />
            </div>

          </>
        )}

        <div className="flex gap-3">
          {!nowPlaying && genres.length > 0 && (
            <Select value={genre} onValueChange={(v) => setGenre(v ?? "all")}>
              <SelectTrigger className="h-10 flex-1 rounded-xl border-gray-700 bg-gray-800 text-sm text-gray-100">
                <SelectValue>
                  {(v) =>
                    v && v !== "all"
                      ? (genres.find((g) => String(g.id) === v)?.name ?? "Todos los géneros")
                      : "Todos los géneros"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                sideOffset={3}
                alignItemWithTrigger={false}
                className="rounded-xl border-gray-700 bg-gray-900 text-gray-100"
              >
                <SelectItem value="all">Todos los géneros</SelectItem>
                {genres.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!nowPlaying && (
            <Select value={sortBy} onValueChange={(v) => setSortBy(v ?? "vote_average.desc")}>
              <SelectTrigger className="h-10 flex-1 rounded-xl border-gray-700 bg-gray-800 text-sm text-gray-100">
                <SelectValue>
                  {(v) => SORT_LABELS[v ?? "vote_average.desc"] ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                sideOffset={3}
                alignItemWithTrigger={false}
                className="rounded-xl border-gray-700 bg-gray-900 text-gray-100"
              >
                <SelectItem value="vote_average.desc">Puntuación: mayor a menor</SelectItem>
                <SelectItem value="vote_average.asc">Puntuación: menor a mayor</SelectItem>
                <SelectItem value="primary_release_date.desc">Año: más reciente primero</SelectItem>
                <SelectItem value="primary_release_date.asc">Año: más antiguo primero</SelectItem>
              </SelectContent>
            </Select>
          )}
          <button
            type="button"
            onClick={clearFilters}
            disabled={!isFiltered}
            className="h-10 flex-1 rounded-xl bg-pink-600 font-semibold transition hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {nominateError && (
        <p className="mb-4 text-sm text-red-400">{nominateError}</p>
      )}

      {fetchError ? (
        <p className="text-center text-sm text-red-400">{fetchError}</p>
      ) : loading && movies.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900"
            >
              <div className="aspect-[2/3] w-full animate-pulse bg-gray-800" />
              <div className="p-3">
                <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-800" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      ) : movies.length === 0 ? (
        <p className="text-center text-sm text-gray-500">
          No se encontraron películas con esos filtros.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {movies.map((movie) => {
              const nominated = nominatedIds.has(movie.id);
              const nominating = nominatingId === movie.id;
              return (
                <div
                  key={movie.id}
                  className="relative flex flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 transition hover:border-gray-700"
                >
                  <Link
                    href={`/clubs/${clubSlug}/session/discover/${movie.id}`}
                    className="absolute inset-0 z-0"
                    aria-label={movie.title}
                  />
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="aspect-[2/3] w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-[2/3] w-full bg-gray-800" />
                  )}
                  <div className="flex flex-1 flex-col p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">
                      {movie.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-gray-500">{movie.year}</span>
                      {movie.vote_average > 0 && (
                        <span className="text-xs font-medium text-yellow-400">
                          ★ {movie.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="relative z-10 mt-auto flex flex-col gap-1.5 pt-3">
                      <Link
                        href={`/clubs/${clubSlug}/session/discover/${movie.id}`}
                        className="rounded-xl border border-gray-700 py-2 text-center text-xs font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white"
                      >
                        Ver detalles
                      </Link>
                      {myMovieId === movie.id ? (
                        <button
                          onClick={() => handleRemoveNomination(movie)}
                          className="rounded-xl bg-green-900/40 py-2 text-xs font-semibold text-green-400 transition hover:bg-red-900/40 hover:text-red-400"
                        >
                          Eliminar nominación
                        </button>
                      ) : (
                        <button
                          onClick={() => handleNominate(movie)}
                          disabled={nominating || nominated || !!myMovieId}
                          className={`rounded-xl py-2 text-xs font-semibold transition ${
                            nominated || !!myMovieId
                              ? "cursor-not-allowed bg-gray-800 text-gray-600"
                              : "bg-pink-600 hover:bg-pink-500 disabled:opacity-60"
                          }`}
                        >
                          {nominated
                            ? "✓ Nominada"
                            : nominating
                              ? "..."
                              : "+ Nominar"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </>
      )}
      <div ref={sentinelRef} className="flex justify-center py-8">
        {loadingMore && (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
        )}
      </div>
      {/* Floating clear + scroll-to-top button */}
      <button
        type="button"
        onClick={() => {
          clearFilters();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold shadow-xl transition-all duration-300 hover:bg-pink-500 ${
          filtersPanelVisible
            ? "pointer-events-none translate-y-4 opacity-0"
            : "translate-y-0 opacity-100"
        }`}
      >
        ↑ Limpiar filtros
      </button>
    </main>
  );
}
