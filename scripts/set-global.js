const { Client } = require('pg')
const c = new Client({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})
;(async () => {
  await c.connect()
  await c.query(`update public.screens set is_global = false where name <> 'Tela preta'`)
  const r = await c.query(`select name from public.screens where is_global`)
  console.log('global:', JSON.stringify(r.rows))
  const c2 = await c.query(`select count(*)::int as n from public.screens where name like 'NUBANK%'`)
  console.log('NUBANK screens:', c2.rows[0].n)
  const cats = await c.query(`select split_part(name, ' — ', 1) as cat, count(*)::int as n from public.screens group by 1 order by 2 desc limit 10`)
  console.log(JSON.stringify(cats.rows))
  await c.end()
})()
