const { Client } = require('pg')
const c = new Client({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})
;(async () => {
  await c.connect()
  // Nas telas "Outras", a logo usada bate com a marca no nome (3ª parte)?
  // Extrair marca do nome e conferir logo usada no html
  const r = await c.query(`
    select id, name, marca, logo_usada
    from (
      select id, name,
             trim(split_part(name,' — ',3)) marca,
             (regexp_matches(html, 'joystick-logos/([a-f0-9-]+)\\.webp', 'g'))[1] logo_usada
      from public.screens
      where name like 'Outras — %'
    ) t`)
  const fs = require('fs')
  const m = JSON.parse(fs.readFileSync('scripts/logo-map.json', 'utf8'))
  // normalizar nomes de categoria sem emoji etc.
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const byNorm = {}
  for (const [k, v] of Object.entries(m)) byNorm[norm(k)] = v.logo
  let ok = 0, bad = [], semMarca = 0
  const seen = {}
  for (const row of r.rows) {
    const key = row.marca + '|' + row.logo_usada
    if (seen[key]) { seen[key]++; continue }
    seen[key] = 1
    if (!row.marca) { semMarca++; continue }
    const expected = byNorm[norm(row.marca)]
    if (expected === row.logo_usada) ok++
    else bad.push({ name: row.name, marca: row.marca, usada: row.logo_usada, esperada: expected })
  }
  console.log('pares marca/logo corretos:', ok, '| incorretos:', bad.length, '| sem marca no nome:', semMarca)
  bad.slice(0, 20).forEach(b => console.log('ERR:', b.name, '| usada:', b.usada, '| esperada:', b.esperada))
  await c.end()
})()
