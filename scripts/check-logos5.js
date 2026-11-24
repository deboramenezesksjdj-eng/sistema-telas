const { Client } = require('pg')
const c = new Client({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})
;(async () => {
  await c.connect()
  const r = await c.query(`select name, html from public.screens where name like 'Outras — Atualizacao%' or name like 'Outras — Atualização%' limit 2`)
  for (const x of r.rows) {
    console.log('=== ' + x.name)
    // achar tag img
    const m = x.html.match(/<img[^>]*>/g)
    console.log('imgs:', m ? m.join('\n').slice(0, 600) : 'nenhuma')
  }
  // Como ficam as imagens no painel? Ver o contexto de uma img
  const s = await c.query(`select substring(html from '<img[^>]{0,300}') img from public.screens where name like 'Outras — %' limit 3`)
  s.rows.forEach(x => console.log('IMG:', x.img))
  await c.end()
})()
