'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Search, Copy, X, Eye, Power, LogOut, Upload,
  ChevronLeft, ChevronRight, Smartphone, MonitorPlay, Shield, Radio,
} from 'lucide-react'

type Screen = { id: number; name: string; html: string; is_global: boolean; is_active: boolean; updated_at: string }
type Device = { device_id: string; screen_id: number | null; screen_active: boolean; label: string | null; last_seen: string }
type Category = { category: string; count: number }

const SEP = ' — '

function splitName(name: string) {
  const i = name.indexOf(SEP)
  if (i === -1) return { cat: name, short: name }
  return { cat: name.slice(0, i), short: name.slice(i + SEP.length) }
}

// Preview que busca o HTML sob demanda quando entra na viewport (lista vem sem html)
function Preview({ screenId, fallbackHtml, title = 'preview' }: { screenId?: number; fallbackHtml?: string; title?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  const [visible, setVisible] = useState(false)
  const [html, setHtml] = useState<string | undefined>(fallbackHtml)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 390))
    ro.observe(el)
    let io: IntersectionObserver | null = null
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io?.disconnect()
        }
      }, { rootMargin: '200px' })
      io.observe(el)
    } else setVisible(true)
    return () => { ro.disconnect(); io?.disconnect() }
  }, [])

  useEffect(() => {
    if (!visible || html || !screenId) return
    let alive = true
    fetch(`/api/screens/${screenId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.html) setHtml(d.html) })
      .catch(() => {})
    return () => { alive = false }
  }, [visible, html, screenId])

  return (
    <div ref={wrapRef} className="relative aspect-[9/16] w-full bg-black overflow-hidden">
      {html ? (
        <iframe
          srcDoc={html}
          sandbox="allow-scripts"
          loading="lazy"
          title={title}
          className="absolute left-0 top-0 border-0 pointer-events-none"
          style={{ width: 390, height: 693, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
        </div>
      )}
    </div>
  )
}

export default function AdminPanel() {
  const [screens, setScreens] = useState<Screen[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [duration, setDuration] = useState(240)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editHtml, setEditHtml] = useState('')
  const [cat, setCat] = useState<string>('Todas')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [me, setMe] = useState<{ id: number; email: string; name: string | null; role: string } | null>(null)
  const [checking, setChecking] = useState(true)
  const [models, setModels] = useState<Screen[]>([])
  const [modelTotal, setModelTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState<Category[]>([])
  const [verHtml, setVerHtml] = useState<Screen | null>(null)
  const [novaOpen, setNovaOpen] = useState(false)
  const [showAllCats, setShowAllCats] = useState(false)
  const [newName, setNewName] = useState('')
  const [newHtml, setNewHtml] = useState('')
  const perPage = 30

  const globalScreen = useMemo(() => screens.find((s) => s.is_global), [screens])
  const masterToken = me ? `bs-${me.id}` : ''

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/screens', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setScreens(data.screens || [])
      setDevices(data.devices || [])
    } catch {}
  }, [])

  const loadModels = useCallback(async (c: string, q: string, p: number) => {
    try {
      const res = await fetch(`/api/screens?list=1&cat=${encodeURIComponent(c === 'Todas' ? '' : c)}&q=${encodeURIComponent(q)}&page=${p}`, { cache: 'no-store' })
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

  // Sessão via cookie telasSession (/login). Admin e usuário logado acessam.
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setMe(d.user)
        else window.location.href = '/login'
      })
      .catch(() => { window.location.href = '/login' })
      .finally(() => setChecking(false))
  }, [])

  const loggedIn = !!me

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

  const makeGlobal = async (s: Screen) => {
    await fetch('/api/screens', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, isGlobal: true }),
    })
    load()
  }

  const desativar = async () => {
    if (!globalScreen) return
    await fetch('/api/screens', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: globalScreen.id, isActive: false }),
    })
    load()
  }

  const fetchHtml = async (id: number): Promise<string | null> => {
    try {
      const res = await fetch(`/api/screens/${id}`, { cache: 'no-store' })
      if (!res.ok) return null
      const d = await res.json()
      return d.html || null
    } catch { return null }
  }

  const useModel = async (s: Screen) => {
    let html = s.html ?? (await fetchHtml(s.id))
    if (!html) return
    // Substitui o placeholder de duração antes de ativar (telas com timer configurável)
    if (html.includes('__DURACAO__')) {
      html = html.replaceAll('__DURACAO__', String(duration))
      await fetch('/api/screens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, html }),
      })
    }
    makeGlobal({ ...s, html })
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
    setNovaOpen(false)
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

  const scriptTag = `<script src="${typeof window !== 'undefined' ? location.origin : ''}/api/public/joystick/${masterToken}.js" async></script>`

  const copyScript = () => {
    navigator.clipboard.writeText(scriptTag)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const logout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE' })
    window.location.href = '/login'
  }

  const totalPages = Math.max(1, Math.ceil(modelTotal / perPage))

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080d] text-zinc-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />
      </div>
    )
  }

  const masterCode = `<script src="${typeof window !== 'undefined' ? location.origin : ''}/api/public/joystick/${masterToken}.js" async></script>`

  return (
    <div className="min-h-screen bg-[#08080d] text-zinc-100">
      {/* ===== BARRA SUPERIOR (layout próprio, sem sidebar) ===== */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#08080d]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-600/25">
              <MonitorPlay className="h-4 w-4 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-tight text-white">BLOCK SCREEN</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">controle de telas</div>
            </div>
          </div>

          {/* busca no topo */}
          <div className="relative ml-auto hidden w-72 md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="h-9 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/60"
              placeholder="Buscar tela..."
            />
          </div>

          {/* dispositivos */}
          <div className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-400 sm:flex">
            <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
            {devices.filter((d) => Date.now() - new Date(d.last_seen).getTime() < 120000).length} online
            <span className="text-zinc-600">/ {devices.length}</span>
          </div>

          {/* usuário */}
          <div className="flex items-center gap-2">
            {me?.role === 'admin' && (
              <a href="/admin" className="hidden items-center gap-1.5 rounded-xl border border-violet-500/40 px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/10 sm:flex">
                <Shield className="h-3.5 w-3.5" /> Admin
              </a>
            )}
            <span className="hidden text-xs text-zinc-400 lg:inline">{me?.name || me?.email}</span>
            <button onClick={logout} title="Sair" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* faixa de categorias: 3 linhas visíveis + expandir */}
        <div className="mx-auto max-w-7xl px-4 pb-3">
          <div className={`flex flex-wrap items-center gap-2 overflow-hidden transition-all ${showAllCats ? 'max-h-[60vh] overflow-y-auto' : 'max-h-[104px]'}`}>
            <button
              onClick={() => { setCat('Todas'); setPage(1) }}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${cat === 'Todas' ? 'bg-emerald-500 text-white shadow shadow-emerald-500/30' : 'border border-white/10 text-zinc-400 hover:border-white/25 hover:text-white'}`}
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c.category}
                onClick={() => { setCat(c.category); setPage(1) }}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${cat === c.category ? 'bg-emerald-500 text-white shadow shadow-emerald-500/30' : 'border border-white/10 text-zinc-400 hover:border-white/25 hover:text-white'}`}
              >
                {c.category} <span className="opacity-60">{c.count}</span>
              </button>
            ))}
          </div>
          {categories.length > 8 && (
            <button
              onClick={() => setShowAllCats((v) => !v)}
              className="mt-2 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
            >
              {showAllCats ? '− Mostrar menos' : `+ Ver todas as ${categories.length} categorias`}
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-6">
        {/* ===== linha de status ===== */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-[#0e1512] to-[#0a0d14] p-5">
          <div className="flex items-center gap-4">
            <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ${globalScreen?.is_active ? 'bg-emerald-500/15' : 'bg-white/5'}`}>
              <Radio className={`h-5 w-5 ${globalScreen?.is_active ? 'text-emerald-400' : 'text-zinc-500'}`} />
              {globalScreen?.is_active && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full bg-emerald-400 ring-2 ring-[#08080d]" />}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Transmitindo agora</div>
              <div className="font-bold text-white">
                {globalScreen?.is_active ? globalScreen.name : 'Nenhuma tela ativa'}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-400">
              Timer: <b className="text-emerald-400">{Math.floor(duration / 60)}min{duration % 60 ? ` ${duration % 60}s` : ''}</b>
              <input type="range" min={30} max={1800} step={30} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="ml-2 h-1 w-28 accent-emerald-500" />
            </span>
            {globalScreen && (
              <button onClick={desativar} className="rounded-xl border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10">
                Desligar
              </button>
            )}
            <button onClick={() => setNovaOpen(true)} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 hover:brightness-110">
              + Nova tela
            </button>
          </div>
        </div>

        {/* ===== código de instalação ===== */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-[#0c0c14] p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">Código de instalação</h2>
              <p className="text-xs text-zinc-500">Cole uma única vez no site/app. As telas trocam em tempo real quando você ativa outra — sem recarregar nada.</p>
            </div>
            <button onClick={copyScript} className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20">
              <Copy className="h-3.5 w-3.5" /> {copied ? 'Copiado!' : 'Copiar código'}
            </button>
          </div>
          <code className="block overflow-x-auto rounded-xl bg-black/60 px-4 py-3 font-mono text-xs text-emerald-300/90">
            {masterCode}
          </code>
          {devices.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Aparelhos conectados</div>
              {devices.map((d) => {
                const on = Date.now() - new Date(d.last_seen).getTime() < 120000
                return (
                  <div key={d.device_id} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full ${on ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                      <div>
                        <span className="text-xs font-semibold text-white">{d.label || d.device_id}</span>
                        <span className="ml-2 text-[10px] text-zinc-500">{new Date(d.last_seen).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                    <select
                      value={d.screen_id ?? 'global'}
                      onChange={(e) => {
                        const v = e.target.value === 'global' ? null : Number(e.target.value)
                        fetch('/api/screens', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ deviceId: d.device_id, screenId: v, active: true }),
                        }).then(load)
                      }}
                      className="h-8 max-w-56 rounded-lg border border-white/10 bg-black/60 px-2 text-xs text-white outline-none focus:border-emerald-500/60"
                    >
                      <option value="global">Seguir tela global</option>
                      {screens.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ===== catálogo ===== */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            {cat === 'Todas' ? 'Todas as telas' : cat}
            <span className="ml-2 text-xs font-medium text-zinc-500">{modelTotal} disponíveis</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {models.map((m) => {
            const { cat: catName, short: shortName } = splitName(m.name)
            const active = globalScreen?.id === m.id
            return (
              <div
                key={m.id}
                className={`group relative overflow-hidden rounded-2xl border bg-[#0c0c14] transition ${active ? 'border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.15)]' : 'border-white/10 hover:border-white/25'}`}
              >
                {active && (
                  <span className="absolute left-3 top-3 z-10 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">NO AR</span>
                )}
                <Preview screenId={m.id} title={m.name} />
                <div className="p-3">
                  <p className="truncate text-xs font-semibold text-white">{shortName}</p>
                  <p className="mb-2 truncate text-[10px] text-zinc-500">{catName}</p>
                  <div className="flex gap-1.5">
                    <button onClick={() => setVerHtml(m)} className="flex h-8 flex-1 items-center justify-center rounded-lg border border-white/10 text-[11px] font-semibold text-zinc-300 hover:bg-white/5">
                      <Eye className="mr-1 h-3 w-3" /> Ver
                    </button>
                    <button onClick={() => useModel(m)} className={`flex h-8 flex-1 items-center justify-center rounded-lg text-[11px] font-bold ${active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-500 text-white hover:bg-emerald-400'}`}>
                      <Power className="mr-1 h-3 w-3" /> {active ? 'No ar' : 'Ativar'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* paginação */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-zinc-400 disabled:opacity-30 hover:bg-white/5">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-zinc-500"><b className="text-white">{page}</b> de {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-zinc-400 disabled:opacity-30 hover:bg-white/5">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ===== minhas telas ===== */}
        <section className="mt-10">
          <h2 className="mb-3 text-base font-bold text-white">Minhas telas <span className="text-xs font-medium text-zinc-500">({screens.length})</span></h2>
          {screens.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-zinc-500">
              Você ainda não criou telas. Clique em "+ Nova tela" para começar.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {screens.map((s) => {
                const active = globalScreen?.id === s.id
                return (
                  <div key={s.id} className={`relative overflow-hidden rounded-2xl border bg-[#0c0c14] transition ${active ? 'border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.15)]' : 'border-white/10 hover:border-white/25'}`}>
                    {active && <span className="absolute left-3 top-3 z-10 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">NO AR</span>}
                    <Preview screenId={s.id} fallbackHtml={s.html} title={s.name} />
                    <div className="p-3">
                      <p className="mb-2 truncate text-xs font-semibold text-white">{s.name}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button onClick={() => setVerHtml(s)} className="flex h-8 items-center justify-center rounded-lg border border-white/10 text-[11px] font-semibold text-zinc-300 hover:bg-white/5">Ver</button>
                        <button onClick={() => makeGlobal(s)} className={`flex h-8 items-center justify-center rounded-lg text-[11px] font-bold ${active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-500 text-white hover:bg-emerald-400'}`}>{active ? 'No ar' : 'Ativar'}</button>
                        <button onClick={async () => { const html = s.html ?? (await fetchHtml(s.id)); setEditingId(s.id); setEditHtml(html || '') }} className="h-8 rounded-lg border border-white/10 text-[11px] font-semibold text-zinc-300 hover:bg-white/5">Editar</button>
                        <button onClick={() => deleteScreen(s.id)} className="rounded-lg bg-red-500/15 text-[11px] font-semibold text-red-400 hover:bg-red-500/25">Excluir</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* modal nova tela */}
      {novaOpen && (
        <NewScreenModal onClose={() => setNovaOpen(false)} onCreated={() => { load(); loadCategories() }} />
      )}

      {/* modal ver */}
      {verHtml && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4" onClick={(e) => { if (e.target === e.currentTarget) setVerHtml(null) }}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0c0c14] p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">{verHtml.name}</h2>
              <button onClick={() => setVerHtml(null)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="mx-auto w-[260px]">
              <Preview screenId={verHtml.id} fallbackHtml={verHtml.html} title={verHtml.name} />
            </div>
            <button onClick={() => { useModel(verHtml); setVerHtml(null) }} className="mt-4 h-10 w-full rounded-xl bg-emerald-500 text-sm font-bold text-white hover:bg-emerald-400">
              Colocar no ar
            </button>
          </div>
        </div>
      )}

      {/* modal editar */}
      {editingId && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4" onClick={(e) => { if (e.target === e.currentTarget) setEditingId(null) }}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-white/10 bg-[#0c0c14] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Editar tela</h2>
              <button onClick={() => setEditingId(null)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <textarea
                value={editHtml}
                onChange={(e) => setEditHtml(e.target.value)}
                rows={14}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-xs text-white outline-none focus:border-emerald-500/60"
              />
              <div>
                <p className="mb-2 text-xs text-zinc-500">Pré-visualização</p>
                <Preview fallbackHtml={editHtml} />
                <button onClick={saveEdit} className="mt-3 h-10 w-full rounded-xl bg-emerald-500 text-sm font-bold text-white hover:bg-emerald-400">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== Construtor de tela personalizada =====
// Gera HTML no mesmo padrão das telas oficiais (Space Grotesk, fundo transparente,
// animações) com: logo, modo (facial/digital/carregando/erro/aviso) e textos livres.
type BuilderMode = 'facial' | 'digital' | 'carregando' | 'erro' | 'aviso'

function buildScreenHtml(o: { mode: BuilderMode; logoUrl: string; title: string; subtitle: string; highlight: string; loadingText: string }): string {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const { mode, logoUrl, title, subtitle, highlight, loadingText } = o

  if (mode === 'facial') {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>${esc(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif; background: transparent !important; overflow: hidden; user-select: none; -webkit-user-select: none; }
        body { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; gap: 40px; }
        .logo-wrap { position: absolute; top: 40px; left: 0; width: 100%; display: flex; justify-content: center; }
        .logo { width: 160px; height: auto; filter: drop-shadow(0 2px 10px rgba(0, 180, 216, 0.4)); }
        .camera-ring { width: min(75vw, 320px); height: min(75vw, 320px); border: 6px solid #ffffff; border-radius: 50%; background: transparent; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); animation: aproximarAnel 2.5s infinite ease-in-out; }
        @keyframes aproximarAnel { 0%, 100% { transform: scale(0.95); opacity: 0.8; } 50% { transform: scale(1.08); opacity: 1; border-width: 8px; } }
        .command-text { font-size: 22px; font-weight: 500; color: #ffffff; text-align: center; letter-spacing: 0.3px; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6); }
    </style>
</head>
<body>
    ${logoUrl ? `<div class="logo-wrap"><img class="logo" src="${esc(logoUrl)}" alt="Logo"></div>` : ''}
    <div class="camera-ring"></div>
    <div class="command-text">${esc(title)}</div>
</body>
</html>`
  }

  if (mode === 'digital') {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
    <title>${esc(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif; background: transparent !important; overflow: hidden; user-select: none; -webkit-user-select: none; }
        body { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }
        .header { position: absolute; top: 40px; left: 0; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px; z-index: 10; }
        .logo { width: 160px; height: auto; filter: drop-shadow(0 2px 10px rgba(0, 180, 216, 0.4)); }
        .header-title { font-size: 14px; font-weight: 600; color: #00b4d8; text-transform: uppercase; letter-spacing: 1.5px; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8); }
        .prompt-container { display: flex; flex-direction: column; align-items: center; gap: 24px; background: transparent; padding: 0 24px; max-width: 380px; text-align: center; margin-top: 60px; animation: slideUp 0.6s ease-out forwards; }
        .icon-wrapper { display: flex; justify-content: center; align-items: center; width: 64px; height: 64px; background: rgba(0, 180, 216, 0.1); border: 1px solid rgba(0, 180, 216, 0.3); border-radius: 50%; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); }
        .icon-fingerprint { width: 32px; height: 32px; color: #00b4d8; filter: drop-shadow(0 2px 4px rgba(0, 180, 216, 0.4)); }
        .prompt-title { font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.2px; margin-bottom: 12px; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8); }
        .prompt-text { font-size: 16px; font-weight: 400; color: rgba(255, 255, 255, 0.95); line-height: 1.5; letter-spacing: 0.2px; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8); }
        .highlight { color: #00b4d8; font-weight: 600; text-shadow: 0 2px 8px rgba(0, 180, 216, 0.5), 0 2px 8px rgba(0, 0, 0, 0.8); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div class="header">
        ${logoUrl ? `<img class="logo" src="${esc(logoUrl)}" alt="Logo">` : ''}
        <div class="header-title">Segurança do Dispositivo</div>
    </div>
    <div class="prompt-container">
        <div class="icon-wrapper">
            <svg class="icon-fingerprint" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10"/>
                <path d="M5 15.5C5 13.57 6.57 12 8.5 12c1.45 0 2.69.88 3.22 2.15"/>
                <path d="M9 19.5v-1c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v1"/>
                <path d="M14 12c0-1.1.9-2 2-2s2 .9 2 2v2.5"/>
                <path d="M12 7.5a4.5 4.5 0 0 0-4.5 4.5v1"/>
                <path d="M16 19.5v-1.5"/>
            </svg>
        </div>
        <div>
            <h2 class="prompt-title">${esc(title)}</h2>
            <p class="prompt-text">${esc(subtitle)}${highlight ? ` <span class="highlight">${esc(highlight)}</span>` : ''}</p>
        </div>
    </div>
</body>
</html>`
  }

  // carregando / erro / aviso — card central com logo + ícone + textos
  let stageInner: string
  let stageCss: string
  if (mode === 'carregando') {
    stageCss = `.security-stage { position: relative; width: 100px; height: 100px; margin-bottom: 24px; display: flex; justify-content: center; align-items: center; border-radius: 50%; }
        .pulse-ring { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid #00b4d8; animation: expandPulse 2s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
        .pulse-ring:nth-child(2) { animation-delay: 1s; }
        @keyframes expandPulse { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
        .spinner { width: 50px; height: 50px; border: 3px solid rgba(0, 180, 216, 0.2); border-top-color: #00b4d8; border-radius: 50%; animation: spin 1s linear infinite; z-index: 2; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-text { font-size: 14px; font-weight: 500; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8); display: flex; align-items: center; gap: 6px; }`
    stageInner = '<div class="pulse-ring"></div><div class="pulse-ring"></div><div class="spinner"></div>'
  } else if (mode === 'erro') {
    stageCss = `.security-stage { position: relative; width: 100px; height: 100px; margin-bottom: 24px; display: flex; justify-content: center; align-items: center; border-radius: 50%; animation: shakeError 0.5s cubic-bezier(.36,.07,.19,.97) both; animation-delay: 0.3s; }
        @keyframes shakeError { 10%, 90% { transform: translate3d(-2px, 0, 0); } 20%, 80% { transform: translate3d(4px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-6px, 0, 0); } 40%, 60% { transform: translate3d(6px, 0, 0); } }
        .pulse-ring { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid #ff4d4d; animation: expandPulse 2s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
        .pulse-ring:nth-child(2) { animation-delay: 1s; }
        @keyframes expandPulse { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
        .shield-icon { width: 50px; height: 50px; color: #ff4d4d; z-index: 2; filter: drop-shadow(0 0 10px rgba(255, 77, 77, 0.8)); }
        .loading-text { font-size: 14px; font-weight: 500; color: #ff4d4d; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8); display: flex; align-items: center; gap: 6px; }`
    stageInner = `<div class="pulse-ring"></div><div class="pulse-ring"></div>
            <svg class="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
            </svg>`
  } else {
    stageCss = `.stage-icon { display: flex; justify-content: center; align-items: center; width: 100px; height: 100px; margin-bottom: 24px; border-radius: 50%; background: rgba(255, 183, 3, 0.08); border: 1px solid rgba(255, 183, 3, 0.3); }
        .stage-icon svg { width: 48px; height: 48px; color: #ffb703; filter: drop-shadow(0 0 10px rgba(255, 183, 3, 0.5)); }
        .loading-text { font-size: 14px; font-weight: 500; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8); display: flex; align-items: center; gap: 6px; }`
    stageInner = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
            </svg>`
  }

  const loadingBlock = loadingText
    ? `<div class="loading-text">
                ${esc(loadingText)}
                <span class="dots"><span>.</span><span>.</span><span>.</span></span>
            </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
    <title>${esc(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; background: transparent !important; overflow: hidden; font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif; user-select: none; -webkit-user-select: none; }
        body { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
        .card { width: 100%; max-width: 420px; display: flex; flex-direction: column; align-items: center; text-align: center; background: transparent; border: none; box-shadow: none; animation: slideUpFade 0.8s ease-out forwards; }
        @keyframes slideUpFade { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .logo { width: 180px; height: auto; margin-bottom: 40px; filter: drop-shadow(0 4px 15px rgba(0, 180, 216, 0.4)); animation: floatLogo 4s ease-in-out infinite; }
        @keyframes floatLogo { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        ${stageCss}
        .title { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px; letter-spacing: 0.5px; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8); }
        .subtitle { font-size: 15px; line-height: 1.6; color: rgba(255, 255, 255, 0.9); margin-bottom: 24px; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8); }
        .highlight-text { color: #ffb703; font-weight: 600; text-shadow: 0 2px 10px rgba(255, 183, 3, 0.4), 0 2px 8px rgba(0,0,0,0.8); display: block; margin-top: 10px; }
        .dots span { animation: loadingDots 1.4s infinite; opacity: 0; }
        .dots span:nth-child(2) { animation-delay: 0.2s; }
        .dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes loadingDots { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
    </style>
</head>
<body>
    <div class="card">
        ${logoUrl ? `<img class="logo" src="${esc(logoUrl)}" alt="Logo">` : ''}
        <div class="${mode === 'aviso' ? 'stage-icon' : 'security-stage'}">${stageInner}</div>
        <h1 class="title">${esc(title)}</h1>
        ${subtitle || highlight ? `<p class="subtitle">
            ${esc(subtitle)}
            ${highlight ? `<span class="highlight-text">${esc(highlight)}</span>` : ''}
        </p>` : ''}
        ${loadingBlock}
    </div>
</body>
</html>`
}

function NewScreenModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [mode, setMode] = useState<BuilderMode>('facial')
  const [logoUrl, setLogoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('Aproxime o rosto')
  const [subtitle, setSubtitle] = useState('')
  const [highlight, setHighlight] = useState('')
  const [loadingText, setLoadingText] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const modes: { key: BuilderMode; label: string; desc: string }[] = [
    { key: 'facial', label: 'Facial', desc: 'Anel de câmera — aproxime o rosto' },
    { key: 'digital', label: 'Digital', desc: 'Sensor biométrico do aparelho' },
    { key: 'carregando', label: 'Carregando', desc: 'Spinner de processamento' },
    { key: 'erro', label: 'Erro', desc: 'Alerta de falha em vermelho' },
    { key: 'aviso', label: 'Aviso', desc: 'Aviso com ícone de atenção' },
  ]

  const defaultTitles: Record<BuilderMode, string> = {
    facial: 'Aproxime o rosto',
    digital: 'Autenticação Exigida',
    carregando: 'Verificando',
    erro: 'Falha na Autenticação',
    aviso: 'Atenção',
  }

  const pickMode = (m: BuilderMode) => { setMode(m); setTitle(defaultTitles[m]) }

  const uploadFile = (file: File) => {
    setUploading(true); setErr('')
    const fd = new FormData()
    fd.append('file', file)
    fetch('/api/upload-logo', { method: 'POST', body: fd })
      .then((r) => r.json())
      .then((d) => { if (d.url) setLogoUrl(d.url); else setErr(d.error || 'Erro no upload') })
      .catch(() => setErr('Erro no upload'))
      .finally(() => setUploading(false))
  }

  const previewHtml = useMemo(
    () => buildScreenHtml({ mode, logoUrl, title, subtitle, highlight, loadingText }),
    [mode, logoUrl, title, subtitle, highlight, loadingText],
  )

  const save = async () => {
    if (!name.trim() || saving) return
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/screens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Minhas telas — ${name.trim()}`, html: previewHtml, isGlobal: false }),
      })
      if (!res.ok) throw new Error()
      onCreated()
      onClose()
    } catch { setErr('Erro ao criar tela') }
    setSaving(false)
  }

  const inputCls = 'w-full rounded-xl border border-white/10 bg-black/40 px-3.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/60'

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0c14] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Nova tela personalizada</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_200px]">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Tipo de tela</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {modes.map((m) => (
                  <button key={m.key} onClick={() => pickMode(m.key)}
                    className={`rounded-xl border p-3 text-left transition ${mode === m.key ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:border-white/25'}`}>
                    <div className={`text-xs font-bold ${mode === m.key ? 'text-emerald-300' : 'text-white'}`}>{m.label}</div>
                    <div className="mt-0.5 text-[10px] leading-tight text-zinc-500">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Logo</label>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-white/20 text-zinc-600"><Upload className="h-5 w-5" /></div>
                )}
                <div>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20">
                    <Upload className="h-3.5 w-3.5" /> {uploading ? 'Enviando...' : logoUrl ? 'Trocar logo' : 'Enviar logo'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.currentTarget.value = '' }} />
                  </label>
                  {logoUrl && <button onClick={() => setLogoUrl('')} className="ml-2 text-[11px] text-zinc-500 hover:text-red-400">remover</button>}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Texto principal</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={`h-10 ${inputCls}`} />
              </div>
              {mode !== 'facial' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Texto de baixo</label>
                  <textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={2}
                    className={`${inputCls} py-2.5`} />
                </div>
              )}
              {mode !== 'facial' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Destaque (opcional, em amarelo)</label>
                  <input value={highlight} onChange={(e) => setHighlight(e.target.value)} placeholder="Ex.: Refaça o procedimento"
                    className={`h-10 ${inputCls}`} />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Linha final animada (opcional)</label>
                <input value={loadingText} onChange={(e) => setLoadingText(e.target.value)} placeholder="Ex.: Preparando nova tentativa"
                  className={`h-10 ${inputCls}`} />
              </div>
            </div>

            {err && <p className="text-xs text-red-400">{err}</p>}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Pré-visualização</p>
            <div className="mx-auto w-[180px] overflow-hidden rounded-2xl border border-white/10" style={{ background: 'linear-gradient(160deg,#1a3a2f,#0c1a2e)' }}>
              <Preview fallbackHtml={previewHtml} title="preview" />
            </div>
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">Nome da tela</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Minha tela" required
                className={`h-10 ${inputCls}`} />
            </div>
            <button onClick={save} disabled={!name.trim() || saving}
              className="mt-3 h-10 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-bold text-white hover:brightness-110 disabled:opacity-40">
              {saving ? 'Criando...' : 'Criar tela'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
