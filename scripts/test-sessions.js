const { chromium } = require('playwright')
const fs = require('fs')
for (const line of fs.readFileSync('.env.vercel','utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })

  // 1. login admin
  await p.goto('https://sistema-telas.vercel.app/login')
  await p.fill('input[type=email]', 'admin@blockscreen.app')
  await p.fill('input[type=password]', process.env.ADMIN_PASSWORD)
  await p.click('button[type=submit]')
  await p.waitForURL('**/admin', { timeout: 20000 })
  await p.waitForTimeout(2500)
  await p.screenshot({ path: 'shot-admin2.png', fullPage: true })
  console.log('1. admin logado:', p.url())

  // 2. criar usuário com validade via API (como o admin)
  const exp = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  const res = await p.request.post('https://sistema-telas.vercel.app/api/auth/register', {
    data: { name: 'User Validade', email: 'validade@exemplo.com', password: 'senha123', expires_at: exp }
  })
  console.log('2. criar usuario:', res.status(), await res.text())

  // 3. login do usuário em dois contexts — segundo login deve derrubar o primeiro
  const makeCtx = async () => {
    const c = await b.newContext()
    const pg = await c.newPage()
    await pg.goto('https://sistema-telas.vercel.app/login')
    await pg.fill('input[type=email]', 'validade@exemplo.com')
    await pg.fill('input[type=password]', 'senha123')
    await pg.click('button[type=submit]')
    await pg.waitForURL('**/painel', { timeout: 20000 })
    return c
  }
  const ctxA = await makeCtx()
  console.log('3a. primeiro login ok (/painel)')
  const ctxB = await makeCtx()
  console.log('3b. segundo login ok (/painel)')
  // primeira sessão ainda válida? deve ter sido derrubada
  const meA = await ctxA.request.get('https://sistema-telas.vercel.app/api/auth/me')
  console.log('4. sessao antiga do usuario (deve ser 401):', meA.status())
  // admin continua logado (sessões múltiplas)
  const meAdmin = await p.request.get('https://sistema-telas.vercel.app/api/auth/me')
  console.log('5. admin ainda logado (deve ser 200):', meAdmin.status())
  await b.close()
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1) })
