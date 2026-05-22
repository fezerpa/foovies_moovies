import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
        <Link href="/" className="text-sm font-bold text-white">Foovies</Link>
        <div className="flex flex-col items-end gap-0.5">
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} Foovies</p>
          <Link href="/contact" className="text-xs text-gray-500 transition hover:text-white">Contacto</Link>
        </div>
      </div>
    </footer>
  )
}
