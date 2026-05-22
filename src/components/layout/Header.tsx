import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let username: string | null = null
  let avatarUrl: string | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
    username = profile?.username ?? (user.user_metadata?.full_name as string | undefined) ?? null
    avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href={user ? '/clubs' : '/'} className="text-xl font-bold tracking-tight text-white">
          Foovies
        </Link>

        {user ? (
          <Link href="/profile" className="flex items-center gap-2.5 transition hover:opacity-80">
            <Avatar src={avatarUrl} alt={username ?? ''} className="h-8 w-8 rounded-full ring-2 ring-gray-700" />
            <span className="hidden text-sm text-gray-300 sm:block">{username}</span>
          </Link>
        ) : (
          <Link
            href="/auth"
            className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-semibold transition hover:bg-pink-500"
          >
            Iniciar sesión
          </Link>
        )}
      </div>
    </header>
  )
}
