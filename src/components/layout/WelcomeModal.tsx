"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Props = {
  type: "onboarding" | "no-movies"
}

export default function WelcomeModal({ type }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = sessionStorage.getItem(`welcome_dismissed_${type}`)
    if (!dismissed) setVisible(true)
  }, [type])

  function dismiss() {
    sessionStorage.setItem(`welcome_dismissed_${type}`, "1")
    setVisible(false)
  }

  const content =
    type === "onboarding"
      ? { emoji: "🎬", text: "Cuéntanos qué películas te gustan", cta: "Empezar", href: "/onboarding" }
      : { emoji: "🍿", text: "Aún no has visto ninguna película en un club", cta: "Ver clubs", href: "/clubs" }

  return (
    <div
      className={`fixed bottom-6 left-6 z-40 flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm shadow-xl transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <span>{content.emoji}</span>
      <span className="text-gray-300">{content.text}</span>
      <Link
        href={content.href}
        onClick={dismiss}
        className="btn-primary shrink-0 px-3 py-1.5 text-xs font-semibold"
      >
        {content.cta}
      </Link>
      <button
        onClick={dismiss}
        className="ml-1 shrink-0 text-gray-500 transition hover:text-white"
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  )
}
