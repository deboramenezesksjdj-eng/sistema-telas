const { Client } = require('pg')
const fs = require('fs')
for (const line of fs.readFileSync('.env.vercel','utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const c = new Client({ connectionString: process.env.DATABASE_URL })
c.connect().then(async () => {
  await c.query("alter table public.users add column if not exists session_key text")
  await c.query("alter table public.users add column if not exists expires_at timestamptz")
  console.log('colunas session_key + expires_at ok')
  await c.end()
}).catch(e => { console.error('ERR', e.message); process.exit(1) })
