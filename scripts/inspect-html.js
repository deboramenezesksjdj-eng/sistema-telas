const { Client } = require('pg')
const c = new Client({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})
;(async () => {
  await c.connect()
  const r = await c.query("select split_part(name,' — ',1) cat, count(*) n from public.screens group by 1 order by n desc limit 12")
  console.log(JSON.stringify(r.rows))
  // ver samples de 3 categorias diferentes
  for (const cat of ['Gov.br', 'BANCO BV', 'ANDROID']) {
    const s = await c.query("select name, html from public.screens where name like $1 limit 2", [cat + ' — %'])
    for (const x of s.rows) {
      console.log('=== ' + x.name + ' | html len ' + x.html.length)
      console.log(x.html.slice(0, 500).replace(/\n/g, ' '))
    }
  }
  await c.end()
})()
