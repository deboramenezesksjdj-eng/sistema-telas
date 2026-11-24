import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

// POST multipart/form-data { file } -> { url }
// Salva a logo no bucket público "joystick-logos" (mesmo usado pelas telas oficiais)
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Envie um arquivo' }, { status: 400 })
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Imagem maior que 2MB' }, { status: 400 })

    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
    const name = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error } = await supabase.storage
      .from('joystick-logos')
      .upload(name, await file.arrayBuffer(), { contentType: file.type || 'image/png', upsert: false })
    if (error) {
      console.error('upload logo:', error)
      return NextResponse.json({ error: 'Falha no upload da imagem' }, { status: 500 })
    }

    const { data } = supabase.storage.from('joystick-logos').getPublicUrl(name)
    return NextResponse.json({ url: data.publicUrl })
  } catch (e) {
    console.error('upload logo:', e)
    return NextResponse.json({ error: 'Erro no upload' }, { status: 500 })
  }
}
