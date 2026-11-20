import { NextRequest, NextResponse } from 'next/server'
import { supabase, SCREENS_TABLE } from '@/lib/db'

// Categorias (engenharias) com contagem de telas — para a sidebar do painel
export async function GET() {
  try {
    const { data, error } = await supabase.rpc('count_screens_by_category')
    if (error || !data) {
      // fallback: busca todas as telas? caro. Usa view fallback simples
      const { count } = await supabase.from(SCREENS_TABLE).select('*', { count: 'exact', head: true })
      return NextResponse.json({ categories: [], total: count || 0 })
    }
    return NextResponse.json({ categories: data })
  } catch {
    return NextResponse.json({ categories: [], total: 0 })
  }
}
