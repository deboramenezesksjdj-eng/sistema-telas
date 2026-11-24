import { NextRequest, NextResponse } from 'next/server'
import { parseSession, findUserByEmail, hashPassword } from '@/lib/auth'
import { supabase, USERS_TABLE } from '@/lib/db'

// POST /api/auth/register — SOMENTE ADMIN cria usuários
// { email, password, name, role?, expires_at? ("YYYY-MM-DD" ou null) }
export async function POST(request: NextRequest) {
  try {
    const meId = await parseSession(request.cookies.get('telasSession')?.value)
    if (!meId) return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
    const { data: me } = await supabase.from(USERS_TABLE).select('role, blocked').eq('id', meId).maybeSingle()
    if (!me || me.role !== 'admin') {
      return NextResponse.json({ error: 'Somente o administrador pode criar usuários' }, { status: 403 })
    }

    const { email, password, name, role, expires_at } = await request.json()
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
        name: typeof name === 'string' && name ? name : null,
        role: role === 'admin' ? 'admin' : 'user',
        expires_at: typeof expires_at === 'string' && expires_at ? new Date(expires_at + 'T23:59:59Z').toISOString() : null,
      })
      .select('id, email, name, role, expires_at')
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, user: data })
  } catch {
    return NextResponse.json({ error: 'Erro no cadastro' }, { status: 500 })
  }
}
