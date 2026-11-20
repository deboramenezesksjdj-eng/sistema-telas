// Executa schema.sql e importa as 1184 telas — direto via pooler us-west-2
const { Client } = require('pg')
const fs = require('fs')
const URL = process.env.DATABASE_URL || ''
;(async () => {
  const c = new Client({ connectionString: URL, ssl: { rejectUnauthorized: false } })
  await c.connect()
  console.log('conectado')

  // schema statement por statement (o pg não aceita múltiplos com policy em um query às vezes)
  const sql = fs.readFileSync('schema.sql', 'utf8')
  // divide em ; preservando strings
  const stmts = []
  let cur = '', inStr = false
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    if (ch === "'" && sql[i - 1] !== '\\') inStr = !inStr
    cur += ch
    if (ch === ';' && !inStr) { stmts.push(cur.trim()); cur = '' }
  }
  if (cur.trim()) stmts.push(cur)
  // remove comentários de linha inteiros e statements vazios
  let ok = 0
  for (const s of stmts) {
    const clean = s.split('\n').filter(l => !/^\s*--/.test(l)).join('\n').trim()
    if (!clean || /^;?$/.test(clean)) continue
    try { await c.query(clean); ok++ } catch (e) { console.log('ERRO stmt', ok + 1, e.message.slice(0, 120)) }
  }
  console.log('schema aplicado,', ok, 'statements')

  // importa modelos
  const models = JSON.parse(fs.readFileSync('lib/joystick-models.json', 'utf8'))
  let imported = 0
  await c.query('begin')
  for (const m of models) {
    await c.query(
      `insert into public.screens (name, html, is_global, is_active) select $1,$2,false,true where not exists (select 1 from public.screens where name = $1 and html = $2)`,
      [`${m.category} — ${m.name}`, m.html]
    )
    imported++
    if (imported % 200 === 0) console.log(imported + '/' + models.length)
  }
  await c.query('commit')
  const r = await c.query('select count(*) from public.screens')
  console.log('total na tabela screens:', r.rows[0].count)
  await c.end()
})().catch(e => { console.error('FALHA:', e.message.slice(0, 300)); process.exit(1) })
