export default function ContactPage() {
  return (
    <main className="container">
      <h1 className="mb-2 text-3xl font-bold">Contacto</h1>
      <p className="mb-8 text-gray-400">¿Tienes alguna pregunta, sugerencia o has encontrado un error?</p>

      <div className="card p-6">
        <p className="mb-6 text-sm leading-relaxed text-gray-300">
          Estamos construyendo Foovies con mucho cariño. Si algo no funciona, tienes una idea o simplemente quieres saludar, escríbenos.
        </p>
        <a
          href="mailto:hola@foovies.app"
 className="inline-flex items-center gap-2 btn-primary px-5 py-2.5 text-sm font-semibold"
        >
          ✉ hola@foovies.app
        </a>
      </div>
    </main>
  )
}
