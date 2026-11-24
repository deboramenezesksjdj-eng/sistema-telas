const fs = require('fs')
const { chromium } = require('playwright')

for (const line of fs.readFileSync('.env.vercel', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('https://sistema-telas.vercel.app/login', { waitUntil: 'networkidle' })
  await page.fill('input[type=email]', 'admin@blockscreen.app')
  await page.fill('input[type=password]', process.env.ADMIN_PASSWORD)
  await page.click('button[type=submit]')
  await page.waitForURL('**/admin', { timeout: 15000 })
  // vai para o painel
  await page.goto('https://sistema-telas.vercel.app/painel', { waitUntil: 'networkidle' })
  await page.waitForTimeout(4000)
  await page.screenshot({ path: 'scripts/shot-painel-new.png', fullPage: false })
  // testa clique em categoria
  const chips = page.locator('header button')
  const n = await chips.count()
  console.log('chips no header:', n)
  if (n > 2) {
    await chips.nth(2).click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'scripts/shot-painel-cat.png', fullPage: false })
    console.log('clicou categoria 2 ok')
  }
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
