// screenshot de um preview do painel para ver o bug das logos
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } })
  await p.goto('https://sistema-telas.vercel.app/painel', { waitUntil: 'networkidle' })
  // login
  const inp = p.locator('input[type=password]')
  if (await inp.count()) {
    await inp.fill('AdminX2026')
    await p.keyboard.press('Enter')
    await p.waitForTimeout(4000)
  }
  // clicar na categoria ANDROID na sidebar
  await p.getByText('ANDROID', { exact: false }).first().click().catch(() => {})
  await p.waitForTimeout(6000)
  await p.screenshot({ path: 'scripts/shot-painel.png', fullPage: false })
  await b.close()
  console.log('ok')
})()
