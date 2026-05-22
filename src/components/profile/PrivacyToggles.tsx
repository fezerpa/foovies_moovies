"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Props = {
  userId: string
  initialShowTaste: boolean
  initialShowWatched: boolean
}

export default function PrivacyToggles({ userId, initialShowTaste, initialShowWatched }: Props) {
  const [showTaste, setShowTaste] = useState(initialShowTaste)
  const [showWatched, setShowWatched] = useState(initialShowWatched)

  async function toggle(field: "show_taste" | "show_watched") {
    const supabase = createClient()
    const newVal = field === "show_taste" ? !showTaste : !showWatched
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("profiles") as any).update({ [field]: newVal }).eq("id", userId)
    if (field === "show_taste") setShowTaste(newVal)
    else setShowWatched(newVal)
  }

  const items = [
    { key: "show_taste" as const, label: "Perfil cinematográfico", value: showTaste },
    { key: "show_watched" as const, label: "Películas vistas", value: showWatched },
  ]

  return (
    <div className="card p-6">
      <h2 className="mb-1 font-semibold">Visibilidad del perfil público</h2>
      <p className="mb-4 text-xs text-gray-500">Controla qué pueden ver otros usuarios en tu perfil.</p>
      <div className="space-y-2">
        {items.map(({ key, label, value }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              value
                ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                : "bg-red-900/30 text-red-400 hover:bg-red-900/50"
            }`}
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${value ? "bg-green-400" : "bg-red-400"}`} />
            <span className="flex-1 text-left">{label}</span>
            <span className="text-xs font-normal opacity-70">{value ? "Visible" : "Oculto"}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
