const tls = require('tls')
// Testar SNI por região
const hosts = [
  'aws-0-sa-east-1.pooler.supabase.com',
  'aws-1-sa-east-1.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-0-eu-central-1.pooler.supabase.com',
]
for (const host of hosts) {
  const s = tls.connect({ host, port: 6543, rejectUnauthorized: false, servername: host, timeout: 8000 }, () => {
    console.log('TLS OK:', host, '->', s.getPeerCertificate().subject.CN)
    s.end()
  })
  s.on('error', (e) => console.log('fail', host, e.message.slice(0, 60)))
  s.setTimeout(8000, () => { console.log('timeout', host); s.destroy() })
}
