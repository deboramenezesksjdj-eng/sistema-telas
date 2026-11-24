import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail, verifyPassword, signSession } from '@/lib/auth'

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

    const res = NextResponse.json({ success: true, role: user.role, name: user.name })
    res.cookies.set('telasSession', signSession(user.id), {
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
