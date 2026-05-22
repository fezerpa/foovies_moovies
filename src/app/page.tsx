import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="max-w-2xl">
        <div className="mb-6 text-6xl">🎬</div>
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          Foovies
        </h1>
        <p className="mb-8 text-xl text-gray-400">
          Crea un club, proponed películas y votad en tiempo real qué ver esta noche.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {user ? (
            <Link
              href="/clubs"
 className="btn-primary px-8 py-3 font-semibold text-white"
            >
              Ver mis clubs
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
 className="btn-primary px-8 py-3 font-semibold text-white"
              >
                Empezar gratis
              </Link>
              <Link
                href="/auth"
                className="rounded-xl border border-gray-700 px-8 py-3 font-semibold transition hover:border-gray-500"
              >
                Iniciar sesión
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
