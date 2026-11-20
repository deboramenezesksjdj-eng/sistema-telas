'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { setCookie } from 'nookies'
import { Monitor, Plus, Trash2, Globe, Power, RefreshCw, LayoutGrid, Pencil, X, Copy, Search, ChevronLeft, ChevronRight, Folder, Smartphone, Wifi } from 'lucide-react'

type Screen = { id: number; name: string; html: string; is_global: boolean; is_active: boolean; updated_at: string }
type Device = { device_id: string; screen_id: number | null; screen_active: boolean; label: string | null; last_seen: string }
type Category = { category: string; count: number }

const DOT_COLORS = ['#6366f1', '#22d3ee', '#3ddc84', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16', '#f97316']

function dotColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return DOT_COLORS[h % DOT_COLORS.length]
}

function Preview({ html, className = '' }: { html: string; className?: string }) {
  const [w, setW] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setW(el.getBoundingClientRect().width)
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
  const [tab, setTab] = useState<'modelos' | 'telas' | 'dispositivos'>('modelos')
  // modelos (biblioteca completa, paginada)
  const [models, setModels] = useState<Screen[]>([])
  const [modelTotal, setModelTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState<Category[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const perPage = 24

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

  const loadModels = useCallback(async (c: string, q: string, p: number) => {
    try {
      const res = await fetch(`/api/screens?list=1&cat=${encodeURIComponent(c)}&q=${encodeURIComponent(q)}&page=${p}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setModels(data.screens || [])
      setModelTotal(data.total || 0)
    } catch {}
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' })
      const data = await res.json()
      setCategories(data.categories || [])
    } catch {}
  }, [])

  useEffect(() => {
    if (!loggedIn) return
    load()
    loadCategories()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [loggedIn, load, loadCategories])

  useEffect(() => {
    if (!loggedIn) return
    const t = setTimeout(() => loadModels(cat, search, page), 250)
    return () => clearTimeout(t)
  }, [loggedIn, cat, search, page, loadModels])

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
    load()
  }

  const useModel = async (s: Screen) => {
    // ativa direto como global (estilo Joystick: clicou no preset = ativou)
    if (!confirm(`Ativar "${s.name}" em todos os dispositivos?`)) return
    await makeGlobal(s)
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
    loadCategories()
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
    loadCategories()
  }

  const copyScript = () => {
    navigator.clipboard.writeText(`<script src="${location.origin}/api/public/joystick/SEU-CODIGO.js" async></script>`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const catCount = (c: string) => categories.find((x) => x.category === c)?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(modelTotal / perPage))

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

  const Sidebar = (
    <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-64 shrink-0 border-r border-neutral-800 bg-neutral-950 lg:sticky lg:top-0 lg:h-screen overflow-y-auto`}>
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-600/30">
            <Monitor className="size-4.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Painel de Telas</p>
            <p className="text-[10px] text-neutral-500">Controle remoto</p>
          </div>
        </div>
      </div>
      {/* Código mestre */}
      <div className="p-4 border-b border-neutral-800">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Código mestre</p>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-2">
          <code className="block overflow-x-auto font-mono text-[9px] text-neutral-400 whitespace-nowrap">
            &lt;script src=&quot;…/api/public/joystick/SEU-CODIGO.js&quot; async&gt;&lt;/script&gt;
          </code>
        </div>
        <button onClick={copyScript} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold hover:bg-indigo-500">
          <Copy className="size-3" /> {copied ? 'Copiado!' : 'Copiar script'}
        </button>
      </div>
      {/* Categorias */}
      <div className="p-4">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Engenharias · Categorias</p>
        <nav className="space-y-0.5">
          <button
            onClick={() => { setCat('Todas'); setPage(1); setSidebarOpen(false) }}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${cat === 'Todas' ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-neutral-400 hover:bg-neutral-900'}`}
          >
            <span className="flex items-center gap-2"><Folder className="size-3.5" /> Todas</span>
            <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px]">{modelTotal || '…'}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.category}
              onClick={() => { setCat(c.category); setPage(1); setSidebarOpen(false) }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${cat === c.category ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-neutral-400 hover:bg-neutral-900'}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: dotColor(c.category) }} />
                <span className="truncate">{c.category}</span>
              </span>
              <span className="ml-1 shrink-0 rounded-full bg-neutral-800 px-2 py-0.5 text-[10px]">{c.count}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      {Sidebar}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg border border-neutral-700 p-2 hover:bg-neutral-800 lg:hidden">
                <LayoutGrid className="size-4" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold">
                  {tab === 'modelos' ? (cat === 'Todas' ? 'Todos os modelos' : cat) : tab === 'telas' ? 'Minhas telas' : 'Dispositivos'}
                </h1>
                <p className="text-[11px] text-neutral-500">
                  {tab === 'modelos' ? `${modelTotal} telas disponíveis` : tab === 'telas' ? `${screens.length} telas criadas` : `${online}/${devices.length} online`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tab === 'modelos' && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500" />
                  <input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                    placeholder="Buscar telas…"
                    className="w-36 rounded-lg border border-neutral-700 bg-neutral-900 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-500 sm:w-52"
                  />
                </div>
              )}
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
          {/* Abas */}
          <div className="flex gap-1 px-4 sm:px-6">
            {([['modelos', 'Modelos', modelTotal], ['telas', 'Minhas telas', screens.length], ['dispositivos', 'Dispositivos', devices.length]] as const).map(([k, label, n]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`border-b-2 px-3.5 py-2 text-xs font-semibold ${tab === k ? 'border-indigo-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
              >
                {label} <span className="text-neutral-600">{n}</span>
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6">
          {/* Dispositivos online resumo */}
          {tab !== 'dispositivos' && devices.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 py-3">
              <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Wifi className="size-3.5 text-green-400" /> {online} online · {devices.length} total
              </span>
              {devices.slice(0, 6).map((d) => {
                const on = Date.now() - new Date(d.last_seen).getTime() < 120000
                const scr = screens.find((s) => s.id === d.screen_id)
                return (
                  <span key={d.device_id} className="flex items-center gap-1 rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[10px] text-neutral-400">
                    <span className={`size-1.5 rounded-full ${on ? 'bg-green-400' : 'bg-neutral-600'}`} />
                    <Smartphone className="size-3" />
                    {scr?.name || 'global'}
                  </span>
                )
              })}
            </div>
          )}

          {tab === 'modelos' && (
            <>
              {/* Slider de duração */}
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
                <label className="text-xs text-neutral-400">
                  Duração do timer (Atualização Android):{' '}
                  <b className="text-indigo-300">{Math.floor(duration / 60)}min {duration % 60 ? `${duration % 60}s` : ''}</b>
                </label>
                <input
                  type="range" min={30} max={1800} step={30} value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="h-1 flex-1 accent-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {models.map((m) => {
                  const catName = m.name.split(' — ')[0]
                  const shortName = m.name.split(' — ').slice(1).join(' — ') || m.name
                  return (
                    <div key={m.id} className={`group overflow-hidden rounded-2xl border bg-neutral-900 transition ${m.is_global ? 'border-indigo-500 ring-1 ring-indigo-500/40' : 'border-neutral-800 hover:border-indigo-500/60'}`}>
                      <div className="relative">
                        <Preview html={m.html.includes('__DURACAO__') ? m.html.replaceAll('__DURACAO__', String(duration)) : m.html} className="aspect-[9/16] rounded-b-none" />
                        {m.is_global && (
                          <span className="absolute top-2 right-2 z-10 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-bold text-white shadow">ATIVA</span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="truncate text-xs font-bold">{shortName}</p>
                        <p className="mb-2 flex items-center gap-1.5 text-[10px] text-neutral-500">
                          <span className="size-1.5 rounded-full" style={{ background: dotColor(catName) }} /> {catName}
                        </p>
                        <button
                          onClick={() => useModel(m)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold hover:bg-indigo-500"
                        >
                          <Plus className="size-3" /> Ativar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-neutral-700 p-2 disabled:opacity-30 hover:bg-neutral-800">
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="text-xs text-neutral-400">Página {page} de {totalPages} · {modelTotal} telas</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-neutral-700 p-2 disabled:opacity-30 hover:bg-neutral-800">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}

              {/* Nova tela custom */}
              <section className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-neutral-400">
                  <Plus className="size-4" /> Criar tela personalizada
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
                      rows={8}
                      className="mb-3 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 font-mono text-xs outline-none focus:border-indigo-500"
                      placeholder="HTML da tela (página completa)"
                    />
                    <button onClick={createScreen} disabled={!newName || !newHtml} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-40">
                      Criar tela
                    </button>
                  </div>
                  <div>
                    <p className="mb-2 text-xs text-neutral-500">Pré-visualização</p>
                    <Preview html={newHtml} className="aspect-[9/16]" />
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === 'telas' && (
            <>
              {loading ? (
                <p className="text-sm text-neutral-500">Carregando…</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {screens.map((s) => (
                    <div key={s.id} className={`relative overflow-hidden rounded-2xl border ${s.is_global ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/40' : 'border-neutral-800 bg-neutral-900'}`}>
                      {s.is_global && (
                        <span className="absolute top-3 right-3 z-10 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow">ATIVA AGORA</span>
                      )}
                      <Preview html={s.html} className="aspect-[9/16] rounded-b-none" />
                      <div className="p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h3 className="truncate text-sm font-bold">{s.name}</h3>
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
            </>
          )}

          {tab === 'dispositivos' && (
            <div className="space-y-3">
              {devices.length === 0 && (
                <p className="rounded-xl border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-500">
                  Nenhum dispositivo conectou ainda. Cole o código mestre no app do celular.
                </p>
              )}
              {devices.map((d) => {
                const on = Date.now() - new Date(d.last_seen).getTime() < 120000
                const scr = screens.find((s) => s.id === d.screen_id)
                return (
                  <div key={d.device_id} className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`size-2.5 rounded-full ${on ? 'bg-green-500' : 'bg-neutral-600'}`} title={on ? 'Online' : 'Offline'} />
                      <div>
                        <p className="font-mono text-sm font-bold">{d.label || d.device_id}</p>
                        <p className="text-xs text-neutral-500">
                          {new Date(d.last_seen).toLocaleString('pt-BR')}
                          {d.screen_id ? ` · ${scr?.name || 'tela própria'}` : ' · tela global'}
                          {!d.screen_active && ' · oculto'}
                        </p>
                      </div>
                      {scr && d.screen_active && <Preview html={scr.html} className="hidden h-16 w-9 sm:block" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={d.screen_id ?? 'global'}
                        onChange={(e) => assignScreen(d.device_id, e.target.value === 'global' ? null : Number(e.target.value))}
                        className="max-w-52 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
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
          )}

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
        </main>
      </div>
    </div>
  )
}
