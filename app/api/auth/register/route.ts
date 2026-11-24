import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail, hashPassword } from '@/lib/auth'
import { supabase, USERS_TABLE } from '@/lib/db'

// POST /api/auth/register — { email, password, name }
export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()
    if (!email || !password) return NextResponse.json({ error: 'Preencha email e senha' }, { status: 400 })
    if (String(password).length < 6) return NextResponse.json({ error: 'A senha precisa ter ao menos 6 caracteres' }, { status: 400 })
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const existing = await findUserByEmail(String(email))
    if (existing) return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 409 })

    const { data, error } = await supabase
      .from(USERS_TABLE)
      .insert({
        email: String(email).trim().toLowerCase(),
        password_hash: hashPassword(String(password)),
        name: typeof name === 'string' ? name : null,
        role: 'user',
      })
      .select('id, email, name, role')
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, user: data })
  } catch {
    return NextResponse.json({ error: 'Erro no cadastro' }, { status: 500 })
  }
}
