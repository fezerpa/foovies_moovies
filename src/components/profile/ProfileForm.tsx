"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import LeaveClubButton from "./LeaveClubButton";
import Avatar from "@/components/ui/Avatar";

type Club = { id: string; name: string; invite_code: string; role: string };

type Props = {
  userId: string;
  initialUsername: string;
  avatarUrl: string | null;
  clubs: Club[];
};

export default function ProfileForm({ userId, initialUsername, avatarUrl, clubs }: Props) {
  const [username, setUsername] = useState(initialUsername);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("profiles") as any).update({ username }).eq("id", userId);
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    const ext = file.name.split(".").pop();
    const path = `${userId}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      setUploadError("No se pudo subir la imagen. Asegúrate de que el bucket 'avatars' existe en Supabase.");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
    setAvatar(publicUrl);
    setUploading(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Avatar + name */}
      <div className="card p-6">
        <h2 className="mb-5 font-semibold">Perfil</h2>

        <div className="mb-6 flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative shrink-0"
            title="Cambiar foto"
          >
            <Avatar src={avatar} alt={username} className="h-16 w-16 rounded-full ring-2 ring-gray-700" />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition group-hover:opacity-100">
              <span className="text-xs font-medium">Cambiar</span>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <div>
            <p className="text-sm font-medium">{username}</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-1 text-xs text-pink-400 transition hover:text-pink-300 disabled:opacity-50"
            >
              {uploading ? "Subiendo..." : "Cambiar foto"}
            </button>
            {uploadError && <p className="mt-1 text-xs text-red-400">{uploadError}</p>}
          </div>
        </div>

        <form onSubmit={handleSaveName} className="flex gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Tu nombre"
            maxLength={40}
            className="h-10 flex-1 rounded-xl border border-gray-700 bg-gray-800 px-3 text-sm text-gray-100 placeholder-gray-500 focus:border-pink-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving || username.trim() === initialUsername}
 className="h-10 btn-primary px-4 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar"}
          </button>
        </form>
      </div>

      {/* Clubs */}
      <div className="card p-6">
        <h2 className="mb-4 font-semibold">Mis clubs</h2>
        {clubs.length === 0 ? (
          <p className="text-sm text-gray-500">Todavía no perteneces a ningún club.</p>
        ) : (
          <ul className="divide-y divide-gray-800">
            {clubs.map((club) => (
              <li key={club.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <Link href={`/clubs/${club.invite_code}`} className="transition hover:opacity-80">
                  <p className="text-sm font-medium">{club.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{club.role}</p>
                </Link>
                {club.role === "owner" ? (
                  <span className="text-xs text-gray-600">Propietario</span>
                ) : (
                  <LeaveClubButton clubId={club.id} clubName={club.name} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
