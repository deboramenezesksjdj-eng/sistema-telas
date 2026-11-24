const fs = require('fs')
for (const line of fs.readFileSync('.env.vercel', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('https://sistema-telas.vercel.app/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', 'admin@blockscreen.app')
  await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/painel', { timeout: 20000 }).catch(() => {})
await page.waitForTimeout(2500)
if (!page.url().includes('/painel')) { await page.goto('https://sistema-telas.vercel.app/painel', { waitUntil: 'networkidle' }) }
  await page.waitForTimeout(2000)

  await page.click('text=+ Nova tela')
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'scripts/shot-builder-modal.png' })

  // trocar modo para carregando e digitar textos
  await page.click('text=Carregando')
  await page.fill('input[placeholder="Ex.: Refaça o procedimento"]', 'Refaça o procedimento')
  await page.fill('input[placeholder="Ex.: Preparando nova tentativa"]', 'Preparando nova tentativa')
  await page.fill('input[placeholder="Ex.: Minha tela"]', 'Teste Builder')
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'scripts/shot-builder-filled.png' })

  await page.click('text=Criar tela')
  await page.waitForTimeout(3000)
  const created = await page.evaluate(() => document.body.innerText.includes('Teste Builder'))
  console.log('criada visível na lista:', created)
  await page.screenshot({ path: 'scripts/shot-builder-after.png' })
  await browser.close()
})()
