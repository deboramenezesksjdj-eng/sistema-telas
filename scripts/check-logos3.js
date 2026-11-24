const { Client } = require('pg')
const c = new Client({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})
;(async () => {
  await c.connect()
  // Para cada tela: a logo webp que ela usa corresponde à logo dominante da sua categoria de MESMO SUFFIX de marca?
  // Melhor: mapear brand -> logo a partir das categorias puras (ex: "99PAY — ..." sempre usa logo 99PAY)
  // Depois, para telas "Outras — X — MARCA", extrair a MARCA e conferir se a logo usada = logo da categoria MARCA
  const brands = await c.query(`
    select (regexp_matches(html, 'joystick-logos/([a-f0-9-]+)\\.webp', 'g'))[1] logo_id,
           split_part(name,' — ',3) marca, count(*)
    from public.screens
    where name like 'Outras — %'
    group by 1,2 order by 3 desc limit 50`)
  brands.rows.forEach(x => console.log(x.marca, '|', x.logo, '|', x.count))
  // logos por categoria normal
  const cats = await c.query(`
    select split_part(name,' — ',1) cat,
           (regexp_matches(html, 'joystick-logos/([a-f0-9-]+)\\.webp', 'g'))[1] logo,
           count(*)
    from public.screens
    where name not like 'Outras — %'
    group by 1,2 order by 1, 3 desc`)
  const m = {}
  cats.rows.forEach(x => { if (!m[x.cat] || x.count > m[x.cat].n) m[x.cat] = { logo: x.logo, n: x.count } })
  console.log('categorias mapeadas:', Object.keys(m).length)
  const fs = require('fs')
  fs.writeFileSync('scripts/logo-map.json', JSON.stringify(m, null, 1))
  await c.end()
})()
