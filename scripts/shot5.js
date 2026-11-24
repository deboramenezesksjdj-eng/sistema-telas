// loga de verdade (form) e verifica categoria inicial
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } })
  await p.goto('https://sistema-telas.vercel.app/painel', { waitUntil: 'domcontentloaded' })
  await p.fill('input[type=password]', process.env.ADMIN_PW)
  await p.keyboard.press('Enter')
  await p.waitForTimeout(8000)
  await p.screenshot({ path: 'scripts/shot-5-logado.png' })
  await b.close()
  console.log('ok')
})()
