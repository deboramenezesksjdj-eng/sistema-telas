import { NextRequest, NextResponse } from 'next/server'
import { parseSession, isExpired } from '@/lib/auth'
import { supabase, USERS_TABLE } from '@/lib/db'

// GET /api/auth/me — dados do usuário logado (via cookie telasSession)
export async function GET(request: NextRequest) {
  const id = await parseSession(request.cookies.get('telasSession')?.value)
  if (!id) return NextResponse.json({ user: null }, { status: 401 })
  const { data } = await supabase
    .from(USERS_TABLE)
    .select('id, email, name, role, blocked, created_at')
    .eq('id', id)
    .maybeSingle()
  if (!data || data.blocked) return NextResponse.json({ user: null }, { status: 401 })
  if (isExpired(data)) return NextResponse.json({ user: null, expired: true }, { status: 401 })
  return NextResponse.json({ user: data })
}

// DELETE /api/auth/me — logout
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('telasSession', '', { path: '/', maxAge: 0 })
  return res
}
