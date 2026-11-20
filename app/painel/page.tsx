'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { setCookie } from 'nookies'
import { Monitor, Plus, Trash2, Globe, Power, RefreshCw, Send } from 'lucide-react'

type Screen = { id: number; name: string; html: string; is_global: boolean; is_active: boolean; updated_at: string }
type Device = { device_id: string; screen_id: number | null; screen_active: boolean; label: string | null; last_seen: string }

export default function AdminPanel() {
  const [screens, setScreens] = useState<Screen[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [newName, setNewName] = useState('')
  const [newHtml, setNewHtml] = useState('<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <style>\n    html,body{margin:0;height:100%;background:#000;}\n  </style>\n</head>\n<body>\n  <!-- sua tela aqui -->\n</body>\n</html>')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editHtml, setEditHtml] = useState('')
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
    } catch {}
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

  const applyToAll = async (screenId: number | null) => {
    for (const d of devices) {
      await fetch('/api/screens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: d.device_id, screenId, active: true }),
      })
    }
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
    // limpar atribuições individuais para valer a global
    for (const d of devices) {
      await fetch('/api/screens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: d.device_id, screenId: null, active: true }),
      })
    }
    load()
  }

  const createScreen = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/screens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, html: newHtml, isGlobal: false }),
    })
    setNewName('')
    setNewHtml('<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <style>\n    html,body{margin:0;height:100%;background:#000;}\n  </style>\n</head>\n<body>\n  <!-- sua tela aqui -->\n</body>\n</html>')
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

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
          <h1 className="text-xl font-bold mb-6 text-center">Painel de Telas</h1>
          {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400">{error}</p>}
          <input
            type="password"
            autoFocus
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Senha"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 mb-4 text-sm outline-none focus:border-indigo-500"
          />
          <button type="submit" className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold hover:bg-indigo-500">
            Entrar
          </button>
        </form>
      </div>
    )
  }

  const selected = devices.find((d) => d.device_id === selectedDevice)

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Monitor className="size-6 text-indigo-400" />
            <div>
              <h1 className="text-lg font-bold">Painel de Telas</h1>
              <p className="text-xs text-neutral-500">{devices.length} dispositivo(s) · {screens.length} tela(s)</p>
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
        {/* Nova tela */}
        <section className="mb-10 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-neutral-400">
            <Plus className="size-4" /> Nova tela
          </h2>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da tela (ex: Tela preta)"
            className="mb-3 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          />
          <textarea
            value={newHtml}
            onChange={(e) => setNewHtml(e.target.value)}
            rows={8}
            className="mb-3 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 font-mono text-xs outline-none focus:border-indigo-500"
            placeholder="HTML da tela (página completa)"
          />
          <button onClick={createScreen} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold hover:bg-indigo-500">
            Criar tela
          </button>
        </section>

        {/* Telas */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-neutral-400">Telas</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {screens.map((s) => (
              <div key={s.id} className={`rounded-2xl border p-5 ${s.is_global ? 'border-indigo-500 bg-indigo-950/30' : 'border-neutral-800 bg-neutral-900'}`}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold">{s.name}</h3>
                  {s.is_global && <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-300">Global</span>}
                  {!s.is_active && <span className="rounded-full bg-neutral-700 px-2 py-0.5 text-xs text-neutral-400">Inativa</span>}
                </div>
                <p className="mb-4 line-clamp-2 text-xs text-neutral-500">{s.html.slice(0, 100)}...</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => makeGlobal(s)} className="flex items-center gap-1 rounded-lg bg-indigo-600/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/40">
                    <Globe className="size-3" /> Tornar global
                  </button>
                  <button
                    onClick={async () => { await fetch('/api/screens', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, isActive: !s.is_active }) }); load(); }}
                    className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-700"
                  >
                    {s.is_active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button onClick={() => { setEditingId(s.id); setEditHtml(s.html) }} className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-700">
                    Editar
                  </button>
                  <button onClick={() => deleteScreen(s.id)} className="rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-600/30">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

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
              return (
                <div key={d.device_id} className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`size-2.5 rounded-full ${online ? 'bg-green-500' : 'bg-neutral-600'}`} title={online ? 'Online' : 'Offline'} />
                    <div>
                      <p className="font-mono text-sm font-bold">{d.device_id}</p>
                      <p className="text-xs text-neutral-500">
                        Última conexão: {new Date(d.last_seen).toLocaleString('pt-BR')}
                        {d.screen_id ? ' · tela própria' : ' · tela global'}
                        {!d.screen_active && ' · oculto'}
                      </p>
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
