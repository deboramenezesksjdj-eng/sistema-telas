const fs = require('fs')
for (const line of fs.readFileSync('.env.vercel', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
sb.from('screens').delete().eq('id', 1190).then((d) => console.log('deleted:', JSON.stringify(d.error)))
