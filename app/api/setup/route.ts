import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import dns from 'dns'

// Setup automático: cria as tabelas (via SQL) e importa as telas do Joystick.
// Protegido: só funciona se ?key= for igual ao SETUP_KEY.
import { getPool } from '@/lib/pg'

export async function POST(request: NextRequest) {
  const pwd = process.env.ADMIN_PASSWORD || 'Admin01'
  if (new URL(request.url).searchParams.get('key') !== (process.env.SETUP_KEY || pwd)) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  }

  // diagnostico: ?diag=1 — só resolve o DNS do host db e testa TCP
  if (new URL(request.url).searchParams.get('diag')) {
    dns.setDefaultResultOrder('verbatim')
    const lookup = await dns.promises.lookup('db.srcyncstaxiteikajcqc.supabase.co', { all: true }).then(a => a).catch((e: NodeJS.ErrnoException) => e.code || String(e))
    return NextResponse.json({ lookup })
  }

  const pool = getPool()
  try {
    // 1. schema
    const sqlPath = path.join(process.cwd(), 'schema.sql')
    const schemaSql = fs.readFileSync(sqlPath, 'utf8')
    await pool.query(schemaSql)

    // 2. importar modelos
    const models = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib', 'joystick-models.json'), 'utf8')) as { category: string; name: string; html: string }[]
    const client = await pool.connect()
    let imported = 0
    try {
      await client.query('begin')
      for (const m of models) {
        await client.query(
          `insert into public.screens (name, html, is_global, is_active) values ($1,$2,false,true) where not exists (select 1 from public.screens where name = $1 and html = $2)`,
          [`${m.category} — ${m.name}`, m.html]
        )
        imported++
      }
      await client.query('commit')
    } finally {
      client.release()
    }
    return NextResponse.json({ ok: true, imported, total: models.length })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
