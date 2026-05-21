"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CreateClubForm({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("clubs")
      .insert({ name, description, owner_id: userId })
      .select("invite_code")
      .single();

    if (error) {
      console.error(error);
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/clubs/${data.invite_code}`);
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        required
        placeholder="Nombre del club"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm placeholder-gray-500 outline-none focus:border-pink-500"
      />
      <input
        type="text"
        placeholder="Descripción (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm placeholder-gray-500 outline-none focus:border-pink-500"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-pink-600 py-2.5 text-sm font-semibold transition hover:bg-pink-500 disabled:opacity-60"
      >
        {loading ? "Creando..." : "Crear club"}
      </button>
    </form>
  );
}
