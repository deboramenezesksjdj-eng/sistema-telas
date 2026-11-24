const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const fs = require('fs')
for (const line of fs.readFileSync('.env.vercel','utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex')
  return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex')
}
;(async () => {
  const pw = process.env.ADMIN_PASSWORD || 'Admin01'
  const { error } = await sb.from('users').update({ password_hash: hashPassword(pw), name: 'Administrador' }).eq('email', 'admin@blockscreen.app')
  console.log(error ? 'ERR: ' + error.message : 'admin password set to ADMIN_PASSWORD value')
})()
