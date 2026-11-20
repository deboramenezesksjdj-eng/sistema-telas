const key = 'SetupX2026'
const tok = process.env.VERCEL_TOKEN || ''
;(async () => {
  // atualizar DATABASE_URL para conexão direta (Vercel tem IPv6)
  const json = JSON.stringify({
    type: 'encrypted',
    target: ['production', 'preview', 'development'],
    key: 'DATABASE_URL',
    value: process.env.DATABASE_URL || '',
  })
  const find = await fetch('https://api.vercel.com/v9/projects/sistema-telas/env?target=production', {
    headers: { Authorization: 'Bearer ' + tok },
  })
  const envs = await find.json()
  const existing = (envs.envs || []).find((e) => e.key === 'DATABASE_URL')
  if (existing) {
    const del = await fetch(`https://api.vercel.com/v9/projects/sistema-telas/env/${existing.id}`, {
      method: 'DELETE', headers: { Authorization: 'Bearer ' + tok },
    })
    console.log('delete antigo:', del.status)
  }
  const res = await fetch('https://api.vercel.com/v10/projects/sistema-telas/env', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: json,
  })
  console.log('env:', res.status, await res.text())
})()
