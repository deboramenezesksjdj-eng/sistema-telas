'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MonitorPlay, Shield, Trash2, Ban, KeyRound, Plus, CheckCircle2 } from 'lucide-react'

type UserRow = {
  id: number
  email: string
  name: string | null
  role: 'admin' | 'user'
  blocked: boolean
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const [me, setMe] = useState<UserRow | null>(null)
  const [ready, setReady] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [msg, setMsg] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [nName, setNName] = useState('')
  const [nEmail, setNEmail] = useState('')
  const [nPwd, setNPwd] = useState('')
  const [editPwd, setEditPwd] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    const [meRes, uRes] = await Promise.all([fetch('/api/auth/me'), fetch('/api/auth/users')])
    const meData = await meRes.json()
    if (!meRes.ok || meData.user?.role !== 'admin') {
      router.replace(meData.user ? '/painel' : '/login')
      return
    }
    setMe(meData.user)
    if (uRes.ok) setUsers((await uRes.json()).users)
    setReady(true)
  }, [router])

  useEffect(() => { load() }, [load])

  const put = async (body: Record<string, unknown>) => {
    setMsg('')
    const res = await fetch('/api/auth/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setMsg(res.ok ? 'Salvo!' : data.error || 'Erro')
    if (res.ok) load()
  }

  const del = async (id: number) => {
    setMsg('')
    const res = await fetch('/api/auth/users?id=' + id, { method: 'DELETE' })
    const data = await res.json()
    setMsg(res.ok ? 'Usuário excluído' : data.error || 'Erro')
    if (res.ok) load()
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nName, email: nEmail, password: nPwd }) })
    const data = await res.json()
    if (res.ok) {
      setShowNew(false); setNName(''); setNEmail(''); setNPwd('')
      setMsg('Usuário criado!')
      load()
    } else {
      setMsg(data.error || 'Erro no cadastro')
    }
  }

  const logout = async () => { await fetch('/api/auth/me', { method: 'DELETE' }); window.location.href = '/login' }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <MonitorPlay className="h-4 w-4 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-lg font-extrabold text-transparent">Block Screen</span>
            <span className="ml-1 flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              <Shield className="h-3 w-3" /> Admin
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden sm:inline">{me?.email}</span>
            <Link href="/painel" className="rounded-md px-3 py-1.5 font-semibold text-foreground hover:bg-card">Painel</Link>
            <button onClick={logout} className="rounded-md px-3 py-1.5 hover:bg-card">Sair</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Administração de logins</h1>
            <p className="text-xs text-muted-foreground">{users.length} usuário(s) cadastrado(s)</p>
          </div>
          <button onClick={() => setShowNew(v => !v)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Novo usuário
          </button>
        </div>

        {msg && <p className="mb-4 flex items-center gap-2 rounded-md bg-primary/10 p-3 text-sm text-primary">{msg.includes('!') || msg.includes('!') ? <CheckCircle2 className="h-4 w-4" /> : null}{msg}</p>}

        {showNew && (
          <form onSubmit={create} className="mb-6 rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/40 p-5">
            <h2 className="mb-4 text-sm font-bold">Criar novo usuário</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Nome" required
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              <input type="email" value={nEmail} onChange={(e) => setNEmail(e.target.value)} placeholder="email@dominio.com" required
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              <input type="password" value={nPwd} onChange={(e) => setNPwd(e.target.value)} placeholder="Senha (mín. 6)" required minLength={6}
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <button type="submit" className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Criar</button>
          </form>
        )}

        <div className="overflow-hidden rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Usuário</th>
                <th className="hidden py-3 pl-4 md:table-cell">Cadastro</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border/40">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{u.name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="hidden py-3 pl-4 text-xs text-muted-foreground md:table-cell">
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <select value={u.role} onChange={(e) => put({ id: u.id, role: e.target.value })}
                      className="h-8 rounded-md border border-input bg-card px-2 text-xs">
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.blocked ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                      {u.blocked ? 'bloqueado' : 'ativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="relative">
                        <KeyRound className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="password" placeholder="nova senha" value={editPwd[u.id] ?? ''}
                          onChange={(e) => setEditPwd((p) => ({ ...p, [u.id]: e.target.value }))}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              const pw = editPwd[u.id]
                              if (pw && pw.length >= 6) { await put({ id: u.id, password: pw }); setEditPwd((p) => ({ ...p, [u.id]: '' })) }
                            }
                          }}
                          className="h-8 w-28 rounded-md border border-input bg-transparent pl-7 pr-2 text-xs"
                        />
                      </div>
                      <button onClick={() => put({ id: u.id, password: editPwd[u.id] })} disabled={!editPwd[u.id] || editPwd[u.id].length < 6}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30" title="Salvar senha">
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => put({ id: u.id, blocked: !u.blocked })}
                        className={`rounded-md p-1.5 hover:bg-card ${u.blocked ? 'text-emerald-400' : 'text-amber-400'}`} title={u.blocked ? 'Desbloquear' : 'Bloquear'}>
                        <Ban className="h-4 w-4" />
                      </button>
                      <button onClick={() => { if (u.id !== me?.id && confirm('Excluir ' + u.email + '?')) del(u.id) }}
                        className="rounded-md p-1.5 text-red-400 hover:bg-card disabled:opacity-30" disabled={u.id === me?.id} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
