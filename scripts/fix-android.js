const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
for (const line of fs.readFileSync('.env.vercel','utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
;(async () => {
  const { data } = await sb.from('screens').select('id, name, html').eq('name', 'Atualização Android').maybeSingle()
  const out = data.html.replace('<svg class="bot" viewBox="0 0 24 24" fill="currentColor">', '<svg class="bot" viewBox="0 0 24 24" width="60" height="54" fill="#3ddc84">')
  const { error } = await sb.from('screens').update({ html: out }).eq('id', data.id)
  console.log(error ? 'ERR: ' + error.message : 'updated ok, len ' + out.length)
})()
