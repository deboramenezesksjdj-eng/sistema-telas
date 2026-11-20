import { NextRequest, NextResponse } from 'next/server'
import { supabase, SCREENS_TABLE, DEVICES_TABLE } from '@/lib/db'

// Lista telas e dispositivos (para o painel).
// GET ?list=1&cat=&q=&page= — paginação para os 1184 modelos
export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams
    const list = sp.get('list')

    if (list) {
      const cat = sp.get('cat') || ''
      const q = sp.get('q') || ''
      const page = Math.max(1, Number(sp.get('page') || 1))
      const perPage = 24
      let query = supabase.from(SCREENS_TABLE).select('id, name, html, is_global, is_active, updated_at', { count: 'exact' })
      if (cat && cat !== 'Todas') query = query.ilike('name', `${cat} — %`)
      if (q) query = query.ilike('name', `%${q}%`)
      query = query.order('name').range((page - 1) * perPage, page * perPage - 1)
      const { data, count, error } = await query
      if (error) throw error
      return NextResponse.json({ screens: data, total: count, page, perPage })
    }

    const [{ data: screens, error: e1 }, { data: devices, error: e2 }] = await Promise.all([
      supabase.from(SCREENS_TABLE).select('*').order('id'),
      supabase.from(DEVICES_TABLE).select('*').order('last_seen', { ascending: false }),
    ])
    if (e1 || e2) throw e1 || e2
    return NextResponse.json({ screens, devices })
  } catch (error) {
    console.error('Erro ao listar:', error)
    return NextResponse.json({ error: 'Erro ao listar' }, { status: 500 })
  }
}

// Contagens por categoria (para a sidebar)
export async function HEAD() {
  return NextResponse.json({})
}

// Criar tela
export async function POST(request: NextRequest) {
  try {
    const { name, html, isGlobal } = await request.json()

    if (isGlobal) {
      await supabase.from(SCREENS_TABLE).update({ is_global: false }).neq('id', 0)
    }

    const { data, error } = await supabase
      .from(SCREENS_TABLE)
      .insert({ name, html, is_global: !!isGlobal, is_active: true })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, screen: data })
  } catch (error) {
    console.error('Erro ao criar tela:', error)
    return NextResponse.json({ success: false, error: 'Erro ao criar tela' }, { status: 500 })
  }
}

// Atualizar tela (nome, html, ativa, global) OU atribuir tela a dispositivo
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // Atribuição: { deviceId, screenId | null, active }
    if (body.deviceId !== undefined) {
      const updates: any = { screen_id: body.screenId ?? null, screen_active: body.active ?? true, updated_at: new Date().toISOString() }
      const { data, error } = await supabase
        .from(DEVICES_TABLE)
        .update(updates)
        .eq('device_id', body.deviceId)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ success: true, device: data })
    }

    // Atualização de tela: { id, name?, html?, isActive?, isGlobal? }
    const updates: any = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) updates.name = body.name
    if (body.html !== undefined) updates.html = body.html
    if (body.isActive !== undefined) updates.is_active = body.isActive
    if (body.isGlobal !== undefined) {
      updates.is_global = body.isGlobal
      if (body.isGlobal) {
        await supabase.from(SCREENS_TABLE).update({ is_global: false }).neq('id', body.id)
      }
    }

    const { data, error } = await supabase
      .from(SCREENS_TABLE)
      .update(updates)
      .eq('id', body.id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, screen: data })
  } catch (error) {
    console.error('Erro ao atualizar:', error)
    return NextResponse.json({ success: false, error: 'Erro ao atualizar' }, { status: 500 })
  }
}

// Excluir tela: ?id=
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ success: false }, { status: 400 })

    // desatribuir de dispositivos
    await supabase.from(DEVICES_TABLE).update({ screen_id: null }).eq('screen_id', id)

    const { error } = await supabase.from(SCREENS_TABLE).delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir:', error)
    return NextResponse.json({ success: false, error: 'Erro ao excluir' }, { status: 500 })
  }
}
