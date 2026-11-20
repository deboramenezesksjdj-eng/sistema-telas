'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { setCookie } from 'nookies'
import {
  Plus, Search, Copy, X, Eye, Power, Lock, BookOpen, Link2,
  EllipsisVertical, ArrowUpDown, ChevronDown, Layers, Building2,
  Signal, Landmark, Smartphone, CircleDot, MonitorPlay,
} from 'lucide-react'

type Screen = { id: number; name: string; html: string; is_global: boolean; is_active: boolean; updated_at: string }
type Device = { device_id: string; screen_id: number | null; screen_active: boolean; label: string | null; last_seen: string }
type Category = { category: string; count: number }

const CAT_COLORS = ['#26d93b', '#6366f1', '#ffffff', '#ff0000', '#2990ff', '#ffa200', '#cc64f2', '#00ff33', '#fff500', '#ff0000']

function dotColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return CAT_COLORS[h % CAT_COLORS.length]
}

const CAT_ICONS = [Building2, Signal, Landmark, Smartphone, Layers]

function catIcon(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 17 + name.charCodeAt(i)) >>> 0
  const Icon = CAT_ICONS[h % CAT_ICONS.length]
  const tints = ['153,70,236', '245,158,11', '16,185,129', '59,130,246', '85,247,190']
  return { Icon, bg: `rgba(${tints[h % tints.length]},0.145)`, color: tints[h % tints.length] }
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
  const [newName, setNewName] = useState('')
  const [newHtml, setNewHtml] = useState('')
  const [duration, setDuration] = useState(240)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editHtml, setEditHtml] = useState('')
  const [cat, setCat] = useState<string | null>(null) // null = nenhuma engenharia selecionada
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [models, setModels] = useState<Screen[]>([])
  const [modelTotal, setModelTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [categories, setCategories] = useState<Category[]>([])
  const [verHtml, setVerHtml] = useState<Screen | null>(null)
  const perPage = 30

  const globalScreen = useMemo(() => screens.find((s) => s.is_global), [screens])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/screens', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setScreens(data.screens || [])
      setDevices(data.devices || [])
    } catch {}
  }, [])

  const loadModels = useCallback(async (c: string | null, q: string, p: number) => {
    try {
      const res = await fetch(`/api/screens?list=1&cat=${encodeURIComponent(c || '')}&q=${encodeURIComponent(q)}&page=${p}`, { cache: 'no-store' })
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
      const cats: Category[] = data.categories || []
      setCategories(cats)
      // Seleciona automaticamente uma categoria inicial (igual Joystick: nunca lista tudo misturado)
      setCat((prev) => prev ?? (cats.length ? cats.find((c) => c.category === 'ANDROID')?.category ?? cats[0].category : null))
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

  const totalPages = Math.max(1, Math.ceil(modelTotal / perPage))
  const selCat = categories.find((c) => c.category === cat)

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow">
          <h1 className="text-xl font-bold mb-1 text-center">Block Screen</h1>
          <p className="mb-6 text-center text-xs text-muted-foreground">Controle remoto de telas Android</p>
          {error && <p className="mb-4 rounded-md bg-destructive/10 p-3 text-center text-sm text-red-400">{error}</p>}
          <input
            type="password"
            autoFocus
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Senha de acesso"
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 mb-4 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button type="submit" className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow">
            Entrar
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* ============ SIDEBAR (igual Joystick) ============ */}
      <aside className="w-72 shrink-0 border-r border-border/50 bg-card/30 hidden lg:flex flex-col sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="p-4 flex items-center justify-center border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center drop-shadow-[0_0_20px_rgba(168,85,247,0.35)]">
              <MonitorPlay className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">BLOCK SCREEN</span>
          </div>
        </div>

        {/* PENA ativa (dispositivo) */}
        <div className="p-3 pb-0 space-y-2">
          <button className="inline-flex items-center justify-center gap-2 h-8 rounded-md px-3 text-xs w-full border border-blue-500/50 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200 bg-background shadow-sm transition-colors">
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            {devices.length ? `${devices.length} DISPOSITIVO(S)` : 'PLAYFAKE'}
          </button>
        </div>
        <div className="p-3 pb-1">
          <button className="inline-flex items-center justify-center gap-2 h-8 rounded-md px-3 text-xs w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors">
            <Plus className="h-4 w-4 mr-1" /> PENA
          </button>
        </div>

        {/* Penas */}
        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Penas</div>
        <div className="px-2 space-y-1 max-h-[40vh] overflow-y-auto">
          {devices.length === 0 ? (
            <div className="px-2.5 py-2 text-xs text-muted-foreground italic">Nenhum dispositivo conectado ainda.</div>
          ) : (
            devices.map((d) => {
              const on = Date.now() - new Date(d.last_seen).getTime() < 120000
              return (
                <div key={d.device_id} className="group flex items-center gap-2 rounded-md px-2.5 py-2 cursor-pointer text-sm bg-emerald-500/15 text-foreground ring-1 ring-emerald-500/30">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${on ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                  <span className="flex-1 truncate">{d.label || d.device_id}</span>
                  <Link2 className="h-3 w-3 opacity-60" />
                  {on && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background" type="button">
                    <EllipsisVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Categorias de Engenharias */}
        <div className="p-3 pt-4 border-t border-border/50 mt-2 space-y-2">
          <div className="px-3 pt-2 pb-1 -mx-3 text-[10px] font-semibold uppercase tracking-wider text-fuchsia-300/80">Categorias de Engenharias</div>
          <nav className="space-y-1.5">
            <div className="rounded-lg border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/10 to-transparent overflow-hidden">
              <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-fuchsia-400/20">
                <Eye className="h-3.5 w-3.5 text-fuchsia-300" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-fuchsia-200/90 flex-1">Telas ON</span>
                <span className="text-[10px] tabular-nums text-fuchsia-200/70 bg-fuchsia-400/15 rounded-full px-1.5 py-0.5">{globalScreen?.is_active ? 1 : 0}</span>
              </div>
              <div className="px-1.5 py-1 space-y-0.5 max-h-56 overflow-y-auto">
                {globalScreen ? (
                  <div className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer text-sm ${globalScreen.is_active ? 'bg-fuchsia-500/20 text-foreground ring-1 ring-fuchsia-400/40' : 'hover:bg-fuchsia-400/10 text-fuchsia-100/90'}`}>
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: dotColor(globalScreen.name.split(' — ')[0]) }} />
                    <span className="flex-1 truncate">{globalScreen.name}</span>
                    <span className="text-[10px] tabular-nums text-fuchsia-200/80 bg-fuchsia-400/15 rounded-full px-1.5 py-0.5 shrink-0">global</span>
                  </div>
                ) : (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground italic">Nenhuma tela ativa</div>
                )}
              </div>
            </div>
          </nav>
          {/* Lista de engenharias (categorias) */}
          <nav className="flex-1 overflow-y-auto px-0.5 pb-2 space-y-1.5 max-h-[50vh]">
            {categories.map((c) => {
              const ic = catIcon(c.category)
              const active = cat === c.category
              return (
                <button
                  key={c.category}
                  onClick={() => { setCat(active ? null : c.category); setPage(1) }}
                  className={`min-w-0 w-full flex flex-col gap-0.5 px-2.5 py-2 rounded-lg overflow-hidden border bg-gradient-to-br from-card/40 to-transparent transition-colors ${active ? 'border-fuchsia-400/60 ring-1 ring-fuchsia-400/40 bg-fuchsia-500/10' : 'border-border/40 hover:bg-fuchsia-500/5'}`}
                >
                  <div className="grid min-w-0 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-7 w-7 rounded-md flex items-center justify-center shrink-0 shadow-sm" style={{ background: `rgba(${ic.color.replace(/ /g, ',')},0.145)`, color: `rgb(${ic.color})` }}>
                        <ic.Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 text-left text-sm font-semibold truncate">{c.category}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-[10px] tabular-nums text-muted-foreground bg-muted/40 rounded-full px-1.5 py-0.5">{c.count} telas</span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* ============ MAIN ============ */}
      <main className="flex-1 min-w-0 overflow-y-auto max-h-screen">
        <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
          {/* Bloco tutorial */}
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 relative">
            <h2 className="font-semibold flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-primary" /> Seu espaço pessoal
            </h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {`As categorias e engenharias oficiais são só para uso.

Crie suas próprias telas dentro de "Minhas telas".

Aproveite!`}
            </p>
          </div>

          {/* Header Block Screen */}
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/10 to-transparent p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Block Screen</h1>
              <p className="text-sm text-muted-foreground">Catálogo de telas. Selecione uma categoria na lateral e ative o preset desejado de qualquer engenharia.</p>
            </div>
          </div>

          {/* Código mestre */}
          <div data-tour="master-code" className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/40 p-4 shadow">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Código mestre</span>
                <span className="inline-flex items-center rounded-md border border-border px-2.5 py-0.5 text-xs font-medium">PAINEL</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/15 text-primary px-2.5 py-0.5 text-xs font-semibold hover:bg-primary/20 shadow">
                  <CircleDot className="h-3 w-3 mr-1 animate-pulse" />
                  {globalScreen?.is_active ? `Ativo agora: ${globalScreen.name}` : 'Nada ativo'}
                </span>
                <button onClick={desativar} className="inline-flex items-center h-8 rounded-md px-3 text-xs hover:bg-accent transition-colors">
                  Desativar tudo
                </button>
              </div>
            </div>
            <div className="flex items-stretch gap-2">
              <code className="flex-1 min-w-0 rounded-md bg-muted/50 px-3 py-2 text-xs font-mono break-all">
                &lt;script src=&quot;{typeof window !== 'undefined' ? location.origin : ''}/api/public/joystick/SEU-CODIGO.js&quot; async&gt;&lt;/script&gt;
              </code>
              <button onClick={copyScript} className="inline-flex items-center h-9 rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium hover:bg-primary/90 shadow shrink-0 transition-colors">
                <Copy className="h-4 w-4 mr-1.5" /> {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Cole este script uma única vez no site/app. Ele atualiza a tela em tempo real conforme você ativa/desativa um preset de qualquer engenharia.</p>
          </div>

          {/* Busca + Nova tela */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9"
                placeholder="Buscar telas por nome ou descrição…"
              />
            </div>
            <button
              onClick={desativar}
              className="inline-flex items-center h-9 rounded-md border border-input bg-background px-4 text-sm shadow-sm hover:bg-accent transition-colors"
              title="Organizar telas"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" /> Ordenar
            </button>
            <button
              onClick={() => { setCat(null); setTimeout(() => document.getElementById('nova-tela')?.scrollIntoView({ behavior: 'smooth' }), 50) }}
              className="inline-flex items-center h-9 rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium hover:bg-primary/90 shadow"
            >
              <Plus className="h-4 w-4 mr-1" /> Nova tela
            </button>
          </div>

          {/* Contagem + slider duração */}
          <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>
              <span className="font-semibold text-foreground">{modelTotal}</span> telas em <span className="text-foreground">{cat || 'todas as categorias'}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1 text-xs">
              Duração do timer (Android):
              <b className="text-primary">{Math.floor(duration / 60)}min {duration % 60 ? `${duration % 60}s` : ''}</b>
              <input type="range" min={30} max={1800} step={30} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-32 h-1 accent-[var(--primary)]" />
            </span>
          </div>

          {/* Grid de presets */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {models.map((m) => {
              const catName = m.name.split(' — ')[0]
              const shortName = m.name.split(' — ').slice(1).join(' — ') || m.name
              const active = globalScreen?.id === m.id
              return (
                <div
                  key={m.id}
                  className={`rounded-xl border shadow relative overflow-hidden bg-card/40 transition hover:border-border ${active ? 'border-primary ring-1 ring-primary/40 shadow-[0_0_0_3px_rgba(99,102,241,0.08)]' : 'border-border/50'}`}
                >
                  {active && (
                    <span className="inline-flex items-center rounded-md border border-transparent bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-semibold absolute top-3 right-3 z-10 shadow">ATIVO</span>
                  )}
                  <Preview screenId={m.id} title={m.name} />
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{shortName}</p>
                        <p className="text-xs text-muted-foreground truncate">{catName}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setVerHtml(m)} className="inline-flex items-center justify-center h-8 rounded-md border border-input bg-background px-3 text-xs shadow-sm hover:bg-accent transition-colors">
                        <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                      </button>
                      <button onClick={() => useModel(m)} className="inline-flex items-center justify-center gap-2 h-8 rounded-md bg-primary text-primary-foreground px-3 text-xs font-medium hover:bg-primary/90 shadow transition-colors">
                        <Power className="h-3.5 w-3.5 mr-1" /> Ativar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 rounded-md border border-input bg-background px-3 text-xs disabled:opacity-30 hover:bg-accent">
                Anterior
              </button>
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{page}</span> / {totalPages} · {modelTotal} telas
              </span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-md border border-input px-3 py-1.5 text-xs disabled:opacity-30 hover:bg-accent">
                Próxima
              </button>
            </div>
          )}

          {/* Minhas telas */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Minhas telas <span className="text-muted-foreground/60">({screens.length})</span></h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {screens.map((s) => {
                const active = globalScreen?.id === s.id
                return (
                  <div key={s.id} className={`rounded-xl border relative overflow-hidden bg-card/40 transition hover:border-border ${active ? 'border-primary ring-1 ring-primary/40 shadow-[0_0_0_3px_rgba(99,102,241,0.08)]' : 'border-border/50'}`}>
                    {active && (
                      <span className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-semibold absolute top-3 right-3 z-10 shadow">ATIVO</span>
                    )}
                    <Preview screenId={s.id} fallbackHtml={s.html} title={s.name} />
                    <div className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.name.split(' — ')[0]}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setVerHtml(s)} className="inline-flex items-center justify-center h-8 rounded-md border border-input bg-background text-xs shadow-sm hover:bg-accent transition-colors">
                          <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                        </button>
                        <button onClick={() => makeGlobal(s)} className="inline-flex items-center justify-center gap-1.5 h-8 rounded-md bg-primary text-primary-foreground px-3 text-xs font-medium hover:bg-primary/90 shadow">
                          <Power className="h-3.5 w-3.5 mr-1" /> {active ? 'Ativa' : 'Ativar'}
                        </button>
                        <button onClick={async () => { const html = s.html ?? (await fetchHtml(s.id)); setEditingId(s.id); setEditHtml(html || '') }} className="rounded-md border border-input bg-background h-8 text-xs hover:bg-accent transition-colors">
                          Editar
                        </button>
                        <button onClick={() => deleteScreen(s.id)} className="rounded-md bg-destructive/20 text-red-400 h-8 px-3 text-xs font-medium hover:bg-destructive/30 transition-colors">
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Modal Ver */}
          {verHtml && (
            <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
              <div className="rounded-xl border border-border bg-card p-5 w-full max-w-md shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{verHtml.name}</h2>
                  <button onClick={() => setVerHtml(null)} className="rounded-md p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
                </div>
                <div className="mx-auto w-[260px]">
                  <Preview screenId={verHtml.id} fallbackHtml={verHtml.html} title={verHtml.name} />
                </div>
                <button onClick={() => { useModel(verHtml); setVerHtml(null) }} className="mt-4 w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow">
                  Ativar esta tela
                </button>
              </div>
            </div>
          )}

          {/* Dispositivos */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Dispositivos ({devices.length})</h2>
            {devices.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
                Nenhum dispositivo conectou ainda. Cole o código mestre no app do celular.
              </p>
            ) : (
              <div className="space-y-3">
                {devices.map((d) => {
                  const on = Date.now() - new Date(d.last_seen).getTime() < 120000
                  const scr = screens.find((s) => s.id === d.screen_id)
                  return (
                    <div key={d.device_id} className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card/40 p-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${on ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                        <div>
                          <p className="font-mono text-sm font-semibold">{d.label || d.device_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(d.last_seen).toLocaleString('pt-BR')}
                            {d.screen_id ? ` · ${screens.find((s) => s.id === d.screen_id)?.name || ''}` : ' · tela global'}
                          </p>
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
                        className="max-w-56 h-8 rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
          </section>
        </div>
      </main>

      {/* Modal editar */}
      {editingId && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl border border-border bg-card p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Editar tela</h2>
              <button onClick={() => setEditingId(null)} className="rounded-md p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <textarea
                value={editHtml}
                onChange={(e) => setEditHtml(e.target.value)}
                rows={14}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2.5 font-mono text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Pré-visualização</p>
                <Preview fallbackHtml={editHtml} />
                <button onClick={saveEdit} className="mt-3 w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow">
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
