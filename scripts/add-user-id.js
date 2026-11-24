// Adiciona user_id em screens (dono da tela) e em devices (dono do dispositivo).
// RODAR 1x: node scripts/add-user-id.js   (usa DATABASE_URL do .env.vercel)
const { Client } = require('pg')
for (const line of require('fs').readFileSync('.env.vercel', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
;(async () => {
  await c.connect()
  const stmts = [
    `alter table public.screens add column if not exists user_id bigint`,
    `alter table public.devices add column if not exists user_id bigint`,
    `create index if not exists screens_user_id_idx on public.screens (user_id)`,
  ]
  for (const s of stmts) {
    try { await c.query(s); console.log('ok:', s.slice(0, 70)) } catch (e) { console.log('erro:', e.message.slice(0, 150)) }
  }
  const r = await c.query(`select table_name, column_name from information_schema.columns where table_name in ('screens','devices') and column_name = 'user_id'`)
  console.log('colunas user_id:', JSON.stringify(r.rows))
  await c.end()
})()
