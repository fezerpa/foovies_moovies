"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Props = {
  type: "onboarding" | "no-clubs"
}

export default function WelcomeModal({ type }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(`welcome_dismissed_${type}`)
    if (!dismissed) setVisible(true)
  }, [type])

  function dismiss(e?: React.MouseEvent) {
    e?.stopPropagation()
    localStorage.setItem(`welcome_dismissed_${type}`, "1")
    setVisible(false)
  }

  const content =
    type === "onboarding"
      ? { emoji: "🎬", text: "Cuéntanos qué películas te gustan", href: "/onboarding", cta: "Empezar" }
      : { emoji: "🍿", text: "Aún no perteneces a un club, crea o únete a uno para comenzar.", href: "/clubs", cta: null }

  return (
    <div
      className={`fixed bottom-20 left-6 z-40 flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm shadow-xl transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      {content.cta ? (
        <>
          <span>{content.emoji}</span>
          <span className="text-gray-300">{content.text}</span>
          <Link
            href={content.href}
            onClick={() => dismiss()}
            className="btn-primary shrink-0 px-3 py-1.5 text-xs font-semibold"
          >
            {content.cta}
          </Link>
        </>
      ) : (
        <Link href={content.href} onClick={() => dismiss()} className="flex items-center gap-3">
          <span>{content.emoji}</span>
          <span className="text-gray-300">{content.text}</span>
        </Link>
      )}
      <button
        onClick={(e) => dismiss(e)}
        className="ml-1 shrink-0 text-gray-500 transition hover:text-white"
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  )
}
