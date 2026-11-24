'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MonitorPlay, Mail, User, CheckCircle2 } from 'lucide-react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: pwd }),
    })
    const data = await res.json()
    if (data.success) {
      setDone(true)
    } else {
      setError(data.error || 'Falha no cadastro')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 drop-shadow-[0_0_20px_rgba(168,85,247,0.35)]">
            <MonitorPlay className="h-5 w-5 text-primary" />
          </div>
          <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">Block Screen</span>
        </div>
        <form onSubmit={submit} className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/40 p-6 shadow">
          {done ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
              <h1 className="text-lg font-bold">Conta criada!</h1>
              <p className="mb-4 mt-1 text-xs text-muted-foreground">Agora é só fazer login para acessar o painel.</p>
              <a href="/login" className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90">
                Ir para o login
              </a>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold">Criar conta</h1>
              <p className="mb-5 text-xs text-muted-foreground">Crie sua conta para usar o painel</p>
              {error && <p className="mb-4 rounded-md bg-destructive/10 p-3 text-center text-sm text-red-400">{error}</p>}
              <label className="mb-1 block text-xs text-muted-foreground">Nome</label>
              <div className="relative mb-3">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome"
                  className="h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <label className="mb-1 block text-xs text-muted-foreground">Email</label>
              <div className="relative mb-3">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com"
                  className="h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <label className="mb-1 block text-xs text-muted-foreground">Senha</label>
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="mínimo 6 caracteres"
                className="mb-4 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              <button type="submit" className="h-10 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90">
                Criar conta
              </button>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Já tem conta?{' '}
                <Link href="/login" className="font-semibold text-primary hover:underline">Entrar</Link>
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
