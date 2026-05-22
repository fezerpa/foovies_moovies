"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { clubId: string; clubName: string };

export default function LeaveClubButton({ clubId, clubName }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLeave() {
    setLoading(true);
    const res = await fetch("/api/clubs/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId }),
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 transition hover:text-red-400"
      >
        Salir
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-6">
            <h2 className="mb-2 text-lg font-bold">¿Salir del club?</h2>
            <p className="mb-6 text-sm text-gray-400">
              Vas a salir de <span className="font-semibold text-white">{clubName}</span>. Podrás volver a unirte con el código de invitación.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-gray-700 py-2.5 text-sm font-medium text-gray-300 transition hover:border-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleLeave}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold transition hover:bg-red-500 disabled:opacity-60"
              >
                {loading ? "Saliendo..." : "Salir del club"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
