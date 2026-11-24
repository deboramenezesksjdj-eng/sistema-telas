import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail, verifyPassword, signSession, newSessionKey, isExpired } from '@/lib/auth'
import { supabase, USERS_TABLE } from '@/lib/db'

// POST /api/auth/login — { email, password }
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) return NextResponse.json({ error: 'Preencha email e senha' }, { status: 400 })

    const user = await findUserByEmail(email)
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }
    if (user.blocked) {
      return NextResponse.json({ error: 'Conta bloqueada. Fale com o administrador.' }, { status: 403 })
    }
    if (isExpired(user)) {
      return NextResponse.json({ error: 'Sua conta expirou. Fale com o administrador.' }, { status: 403 })
    }

    // Admin: várias sessões ao mesmo tempo. Usuário comum: 1 só — key nova invalida a anterior.
    const sessionKey = newSessionKey(user.role, user.session_key ?? null)
    await supabase.from(USERS_TABLE).update({ session_key: sessionKey }).eq('id', user.id)

    const res = NextResponse.json({ success: true, role: user.role, name: user.name })
    res.cookies.set('telasSession', signSession(user.id, user.role, sessionKey), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Erro no login' }, { status: 500 })
  }
}
