import { NextRequest, NextResponse } from 'next/server'
import { supabase, SCREENS_TABLE, DEVICES_TABLE } from '@/lib/db'

// GET /api/state?device=XXXX
// Retorna o estado da tela que o dispositivo deve exibir.
export async function GET(request: NextRequest) {
  try {
    const deviceId = new URL(request.url).searchParams.get('device') || ''

    let device = null
    if (deviceId) {
      const { data } = await supabase
        .from(DEVICES_TABLE)
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle()
      device = data
    }

    // Dispositivo com tela específica atribuída
    if (device && device.screen_id !== null && device.screen_id !== undefined) {
      const { data: screen } = await supabase
        .from(SCREENS_TABLE)
        .select('*')
        .eq('id', device.screen_id)
        .maybeSingle()
      if (screen) {
        return NextResponse.json({
          active: !!device.screen_active,
          version: `dev-${device.device_id}-${screen.id}-${device.updated_at}`,
          html: screen.html,
        })
      }
    }

    // Fallback: tela global
    const { data: globalScreen } = await supabase
      .from(SCREENS_TABLE)
      .select('*')
      .eq('is_global', true)
      .maybeSingle()

    if (globalScreen) {
      return NextResponse.json({
        active: !!globalScreen.is_active,
        version: `global-${globalScreen.id}-${globalScreen.updated_at}`,
        html: globalScreen.html,
      })
    }

    return NextResponse.json({ active: false })
  } catch (error) {
    console.error('Erro ao buscar estado:', error)
    return NextResponse.json({ active: false }, { status: 500 })
  }
}

// POST /api/state — registra/renova heartbeat de dispositivo
export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await request.json()
    if (!deviceId) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    await supabase
      .from(DEVICES_TABLE)
      .upsert(
        { device_id: deviceId, last_seen: new Date().toISOString() },
        { onConflict: 'device_id' }
      )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
