import { NextRequest, NextResponse } from 'next/server'
import { buildScript, resolveState } from './script'

type Ctx = { params: Promise<{ token: string }> }

// Compatível com o script original da Joystick:
//   GET /api/public/joystick/[token].js                        -> script idêntico
//   GET /api/public/joystick/[token].js?state=1&callback=cb    -> JSONP de estado
export async function GET(request: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params
  const url = new URL(request.url)
  const callback = url.searchParams.get('callback')
  const sentVersion = url.searchParams.get('v') || ''

  const state = await resolveState(token)

  if (callback) {
    const version = (state.version || '') + ''
    const unchanged = !!state.active && version !== '' && version === sentVersion
    const payload = unchanged
      ? { active: true, unchanged: true, version }
      : { ...state, version }
    const body = `${callback}(${JSON.stringify({ ...payload, ts: Date.now() })})`
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  const js = buildScript(token, url.origin, state)
  return new NextResponse(js, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
