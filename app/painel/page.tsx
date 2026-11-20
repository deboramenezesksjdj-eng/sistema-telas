'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { setCookie } from 'nookies'
import { Monitor, Plus, Trash2, Globe, Power, RefreshCw, LayoutGrid, Pencil, X, Copy, Search } from 'lucide-react'
import { SCREEN_TEMPLATES } from '@/lib/templates'

type Screen = { id: number; name: string; html: string; is_global: boolean; is_active: boolean; updated_at: string }
type Device = { device_id: string; screen_id: number | null; screen_active: boolean; label: string | null; last_seen: string }

const CATEGORIES = ['Todas', ...Array.from(new Set(SCREEN_TEMPLATES.map((t) => t.category || 'Outras')))]

function Preview({ html, className = '' }: { html: string; className?: string }) {
  const [w, setW] = useState(0)
  const [h, setH] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      setW(r.width)
      setH(r.height)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = w ? w / 390 : 0
  return (
    <div ref={ref} className={`relative overflow-hidden rounded-xl border border-neutral-800 bg-black ${className}`}>
      {w > 0 && (
        <iframe
          srcDoc={html}
          sandbox="allow-scripts"
          scrolling="no"
          title="preview"
          className="absolute left-0 top-0 origin-top-left border-0"
          style={{ width: 390, height: 700, transform: `scale(${scale})` }}
        />
      )}
    </div>
  )
}

export default function AdminPanel() {
  const [screens, setScreens] = useState<Screen[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newHtml, setNewHtml] = useState('')
  const [duration, setDuration] = useState(240)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editHtml, setEditHtml] = useState('')
  const [cat, setCat] = useState('Todas')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/screens', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setScreens(data.screens || [])
      setDevices(data.devices || [])
      setLoading(false)
    } catch { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!loggedIn) return
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [loggedIn, load])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    })
    if ((await res.json()).success) {
      setCookie(null, 'telasLoggedIn', 'true', { maxAge: 30 * 24 * 60 * 60, sameSite: true, path: '/' })
      setLoggedIn(true)
    } else {
      setError('Senha incorreta!')
    }
  }

  const assignScreen = async (deviceId: string, screenId: number | null, active = true) => {
    await fetch('/api/screens', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, screenId, active }),
    })
    load()
  }

  const toggleScreenActive = async (s: Screen) => {
    await fetch('/api/screens', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, isActive: !s.is_active }),
    })
    load()
  }

  const makeGlobal = async (s: Screen) => {
    await fetch('/api/screens', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, isGlobal: true }),
    })
    for (const d of devices) {
      await fetch('/api/screens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: d.device_id, screenId: null, active: true }),
      })
    }
    load()
  }

  const useTemplate = (name: string, html: string) => {
    setNewName(name)
    setNewHtml(html.includes('__DURACAO__') ? html.replaceAll('__DURACAO__', String(duration)) : html)
  }

  const createScreen = async () => {
    if (!newName || !newHtml) return
    await fetch('/api/screens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, html: newHtml, isGlobal: false }),
    })
    setNewName('')
    setNewHtml('')
    load()
  }

  const saveEdit = async () => {
    if (!editingId) return
    await fetch('/api/screens', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, html: editHtml }),
    })
    setEditingId(null)
    load()
  }

  const deleteScreen = async (id: number) => {
    if (!confirm('Excluir esta tela?')) return
    await fetch(`/api/screens?id=${id}`, { method: 'DELETE' })
    load()
  }

  const copyScript = () => {
    navigator.clipboard.writeText(`<script src="${location.origin}/api/public/joystick/SEU-CODIGO.js" async></script>`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const visibleTemplates = useMemo(
    () => SCREEN_TEMPLATES.filter((t) => (cat === 'Todas' || (t.category || 'Outras') === cat) && t.name.toLowerCase().includes(search.toLowerCase())),
    [cat, search]
  )

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-600/30">
              <Monitor className="size-6 text-white" />
            </div>
          </div>
          <form onSubmit={handleLogin} className="w-full rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
            <h1 className="text-xl font-bold mb-1 text-center">Painel de Telas</h1>
            <p className="mb-6 text-center text-xs text-neutral-500">Controle remoto de telas Android</p>
            {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400">{error}</p>}
            <input
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Senha de acesso"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 mb-4 text-sm outline-none focus:border-indigo-500"
            />
            <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-semibold hover:opacity-90 shadow-lg shadow-indigo-600/25">
              Entrar
            </button>
          </form>
        </div>
      </div>
    )
  }

  const online = devices.filter((d) => Date.now() - new Date(d.last_seen).getTime() < 120000).length

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-600/30">
              <Monitor className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Painel de Telas</h1>
              <p className="text-xs text-neutral-500">Controle remoto de telas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="rounded-lg border border-neutral-700 p-2 hover:bg-neutral-800" title="Atualizar">
              <RefreshCw className="size-4" />
            </button>
            <button
              onClick={() => { setCookie(null, 'telasLoggedIn', '', { maxAge: -1, path: '/' }); location.reload(); }}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Estatísticas */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          {[
            { label: 'Dispositivos', value: devices.length, color: 'text-indigo-400' },
            { label: 'Online agora', value: online, color: 'text-green-400' },
            { label: 'Telas criadas', value: screens.length, color: 'text-violet-400' },
          ].map((st) => (
            <div key={st.label} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <p className={`text-2xl font-bold ${st.color}`}>{st.value}</p>
              <p className="text-xs text-neutral-500">{st.label}</p>
            </div>
          ))}
        </div>
        {/* Código mestre */}
        <div className="mb-8 rounded-2xl border border-indigo-500/40 bg-indigo-950/20 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs uppercase tracking-wider text-neutral-400">Código mestre — script de injeção</span>
            <span className="flex items-center gap-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-0.5 text-xs font-semibold text-indigo-300">
              <span className="size-1.5 rounded-full bg-indigo-400 animate-pulse" /> Tempo real · atualiza em ~1,5s
            </span>
          </div>
          <div className="flex items-stretch gap-2">
            <code className="flex-1 min-w-0 overflow-x-auto rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2.5 font-mono text-xs text-neutral-300 whitespace-nowrap">
              &lt;script src=&quot;{typeof window !== 'undefined' ? location.origin : ''}/api/public/joystick/SEU-CODIGO.js&quot; async&gt;&lt;/script&gt;
            </code>
            <button onClick={copyScript} className="shrink-0 rounded-lg bg-indigo-600 px-4 text-xs font-semibold hover:bg-indigo-500 flex items-center gap-1.5">
              <Copy className="size-3.5" /> {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-500">Cole este script uma única vez no app/site do celular. A tela muda em tempo real conforme você ativa presets aqui no painel.</p>
        </div>

        {/* Modelos */}
        <section className="mb-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-neutral-400">
              <LayoutGrid className="size-4" /> Modelos prontos
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar telas…"
                className="w-56 rounded-lg border border-neutral-700 bg-neutral-900 py-1.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${cat === c ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
            <label className="text-xs text-neutral-400">
              Duração da atualização Android (timer):{' '}
              <b className="text-indigo-300">{Math.floor(duration / 60)}min {duration % 60 ? `${duration % 60}s` : ''}</b>
            </label>
            <input
              type="range" min={30} max={1800} step={30} value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="h-1 flex-1 accent-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleTemplates.map((t) => (
              <div key={t.name} className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 transition hover:border-indigo-500/60">
                <Preview html={t.html.includes('__DURACAO__') ? t.html.replaceAll('__DURACAO__', String(duration)) : t.html} className="aspect-[9/16]" />
                <div className="p-3">
                  <p className="truncate text-xs font-bold">{t.name}</p>
                  <p className="mb-2 text-[10px] text-neutral-500">{t.category || 'Outras'}</p>
                  <button
                    onClick={() => useTemplate(t.name, t.html)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold hover:bg-indigo-500"
                  >
                    <Plus className="size-3" /> Usar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Nova tela */}
        {newHtml && (
          <section className="mb-10 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-neutral-400">
              <Plus className="size-4" /> Nova tela
            </h2>
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <div>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome da tela"
                  className="mb-3 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
                <textarea
                  value={newHtml}
                  onChange={(e) => setNewHtml(e.target.value)}
                  rows={10}
                  className="mb-3 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 font-mono text-xs outline-none focus:border-indigo-500"
                  placeholder="HTML da tela (página completa)"
                />
                <div className="flex gap-2">
                  <button onClick={createScreen} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold hover:bg-indigo-500">
                    Criar tela
                  </button>
                  <button onClick={() => { setNewHtml(''); setNewName('') }} className="rounded-xl border border-neutral-700 px-4 py-2.5 text-sm hover:bg-neutral-800">
                    Cancelar
                  </button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-neutral-500">Pré-visualização</p>
                <Preview html={newHtml} className="aspect-[9/16]" />
              </div>
            </div>
          </section>
        )}

        {/* Telas */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-neutral-400">Minhas telas</h2>
          {loading ? (
            <p className="text-sm text-neutral-500">Carregando…</p>
          ) : screens.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
              Nenhuma tela criada ainda. Use um modelo acima.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {screens.map((s) => (
                <div key={s.id} className={`overflow-hidden rounded-2xl border relative ${s.is_global ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/40' : 'border-neutral-800 bg-neutral-900'}`}>
                  {s.is_global && (
                    <span className="absolute top-3 right-3 z-10 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow">ATIVA AGORA</span>
                  )}
                  <Preview html={s.html} className="aspect-[9/16] rounded-b-none" />
                  <div className="p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-bold">{s.name}</h3>
                      {s.is_global && <span className="shrink-0 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-300">Global</span>}
                      {!s.is_active && <span className="shrink-0 rounded-full bg-neutral-700 px-2 py-0.5 text-[10px] text-neutral-400">Inativa</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => makeGlobal(s)} title="Tornar global" className="flex items-center gap-1 rounded-lg bg-indigo-600/20 px-2.5 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/40">
                        <Globe className="size-3" />
                      </button>
                      <button onClick={() => toggleScreenActive(s)} className="rounded-lg bg-neutral-800 px-2.5 py-1.5 text-xs font-semibold hover:bg-neutral-700">
                        {s.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => { setEditingId(s.id); setEditHtml(s.html) }} title="Editar" className="rounded-lg bg-neutral-800 px-2.5 py-1.5 text-xs hover:bg-neutral-700">
                        <Pencil className="size-3" />
                      </button>
                      <button onClick={() => deleteScreen(s.id)} title="Excluir" className="rounded-lg bg-red-600/20 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-600/30">
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Editar */}
        {editingId && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-400">Editar tela</h2>
                <button onClick={() => setEditingId(null)} className="rounded-lg p-1.5 hover:bg-neutral-800"><X className="size-4" /></button>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <textarea
                  value={editHtml}
                  onChange={(e) => setEditHtml(e.target.value)}
                  rows={14}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 font-mono text-xs outline-none focus:border-indigo-500"
                />
                <div>
                  <p className="mb-2 text-xs text-neutral-500">Pré-visualização</p>
                  <Preview html={editHtml} className="aspect-[9/16]" />
                  <button onClick={saveEdit} className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold hover:bg-indigo-500">
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dispositivos */}
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-neutral-400">Dispositivos</h2>
          {devices.length === 0 && (
            <p className="rounded-xl border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
              Nenhum dispositivo conectou ainda. Abra <code className="rounded bg-neutral-800 px-1.5 py-0.5">seusite.com/t/qualquercoisa</code> no celular.
            </p>
          )}
          <div className="space-y-3">
            {devices.map((d) => {
              const online = Date.now() - new Date(d.last_seen).getTime() < 120000
              const scr = screens.find((s) => s.id === d.screen_id)
              return (
                <div key={d.device_id} className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`size-2.5 rounded-full ${online ? 'bg-green-500' : 'bg-neutral-600'}`} title={online ? 'Online' : 'Offline'} />
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-mono text-sm font-bold">{d.device_id}</p>
                        <p className="text-xs text-neutral-500">
                          Última conexão: {new Date(d.last_seen).toLocaleString('pt-BR')}
                          {d.screen_id ? ` · ${scr?.name || 'tela própria'}` : ' · tela global'}
                          {!d.screen_active && ' · oculto'}
                        </p>
                      </div>
                      {scr && d.screen_active && <Preview html={scr.html} className="hidden h-16 w-9 sm:block" />}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={d.screen_id ?? 'global'}
                      onChange={(e) => assignScreen(d.device_id, e.target.value === 'global' ? null : Number(e.target.value))}
                      className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
                    >
                      <option value="global">Seguir tela global</option>
                      {screens.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => assignScreen(d.device_id, d.screen_id, !d.screen_active)}
                      className="rounded-lg border border-neutral-700 p-1.5 hover:bg-neutral-800"
                      title={d.screen_active ? 'Remover tela deste dispositivo' : 'Ativar tela'}
                    >
                      <Power className={`size-4 ${d.screen_active ? 'text-green-400' : 'text-neutral-500'}`} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
