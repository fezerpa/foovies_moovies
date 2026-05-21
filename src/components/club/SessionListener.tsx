'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SessionListener({ clubId }: { clubId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  useEffect(() => {
    const channel = supabase
      .channel(`club-sessions-${clubId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions', filter: `club_id=eq.${clubId}` },
        () => router.refresh()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clubId, supabase, router])

  return null
}
