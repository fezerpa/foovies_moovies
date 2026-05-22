import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const response = NextResponse.redirect(new URL('/auth', req.url), { status: 302 })
  req.cookies.getAll()
    .filter((c) => c.name.startsWith('sb-'))
    .forEach((c) => response.cookies.delete(c.name))

  return response
}
