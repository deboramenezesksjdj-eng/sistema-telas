const { Client } = require('pg')
const c = new Client({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})
;(async () => {
  await c.connect()
  // salvar HTMLs de exemplo para inspeção visual
  const r = await c.query(`
    select id, name, html from public.screens
    where name in (
      'Outras — Atualização Bancaria 2  — SICRED',
      'Outras — Atualização Bancaria 2  — MERCADO PAGO',
      '99PAY — Validando Dados',
      'ANDROID — Atualizando Sistema'
    ) or name like '99PAY — %' limit 4`)
  const fs = require('fs')
  for (const x of r.rows) {
    const safe = x.name.replace(/[^\w-]+/g, '_').slice(0, 60)
    fs.writeFileSync('scripts/sample-' + x.id + '.html', x.html)
    console.log(x.id, x.name)
  }
  await c.end()
})()
