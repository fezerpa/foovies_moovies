import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 text-7xl font-bold text-gray-800">404</p>
      <h1 className="mb-2 text-2xl font-bold">Página no encontrada</h1>
      <p className="mb-8 text-gray-400">La página que buscas no existe o ha sido movida.</p>
      <Link
        href="/clubs"
 className="btn-primary px-5 py-2.5 text-sm font-semibold"
      >
        Ir a mis clubs
      </Link>
    </main>
  )
}
