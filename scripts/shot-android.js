const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
for (const line of fs.readFileSync('.env.vercel','utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
;(async () => {
  const { data } = await sb.from('screens').select('html').eq('name', 'Atualização Android').maybeSingle()
  fs.writeFileSync('scripts\\android-live.html', data.html)
  const { chromium } = require('playwright')
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 390, height: 693 } })
  await p.goto('file://' + require('path').resolve('scripts\\android-live.html'))
  await p.waitForTimeout(1500)
  await p.screenshot({ path: 'shot-android-fixed.png' })
  await b.close()
  console.log('screenshot ok')
})()
