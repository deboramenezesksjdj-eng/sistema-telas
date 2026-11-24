'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MonitorPlay, Mail, Lock, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pwd }),
      })
      const data = await res.json()
      if (data.success) {
        window.location.href = data.role === 'admin' ? '/admin' : '/painel'
      } else {
        setError(data.error || 'Falha no login')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 drop-shadow-[0_0_20px_rgba(168,85,247,0.35)]">
            <MonitorPlay className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">Block Screen</span>
        </div>
        <form onSubmit={submit} className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/40 p-6 shadow">
          <h1 className="text-lg font-bold">Entrar</h1>
          <p className="mb-5 text-xs text-muted-foreground">Acesse seu painel de controle</p>
          {error && <p className="mb-4 rounded-md bg-destructive/10 p-3 text-center text-sm text-red-400">{error}</p>}
          <label className="mb-1 block text-xs text-muted-foreground">Email</label>
          <div className="relative mb-3">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <label className="mb-1 block text-xs text-muted-foreground">Senha</label>
          <input
            type="password" value={pwd} onChange={(e) => setPwd(e.target.value)}
            placeholder="••••••••"
            className="mb-4 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button type="submit" disabled={loading} className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors">
            {loading ? 'Entrando...' : <>Entrar <ArrowRight className="ml-2 h-4 w-4" /></>}
          </button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Sem conta? Fale com o administrador.
          </p>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <a href="/painel" className="hover:text-foreground">Painel de telas (acesso antigo)</a>
        </p>
      </div>
    </div>
  )
}
