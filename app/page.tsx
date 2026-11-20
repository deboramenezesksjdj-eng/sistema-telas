export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 p-8 text-center text-neutral-100">
      <h1 className="text-2xl font-bold">Sistema de Telas</h1>
      <p className="max-w-md text-sm text-neutral-400">
        Para exibir as telas controladas pelo painel, abra este site no celular em{' '}
        <code className="rounded bg-neutral-800 px-1.5 py-0.5">/t/1</code> (o número/ID é só um identificador do dispositivo).
      </p>
      <div className="flex gap-3 text-sm">
        <a href="/t/1" className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold hover:bg-indigo-500">
          Abrir tela no navegador
        </a>
        <a href="/painel" className="rounded-xl border border-neutral-700 px-5 py-2.5 hover:bg-neutral-900">
          Painel
        </a>
      </div>
    </div>
  )
}
