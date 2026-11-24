const { Client } = require('pg')
const c = new Client({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})
;(async () => {
  await c.connect()
  // Quantas telas NÃO usam a logo da própria categoria? Detectar: para cada tela, comparar a img src dela com a src dominante da categoria
  const r = await c.query(`
    with imgs as (
      select id, name, split_part(name,' — ',1) cat,
             (regexp_matches(html, 'src=["'']([^"'']+webp[^"'']*)["'']', 'g'))[1] img
      from public.screens
    ),
    dom as (
      select cat, img, count(*) n,
             row_number() over (partition by cat order by count(*) desc) rn
      from imgs group by cat, img
    )
    select i.cat, count(*) total,
           count(*) filter (where d.img = i.img) corretas,
           count(*) filter (where d.img <> i.img) incorretas
    from imgs i
    join dom d on d.cat = i.cat and d.rn = 1
    group by 1 order by 4 desc limit 20`)
  console.log(JSON.stringify(r.rows, null, 1))
  // Exemplos de telas com logo errada
  const ex = await c.query(`
    with imgs as (
      select id, name, split_part(name,' — ',1) cat,
             (regexp_matches(html, 'src=["'']([^"'']+webp[^"'']*)["'']', 'g'))[1] img
      from public.screens
    ),
    dom as (
      select cat, img, count(*) n,
             row_number() over (partition by cat order by count(*) desc) rn
      from imgs group by cat, img
    )
    select i.name, i.cat, i.img, d.img as expected
    from imgs i
    join dom d on d.cat = i.cat and d.rn = 1
    where d.img <> i.img limit 15`)
  ex.rows.forEach(x => console.log(x.cat, '|', x.name, '| usa:', x.img.slice(-50), '| esperada:', x.expected.slice(-50)))
  await c.end()
})()
