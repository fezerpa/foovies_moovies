import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-gray-800 bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Link href="/" className="text-lg font-bold text-white">
            Foovies
          </Link>
          <nav className="flex gap-6 text-sm text-gray-500">
            <Link href="/clubs" className="transition hover:text-white">Mis clubs</Link>
            <Link href="/contact" className="transition hover:text-white">Contacto</Link>
          </nav>
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} Foovies</p>
        </div>
      </div>
    </footer>
  )
}
