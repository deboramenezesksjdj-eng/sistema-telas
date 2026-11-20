// Gera lib/joystick-models.json: telas do Joystick convertidas para modelos do painel
const fs = require('fs')
const data = JSON.parse(fs.readFileSync('joystick-export.json', 'utf8'))
const { presets, engs } = data

const engName = {}
for (const e of engs) engName[e.id] = e.name

// agrupar por engenharia
const groups = {}
for (const p of presets) {
  const cat = engName[p.engineering_id] || 'Outras'
  if (!groups[cat]) groups[cat] = []
  groups[cat].push({ name: p.name, html: p.html })
}

const out = []
for (const [category, list] of Object.entries(groups)) {
  for (const t of list) out.push({ category, name: t.name, html: t.html })
}

fs.writeFileSync('lib/joystick-models.json', JSON.stringify(out))
console.log('total:', out.length, '| categorias:', Object.keys(groups).length)
