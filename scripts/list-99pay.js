const { Client } = require('pg')
const c = new Client({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})
;(async () => {
  await c.connect()
  const r = await c.query(`select name from public.screens where name like '%99PAY%' order by name`)
  r.rows.forEach(x => console.log(x.name))
  await c.end()
})()
