// Aplica as policies que falharam no import-direct (por quê? ver erro original)
const { Client } = require('pg')
const c = new Client({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})
;(async () => {
  await c.connect()
  const stmts = [
    `drop policy if exists "leitura publica screens" on public.screens; create policy "leitura publica screens" on public.screens for select to anon using (true)`,
    `drop policy if exists "leitura publica devices" on public.devices; create policy "leitura publica devices" on public.devices for select to anon using (true)`,
    `drop policy if exists "escrita publica devices" on public.devices; create policy "escrita publica devices" on public.devices for insert to anon with check (true)`,
    `drop policy if exists "update publico devices" on public.devices; create policy "update publico devices" on public.devices for update to anon using (true) with check (true)`,
  ]
  for (const s of stmts) {
    try { await c.query(s); console.log('ok:', s.slice(0, 60)) } catch (e) { console.log('erro:', e.message.slice(0, 120)) }
  }
  const r = await c.query(`select polname, polcmd from pg_policy where polrelid in ('public.screens'::regclass,'public.devices'::regclass)`)
  console.log('policies:', JSON.stringify(r.rows))
  await c.end()
})()
