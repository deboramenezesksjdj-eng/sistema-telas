// Aplica o schema de usuários (statement a statement, pulando comentários)
const { Client } = require('pg')
const c = new Client({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})
;(async () => {
  await c.connect()
  const fs = require('fs')
  const stmts = [
    `create table if not exists public.users (
      id bigint generated always as identity primary key,
      email text unique not null,
      password_hash text not null,
      name text,
      role text not null default 'user',
      blocked boolean not null default false,
      created_at timestamptz not null default now()
    )`,
    `alter table public.users enable row level security`,
    `drop policy if exists "leitura publica users" on public.users`,
    `create policy "leitura publica users" on public.users for select to anon using (true)`,
    `insert into public.users (email, password_hash, name, role)
     values ('admin@blockscreen.app', 'seed:replace-on-first-login', 'Administrador', 'admin')
     on conflict (email) do nothing`,
  ]
  for (const s of stmts) {
    try { await c.query(s); console.log('ok:', s.slice(0, 60).replace(/\n/g, ' ')) } catch (e) { console.log('erro:', e.message.slice(0, 120)) }
  }
  const r = await c.query(`select email, role, blocked from public.users`)
  console.log('users:', JSON.stringify(r.rows))
  await c.end()
})()
