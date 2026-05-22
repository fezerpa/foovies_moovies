import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'

export default async function UserPanel() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', user.id).single(),
    supabase.from('club_members').select('role, clubs(id, name, invite_code)').eq('user_id', user.id),
  ])

  const clubs = (memberships ?? []).map((m) => ({ ...(m.clubs as any), role: m.role as string }))
  const clubIds = clubs.map((c) => c.id as string).filter(Boolean)

  const { data: activeSessions } = clubIds.length > 0
    ? await supabase.from('sessions').select('club_id').eq('status', 'open').in('club_id', clubIds)
    : { data: [] as Array<{ club_id: string }> }

  const activeClubIds = new Set((activeSessions ?? []).map((s) => s.club_id))

  const username = (profile?.username as string | undefined)
    ?? (user.user_metadata?.full_name as string | undefined)
    ?? 'Usuario'
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      {/* User info */}
      <Link href="/profile" className="mb-4 flex items-center gap-3 transition hover:opacity-80">
        <Avatar src={avatarUrl} alt={username} className="h-10 w-10 shrink-0 rounded-full ring-2 ring-gray-700" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{username}</p>
          <p className="text-xs text-gray-500">Ver perfil →</p>
        </div>
      </Link>

      <div className="mb-3 h-px bg-gray-800" />

      {/* Clubs */}
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-500">Mis clubs</p>
      {clubs.length === 0 ? (
        <p className="text-xs text-gray-600">Sin clubs todavía.</p>
      ) : (
        <ul className="space-y-0.5">
          {clubs.map((club) => club && (
            <li key={club.id}>
              <Link
                href={`/clubs/${club.invite_code}`}
                className="flex items-center justify-between rounded-xl px-2 py-1.5 text-sm transition hover:bg-gray-800"
              >
                <span className="min-w-0 truncate">{club.name}</span>
                {activeClubIds.has(club.id) && (
                  <span className="ml-2 flex shrink-0 items-center gap-1 rounded-full bg-pink-900/50 px-2 py-0.5 text-xs text-pink-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pink-400" />
                    Votar
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 h-px bg-gray-800" />

      <form action="/auth/signout" method="post" className="mt-3">
        <button className="w-full text-left text-xs text-gray-500 transition hover:text-white">
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
