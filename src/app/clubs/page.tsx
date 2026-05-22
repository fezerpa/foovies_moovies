import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreateClubForm from '@/components/clubs/CreateClubForm'
import JoinClubForm from '@/components/clubs/JoinClubForm'

export default async function ClubsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: memberships } = await supabase
    .from('club_members')
    .select('role, clubs(*)')
    .eq('user_id', user.id)

  const clubs = memberships?.map(m => ({ ...m.clubs, role: m.role })) ?? []

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mis clubs</h1>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-gray-400 hover:text-white transition">
            Cerrar sesión
          </button>
        </form>
      </div>

      {clubs.length === 0 ? (
        <p className="mb-8 text-gray-400">Todavía no perteneces a ningún club.</p>
      ) : (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {clubs.map(club => club && (
            <Link
              key={club.id}
              href={`/clubs/${club.invite_code}`}
              className="group card p-5 transition hover:border-pink-800 hover:bg-gray-800"
            >
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-semibold text-lg">{club.name}</h2>
                {club.role === 'owner' && (
                  <span className="rounded-full bg-pink-900/50 px-2 py-0.5 text-xs text-pink-300">
                    Owner
                  </span>
                )}
              </div>
              {club.description && (
                <p className="text-sm text-gray-400">{club.description}</p>
              )}
              <p className="mt-3 text-xs text-gray-500">
                Código: <span className="font-mono font-bold text-gray-300">{club.invite_code}</span>
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 font-semibold">Crear club</h3>
          <CreateClubForm userId={user.id} />
        </div>
        <div className="card p-5">
          <h3 className="mb-4 font-semibold">Unirse con código</h3>
          <JoinClubForm userId={user.id} />
        </div>
      </div>
    </main>
  )
}
