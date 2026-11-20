const { Client } = require('pg')
const users = ['postgres.srcyncstaxiteikajcqc', 'srcyncstaxiteikajcqc', 'postgres']
;(async () => {
  for (const user of users) {
    for (const port of [5432, 6543]) {
      try {
        const c = new Client({ host: 'aws-0-sa-east-1.pooler.supabase.com', port, user, password: '@Rajada01.123', database: 'postgres', ssl: { rejectUnauthorized: false } })
        await c.connect()
        const r = await c.query('select current_user as u')
        console.log(`OK user=${user} port=${port} -> ${r.rows[0].u}`)
        await c.end()
        process.exit(0)
      } catch (e) {
        console.log(`fail user=${user} port=${port}: ${e.message.slice(0, 90)}`)
      }
    }
  }
  console.log('NENHUM FUNCIONOU')
})()
