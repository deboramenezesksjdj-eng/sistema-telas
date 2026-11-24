const { Client } = require('pg')
const c = new Client({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})
;(async () => {
  await c.connect()
  // distribuição de prefixos de src
  const r = await c.query(`
    select case
      when html like '%https://kzxjhxctcmualiaufkqx.supabase.co/storage/v1/object/public/joystick-logos/%' then 'abs-joystick-logos'
      when html like '%src="ck-logos/%' then 'rel-ck-logos'
      when html like '%kzxjhxctcmualiaufkqx%' then 'outra-abs-supabase'
      else 'sem-img-webp'
    end tipo, count(*)
    from public.screens group by 1`)
  console.log(JSON.stringify(r.rows))
  // exemplo de uma tela com rel-ck-logos
  const ex = await c.query(`select name, substring(html from position('ck-logos' in html) - 60 for 200) ctx from public.screens where html like '%src="ck-logos/%' limit 2`)
  ex.rows.forEach(x => console.log('---', x.name, '\n', x.html ? '' : '', x.html))
  await c.end()
})()
