const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })

  // 1. cadastro
  await p.goto('https://sistema-telas.vercel.app/cadastro')
  await p.fill('input[placeholder="Seu nome"]', 'Teste Usuario')
  await p.fill('input[type=email]', 'teste+' + Date.now() + '@exemplo.com')
  await p.fill('input[type=password]', 'senha123')
  await p.click('button[type=submit]')
  await p.waitForURL('**/cadastro', { timeout: 15000 }).catch(() => {})
  await p.screenshot({ path: 'shot-cadastro.png' })

  // 2. login admin
  await p.goto('https://sistema-telas.vercel.app/login')
  const fs = require('fs')
  for (const line of fs.readFileSync('.env.vercel','utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  await p.fill('input[type=email]', 'admin@blockscreen.app')
  await p.fill('input[type=password]', process.env.ADMIN_PASSWORD)
  await p.click('button[type=submit]')
  await p.waitForURL('**/admin**', { timeout: 15000 })
  await p.waitForTimeout(2000)
  await p.screenshot({ path: 'shot-admin.png', fullPage: true })
  console.log('admin url:', p.url())
  await b.close()
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1) })
