'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield, Trash2, Ban, Plus, CalendarClock, LogOut, LayoutDashboard, CheckCircle2, AlertCircle } from 'lucide-react'

type UserRow = {
  id: number
  email: string
  name: string | null
  role: 'admin' | 'user'
  blocked: boolean
  expires_at: string | null
  created_at: string
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—')

function validadeLabel(u: UserRow) {
  if (!u.expires_at) return { txt: 'Sem validade', cls: 'bg-white/5 text-zinc-400' }
  const ms = new Date(u.expires_at).getTime() - Date.now()
  if (ms <= 0) return { txt: 'Expirado', cls: 'bg-red-500/15 text-red-400' }
  const d = Math.floor(ms / 86400000)
  return { txt: d === 1 ? 'Expira amanhã' : `${d} dias restantes`, cls: d <= 7 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400' }
}

export default function AdminPage() {
  const router = useRouter()
  const [me, setMe] = useState<UserRow | null>(null)
  const [ready, setReady] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [nName, setNName] = useState('')
  const [nEmail, setNEmail] = useState('')
  const [nPwd, setNPwd] = useState('')
  const [nRole, setNRole] = useState<'user' | 'admin'>('user')
  const [nExp, setNExp] = useState('')
  const [editPwd, setEditPwd] = useState<Record<number, string>>({})
  const [editExp, setEditExp] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState(false)

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

  const put = async (body: Record<string, unknown>, okText = 'Alteração salva!') => {
    setMsg(null); setBusy(true)
    const res = await fetch('/api/auth/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setMsg(res.ok ? { ok: true, text: okText } : { ok: false, text: data.error || 'Erro' })
    if (res.ok) load()
    setBusy(false)
  }

  const del = async (id: number, email: string) => {
    if (!confirm('Excluir o usuário ' + email + '?')) return
    setMsg(null)
    const res = await fetch('/api/auth/users?id=' + id, { method: 'DELETE' })
    const data = await res.json()
    setMsg(res.ok ? { ok: true, text: 'Usuário excluído' } : { ok: false, text: data.error || 'Erro' })
    if (res.ok) load()
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null); setBusy(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nName, email: nEmail, password: nPwd, role: nRole, expires_at: nExp || null }),
    })
    const data = await res.json()
    if (res.ok) {
      setShowNew(false); setNName(''); setNEmail(''); setNPwd(''); setNExp('')
      setMsg({ ok: true, text: 'Usuário criado!' })
      load()
    } else {
      setMsg({ ok: false, text: data.error || 'Erro no cadastro' })
    }
    setBusy(false)
  }

  const logout = async () => { await fetch('/api/auth/me', { method: 'DELETE' }); window.location.href = '/login' }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b12]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-violet-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0b12] text-zinc-100">
      {/* topo */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0b0b12]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-600/30">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight text-white">Central Admin</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Block Screen</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="mr-2 hidden md:inline">{me?.email}</span>
            <Link href="/painel" className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold hover:bg-white/5 hover:text-white">
              <LayoutDashboard className="h-4 w-4" /> Painel
            </Link>
            <button onClick={logout} className="flex items-center gap-1.5 rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Gerenciar acessos</h1>
            <p className="mt-1 text-sm text-zinc-500">Crie contas, defina validade e controle quem entra no painel.</p>
          </div>
          <button onClick={() => { setShowNew(v => !v); setMsg(null) }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:brightness-110">
            <Plus className="h-4 w-4" /> Novo usuário
          </button>
        </div>

        {msg && (
          <p className={`mb-5 flex items-center gap-2 rounded-xl p-3.5 text-sm ${msg.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
            {msg.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {msg.text}
          </p>
        )}

        {showNew && (
          <form onSubmit={create} className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-[#14141f] to-[#101018] p-6 shadow-xl">
            <h2 className="mb-1 text-base font-bold text-white">Criar novo acesso</h2>
            <p className="mb-5 text-xs text-zinc-500">Apenas o administrador pode criar usuários. Defina uma validade se quiser que a conta expire.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Nome</label>
                <input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Nome da pessoa" required
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/60" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Email</label>
                <input type="email" value={nEmail} onChange={(e) => setNEmail(e.target.value)} placeholder="email@dominio.com" required
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/60" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Senha</label>
                <input type="password" value={nPwd} onChange={(e) => setNPwd(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6}
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500/60" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Tipo de conta</label>
                <select value={nRole} onChange={(e) => setNRole(e.target.value as 'admin' | 'user')}
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-violet-500/60">
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                  <CalendarClock className="h-3.5 w-3.5 text-violet-400" /> Validade (opcional)
                </label>
                <input type="date" value={nExp} onChange={(e) => setNExp(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 text-sm text-white outline-none focus:border-violet-500/60" />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button type="submit" className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:brightness-110">Criar acesso</button>
              <button type="button" onClick={() => setShowNew(false)} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-zinc-400 hover:bg-white/5">Cancelar</button>
            </div>
          </form>
        )}

        {/* lista */}
        <div className="grid gap-3">
          {users.map((u) => (
            <UserCard key={u.id} u={u} me={me?.id ?? 0} msg={msg} busy={busy}
              onPut={put} onDel={del}
              editPwd={editPwd[u.id] ?? ''} setEditPwd={(v) => setEditPwd((p) => ({ ...p, [u.id]: v }))}
              editExp={editExp[u.id] ?? ''} setEditExp={(v) => setEditExp((p) => ({ ...p, [u.id]: v }))} />
          ))}
        </div>
      </main>
    </div>
  )
}

function UserCard({ u, me, msg, busy, onPut, onDel, editPwd, setEditPwd, editExp, setEditExp }: {
  u: UserRow
  me: number
  msg: { ok: boolean; text: string } | null
  busy: boolean
  onPut: (body: Record<string, unknown>, okText?: string) => Promise<void>
  onDel: (id: number, email: string) => void
  editPwd: string
  setEditPwd: (v: string) => void
  editExp: string
  setEditExp: (v: string) => void
}) {
  const [editingExp, setEditingExp] = useState(false)
  const [expValue, setExpValue] = useState(u.expires_at ? u.expires_at.slice(0, 10) : '')

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#13131d] to-[#0f0f17] p-5 transition hover:border-white/20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{u.name || 'Sem nome'}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${u.role === 'admin' ? 'bg-violet-500/15 text-violet-300' : 'bg-white/5 text-zinc-400'}`}>
              {u.role}
            </span>
            {u.blocked ? (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">bloqueado</span>
            ) : u.expires_at && new Date(u.expires_at).getTime() < Date.now() ? (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">expirado</span>
            ) : (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ativo</span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">{u.email} · desde {new Date(u.created_at).toLocaleDateString('pt-BR')}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* validade */}
          {editingExp ? (
            <>
              <input type="date" value={expValue} onChange={(e) => setExpValue(e.target.value)}
                className="h-9 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-white" />
              <button onClick={() => { onPut({ id: u.id, expires_at: expValue || null }); setEditingExp(false) }}
                className="h-9 rounded-lg bg-violet-500/20 px-3 text-xs font-semibold text-violet-300 hover:bg-violet-500/30">Salvar</button>
              <button onClick={() => setEditingExp(false)} className="h-9 rounded-lg px-2 text-xs text-zinc-500 hover:text-white">✕</button>
            </>
          ) : (
            <button onClick={() => setEditingExp(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5">
              <CalendarClock className="h-3.5 w-3.5 text-violet-400" />
              {u.expires_at ? 'Validade: ' + fmtDate(u.expires_at) : 'Sem validade'}
            </button>
          )}

          {/* senha */}
          <input type="password" placeholder="nova senha" value={editPwd} onChange={(e) => setEditPwd(e.target.value)}
            className="h-9 w-28 rounded-lg border border-white/10 bg-black/40 px-2.5 text-xs text-white placeholder:text-zinc-600" />
          <button onClick={() => { if (editPwd.length >= 6) onPut({ id: u.id, password: editPwd }, 'Senha alterada!') }}
            disabled={editPwd.length < 6 || busy}
            className="h-9 rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-300 hover:bg-white/5 disabled:opacity-30">Trocar senha</button>

          {/* bloquear */}
          <button onClick={() => onPut({ id: u.id, blocked: !u.blocked })}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold ${u.blocked ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'}`}>
            <Ban className="h-3.5 w-3.5" /> {u.blocked ? 'Desbloquear' : 'Bloquear'}
          </button>

          {/* excluir */}
          <button onClick={() => { if (u.id !== me && confirm('Excluir ' + u.email + '?')) onDel(u.id, u.email) }}
            disabled={u.id === me}
            className="rounded-lg border border-red-500/30 p-2 text-red-400 hover:bg-red-500/10 disabled:opacity-30" title="Excluir">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
