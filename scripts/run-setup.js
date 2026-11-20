const key = 'SetupX2026'
;(async () => {
  try {
    const res = await fetch('https://sistema-telas.vercel.app/api/setup?key=' + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    const t = await res.text()
    console.log(res.status, t.slice(0, 500))
  } catch (e) {
    console.log('ERR', e.message)
  }
})()
