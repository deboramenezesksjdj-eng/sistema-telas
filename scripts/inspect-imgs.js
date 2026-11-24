const { Client } = require('pg')
const c = new Client({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})
;(async () => {
  await c.connect()
  // extrair todas as URLs de imagem citadas nos HTMLs por categoria
  const r = await c.query(`
    select split_part(name,' — ',1) cat,
           (regexp_matches(html, 'src=["'']([^"'']+)["'']', 'g'))[1] img,
           count(*)
    from public.screens
    group by 1,2 order by 3 desc limit 40`)
  r.rows.forEach(x => console.log(x.cat, '|', x.img, '|', x.count))
  await c.end()
})()
