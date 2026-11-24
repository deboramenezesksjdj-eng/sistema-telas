import { NextRequest, NextResponse } from 'next/server'
import { parseSession, hashPassword } from '@/lib/auth'
import { supabase, USERS_TABLE } from '@/lib/db'

async function adminId(request: NextRequest): Promise<number | null> {
  const id = await parseSession(request.cookies.get('telasSession')?.value)
  if (!id) return null
  const { data } = await supabase.from(USERS_TABLE).select('role, blocked').eq('id', id).maybeSingle()
  return data && data.role === 'admin' && !data.blocked ? id : null
}

// GET /api/auth/users — lista todos (só admin)
export async function GET(request: NextRequest) {
  if (!(await adminId(request))) return NextResponse.json({ error: 'não autorizado' }, { status: 403 })
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, name, role, blocked, expires_at, created_at')
    .order('id')
  if (error) return NextResponse.json({ error: 'erro' }, { status: 500 })
  return NextResponse.json({ users: data })
}

// PUT /api/auth/users — { id, role?, blocked?, password?, name?, expires_at? }
export async function PUT(request: NextRequest) {
  const aid = await adminId(request)
  if (!aid) return NextResponse.json({ error: 'não autorizado' }, { status: 403 })
  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (body.role === 'admin' || body.role === 'user') updates.role = body.role
    if (typeof body.blocked === 'boolean') updates.blocked = body.blocked
    if (typeof body.name === 'string') updates.name = body.name
    if (typeof body.password === 'string' && body.password.length >= 6) updates.password_hash = hashPassword(body.password)
    if ('expires_at' in body) {
      updates.expires_at =
        typeof body.expires_at === 'string' && body.expires_at
          ? new Date(body.expires_at + 'T23:59:59Z').toISOString()
          : null
    }
    if (!Object.keys(updates).length) return NextResponse.json({ error: 'nada para atualizar' }, { status: 400 })

    const { data, error } = await supabase
      .from(USERS_TABLE)
      .update(updates)
      .eq('id', body.id)
      .select('id, email, name, role, blocked, expires_at')
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, user: data })
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

// DELETE /api/auth/users?id= — exclui usuário (admin não pode excluir a si mesmo)
export async function DELETE(request: NextRequest) {
  const aid = await adminId(request)
  if (!aid) return NextResponse.json({ error: 'não autorizado' }, { status: 403 })
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  if (id === aid) return NextResponse.json({ error: 'Não é possível excluir a si mesmo' }, { status: 400 })
  const { error } = await supabase.from(USERS_TABLE).delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
  return NextResponse.json({ success: true })
}
