import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileForm from '@/components/profile/ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', user.id).single(),
    supabase.from('club_members').select('role, clubs(id, name, invite_code)').eq('user_id', user.id),
  ])

  const clubs = (memberships ?? []).map((m) => ({
    ...(m.clubs as { id: string; name: string; invite_code: string }),
    role: m.role as string,
  }))

  const username = (profile?.username as string | undefined)
    ?? (user.user_metadata?.full_name as string | undefined)
    ?? 'Usuario'
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/clubs"
        className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 transition hover:text-white"
      >
        ← Mis clubs
      </Link>
      <h1 className="mt-6 mb-8 text-3xl font-bold">Mi perfil</h1>
      <ProfileForm
        userId={user.id}
        initialUsername={username}
        avatarUrl={avatarUrl}
        clubs={clubs}
      />
    </main>
  )
}
