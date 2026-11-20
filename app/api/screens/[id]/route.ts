import { NextRequest, NextResponse } from 'next/server'
import { supabase, SCREENS_TABLE } from '@/lib/db'

// GET /api/screens/[id] — retorna uma tela com html (usado pelo preview sob demanda)
export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const { data, error } = await supabase
      .from(SCREENS_TABLE)
      .select('id, name, html')
      .eq('id', Number(id))
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'não encontrada' }, { status: 404 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro' }, { status: 500 })
  }
}
