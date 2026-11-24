const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
for (const line of fs.readFileSync('.env.vercel','utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
;(async () => {
  const { error } = await sb.from('users').delete().neq('email', 'admin@blockscreen.app')
  console.log(error ? 'ERR: ' + error.message : 'usuarios de teste removidos')
})()
