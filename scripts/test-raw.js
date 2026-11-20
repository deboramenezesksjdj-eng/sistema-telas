// Pooler usa start-TLS (SSLRequest primeiro). Reproduz handshake como o pg faz.
const net = require('net')
const tls = require('tls')

function tryPool(host, user, password) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port: 5432 }, () => {
      s.write(Buffer.from([0, 0, 0, 8, 4, 210, 22, 47]))
    })
    s.once('data', (d) => {
      if (d[0] !== 83) { s.destroy(); return resolve('no-S') }
      const t = tls.connect({ socket: s, rejectUnauthorized: false, servername: host }, () => {
        // enviar StartupMessage simples
        const params = `user\x00${user}\x00database\x00postgres\x00\x00`
        const len = 8 + Buffer.byteLength(params) + 1
        const buf = Buffer.alloc(len)
        buf.writeInt32BE(len, 0)
        buf.writeInt32BE(196608, 4)
        buf.write(params, 8, 'latin1')
        t.write(buf)
      })
      t.once('data', (d) => {
        const tag = String.fromCharCode(d[0])
        console.log(host, user, '-> resp:', tag, d.toString('latin1', 5, 120).replace(/\0/g, ' '))
        t.end(); resolve(null)
      })
      t.on('error', (e) => { console.log(host, user, 'tls err:', e.message.slice(0, 60)); resolve(null) })
    })
    s.on('error', (e) => { console.log(host, 'tcp err:', e.message); resolve(null) })
  })
}
;(async () => {
  await tryPool('aws-0-sa-east-1.pooler.supabase.com', 'postgres.srcyncstaxiteikajcqc', '@Rajada01.123')
})()
