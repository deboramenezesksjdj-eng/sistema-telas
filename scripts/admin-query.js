const fs = require('fs')
const sql = fs.readFileSync('schema.sql', 'utf8')

async function attempt(label, url, headers, body) {
  try {
    const res = await fetch(url, { method: 'POST', headers, body })
    const text = await res.text()
    console.log(`${label} -> ${res.status}: ${text.slice(0, 250)}`)
  } catch (e) {
    console.log(`${label} -> ERR ${e.message}`)
  }
}

;(async () => {
  const tok = process.env.SUPABASE_SECRET_KEY
  const body = JSON.stringify({ query: sql })
  const proj = 'srcyncstaxiteikajcqc'
  await attempt('admin/database/query', `https://${proj}.supabase.co/admin/database/query`, { apikey: tok, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body)
  await attempt('mgmt api query', `https://api.supabase.com/v1/projects/${proj}/database/query`, { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body)
  const res2 = await fetch(`https://api.supabase.com/v1/projects/${proj}`, { headers: { Authorization: 'Bearer ' + tok } })
  console.log('mgmt projects ->', res2.status, (await res2.text()).slice(0, 200))
})()
