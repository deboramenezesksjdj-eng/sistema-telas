// Loga via cookie direto (nookies) e fotografa a categoria Outras
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } })
  const p = await ctx.newPage()
  // setar cookie de login antes de navegar
  await ctx.addCookies([{ name: 'telasLoggedIn', value: 'true', url: 'https://sistema-telas.vercel.app' }])
  await p.goto('https://sistema-telas.vercel.app/painel', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(4000)
  console.log('url:', p.url())
  const asideVisible = await p.locator('aside').count()
  console.log('aside:', asideVisible)
  if (!asideVisible) {
    // caiu no login
    await p.fill('input[type=password]', process.env.ADMIN_PW)
    await p.keyboard.press('Enter')
    await p.waitForTimeout(5000)
  }
  await p.screenshot({ path: 'scripts/shot-3a.png' })
  const cats = p.locator('aside button')
  console.log('botões na sidebar:', await cats.count())
  await p.getByText('Outras', { exact: false }).first().click({ timeout: 15000 }).catch(e => console.log('click falhou'))
  await p.waitForTimeout(9000)
  await p.screenshot({ path: 'scripts/shot-3-outras.png' })
  await b.close()
  console.log('ok')
})()
