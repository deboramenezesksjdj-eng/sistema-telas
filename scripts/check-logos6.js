const { Client } = require('pg')
const c = new Client({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})
;(async () => {
  await c.connect()
  // telas "Outras" sem marca e quais logos usam
  const r = await c.query(`
    select name,
           (regexp_matches(html, 'joystick-logos/([a-f0-9-]+)\\.webp', 'g'))[1] logo
    from public.screens
    where name like 'Outras — %'
    order by name limit 60`)
  r.rows.forEach(x => console.log(x.name, '=>', (x.logo || 'sem-logo').slice(0, 8)))
  await c.end()
})()
