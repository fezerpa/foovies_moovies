import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const username =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split('@')[0] ??
        `user_${user.id.slice(0, 8)}`

      await supabase.from('profiles').upsert(
        { id: user.id, username, avatar_url: user.user_metadata?.avatar_url ?? null },
        { onConflict: 'id', ignoreDuplicates: true }
      )

      if (!user.user_metadata?.onboarding_completed) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/clubs`)
}
