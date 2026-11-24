const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
for (const line of fs.readFileSync('.env.vercel', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const sb = createClient(url, key, { auth: { persistSession: false } })
;(async () => {
  const { data, error } = await sb.from('screens').select('id, name, html').eq('name', 'Atualização Android').maybeSingle()
  if (error) { console.error(error.message); process.exit(1) }
  if (!data) { console.log('NOT FOUND'); process.exit(0) }
  console.log('id:', data.id, 'len:', data.html.length)
  // mostrar trecho do "robo" (primeiros 1500 chars do body)
  const body = data.html
  const botIdx = body.search(/bot|robot|andro|🤖|svg/i)
  console.log('--- snippet around robot ---')
  console.log(body.slice(Math.max(0, botIdx - 200), botIdx + 1200))
  console.log('--- has emoji robot?', /🤖/.test(body), '| has svg bot?', /class="bot"/.test(body))
})()
