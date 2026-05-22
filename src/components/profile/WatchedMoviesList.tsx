"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type WatchedSession = {
  id: string;
  watched_at: string | null;
  title: string;
  poster_url: string | null;
  tmdb_id: number | null;
  club_name: string | null;
  club_slug: string | null;
  my_rating: number | null;
};

type Props = {
  initialSessions: WatchedSession[];
  initialHasMore: boolean;
};

export default function WatchedMoviesList({ initialSessions, initialHasMore }: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listVisible, setListVisible] = useState(true);

  const pageRef = useRef(1);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(initialHasMore);
  hasMoreRef.current = hasMore;
  const fetchMoreRef = useRef<() => void>(() => {});
  const sentinelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setListVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(listRef.current);
    return () => observer.disconnect();
  }, []);

  async function fetchMore() {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    const res = await fetch(`/api/profile/watched?page=${nextPage}`);
    const json = await res.json();
    if (res.ok) {
      setSessions((prev) => [...prev, ...(json.sessions ?? [])]);
      setHasMore(json.has_more ?? false);
      pageRef.current = nextPage;
    }
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }
  fetchMoreRef.current = fetchMore;

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchMoreRef.current(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (sessions.length === 0) {
    return <p className="text-sm text-gray-500">Todavía no has visto ninguna película en un club.</p>;
  }

  return (
    <div>
      <div ref={listRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {sessions.map((s) => {
          const date = s.watched_at
            ? new Date(s.watched_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
            : null;

          const inner = (
            <>
              {s.poster_url ? (
                <img src={s.poster_url} alt={s.title} className="aspect-[2/3] w-full object-cover" />
              ) : (
                <div className="aspect-[2/3] w-full bg-gray-800" />
              )}
              <div className="flex flex-1 flex-col p-3">
                <p className="line-clamp-2 text-sm font-semibold leading-snug">{s.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {s.club_name && <span className="text-xs text-gray-500 truncate">{s.club_name}</span>}
                  {date && <span className="text-xs text-gray-600">{date}</span>}
                </div>
                {s.my_rating !== null && (
                  <p className="mt-auto pt-2 text-sm font-bold text-pink-400">{s.my_rating}<span className="ml-0.5 text-xs font-normal text-gray-500">/10</span></p>
                )}
              </div>
            </>
          );

          return s.club_slug ? (
            <Link
              key={s.id}
              href={`/clubs/${s.club_slug}/sessions/${s.id}`}
              className="movie-card"
            >
              {inner}
            </Link>
          ) : (
            <div key={s.id} className="relative flex flex-col overflow-hidden card">
              {inner}
            </div>
          );
        })}
      </div>

      <div ref={sentinelRef} className="flex justify-center py-6">
        {loadingMore && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
        )}
      </div>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold shadow-xl transition-all duration-300 hover:bg-pink-500 ${
          listVisible
            ? "pointer-events-none translate-y-4 opacity-0"
            : "translate-y-0 opacity-100"
        }`}
      >
        ↑ Inicio
      </button>
    </div>
  );
}
