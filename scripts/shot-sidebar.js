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
  await page.waitForTimeout(2500)
  if (!page.url().includes('/painel')) { await page.goto('https://sistema-telas.vercel.app/painel', { waitUntil: 'networkidle' }) }
  await page.waitForTimeout(2500)

  // sidebar presente?
  const sidebar = await page.locator('aside').count()
  console.log('sidebar:', sidebar)

  // clicar em categoria na sidebar
  await page.locator('aside nav button', { hasText: '99PAY' }).first().click()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: 'scripts/shot-sidebar.png' })

  // ativar a primeira tela do catálogo
  const btn = page.locator('button', { hasText: 'Ativar' }).first()
  await btn.click()
  await page.waitForTimeout(3000)
  const noAr = await page.evaluate(() => document.body.innerText.includes('NO AR'))
  console.log('alguma tela NO AR:', noAr)
  await page.screenshot({ path: 'scripts/shot-ativar.png' })
  await browser.close()
})()
