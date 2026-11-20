'use client'

import { useEffect, useRef, useState } from 'react'

const POLL = 1500

function getDeviceId(): string {
  try {
    let id = localStorage.getItem('__tela_id__')
    if (!id) {
      id = 'D' + Math.random().toString(36).slice(2, 10).toUpperCase()
      localStorage.setItem('__tela_id__', id)
    }
    return id
  } catch {
    return 'DANONIMO'
  }
}

type State = { active: boolean; version?: string; html?: string }

export function ScreenClient() {
  const [state, setState] = useState<State | null>(null)
  const [ready, setReady] = useState(false)
  const deviceIdRef = useRef('')

  useEffect(() => {
    deviceIdRef.current = getDeviceId()
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    const id = deviceIdRef.current

    // heartbeat: registra/renova o dispositivo no painel
    const beat = () => {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: id }),
      }).catch(() => {})
    }
    beat()
    const beatTimer = setInterval(beat, 30000)

    // polling: qual tela mostrar
    const poll = async () => {
      try {
        const res = await fetch(`/api/state?device=${encodeURIComponent(id)}&t=${Date.now()}`, { cache: 'no-store' })
        const s: State = await res.json()
        if (s.active && s.html) {
          setState(s)
        } else {
          setState({ active: false })
        }
      } catch {
        // mantém a tela atual em caso de falha de rede
      }
    }
    poll()
    const t = setInterval(poll, POLL)

    return () => {
      clearInterval(t)
      clearInterval(beatTimer)
    }
  }, [ready])

  if (!state || !state.active) {
    return <div style={{ width: '100%', height: '100vh', background: 'transparent' }} />
  }

  return (
    <iframe
      title="Tela"
      allow="camera; microphone; fullscreen"
      allowFullScreen
      srcDoc={state.html}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        border: 0,
        margin: 0,
        padding: 0,
        zIndex: 2147483647,
        background: 'transparent',
      }}
    />
  )
}
