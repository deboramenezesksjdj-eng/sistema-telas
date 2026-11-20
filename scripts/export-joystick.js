// Exporta TUDO do Joystick: presets (telas com HTML completo) + engenharias
const fs = require('fs')
const SUPA = 'https://kzxjhxctcmualiaufkqx.supabase.co'
const KEY = 'sb_publishable_CE_94vDztpBRvps0S5-MCA_HYm4OLCU'
const EMAIL = 'xtrampos@gmail.com'
const PASS = '311292d2'

async function login() {
  const res = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  })
  const j = await res.json()
  return j.access_token
}

async function getAll(path, token) {
  let all = []
  let from = 0
  const step = 1000
  while (true) {
    const res = await fetch(`${SUPA}/rest/v1/${path}?select=*`, {
      headers: { apikey: KEY, Authorization: `Bearer ${token}`, Range: `${from}-${from + step - 1}` },
    })
    const batch = await res.json()
    if (!Array.isArray(batch) || batch.length === 0) break
    all = all.concat(batch)
    if (batch.length < step) break
    from += step
  }
  return all
}

;(async () => {
  const token = await login()
  if (!token) { console.log('login falhou'); process.exit(1) }

  const engs = await getAll('engineerings?select=*', token)
  const cats = await getAll('engineering_categories?select=*', token)
  const presets = await getAll('presets?select=*', token)
  console.log(`engenharias: ${engs.length} | categorias: ${cats.length} | telas(presets): ${presets.length}`)

  fs.writeFileSync('joystick-export.json', JSON.stringify({ engs, cats, presets }, null, 1))
  console.log('salvo em joystick-export.json')

  // resumo
  const byEng = {}
  for (const p of presets) byEng[p.engineering_id] = (byEng[p.engineering_id] || 0) + 1
  for (const e of engs) console.log(`- ${e.name}: ${byEng[e.id] || 0} telas`)
})()
