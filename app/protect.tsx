'use client'

import { useEffect } from 'react'

// Proteção básica contra cópia: bloqueia clique direito, F12, Ctrl+Shift+I/J/C,
// Ctrl+U (ver código-fonte), Ctrl+S (salvar página), Ctrl+P (imprimir) e seleção/copiar texto.
export default function Protect() {
  useEffect(() => {
    const isDevtoolsKey = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') return true
      // Ctrl+Shift+I / J / C
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) return true
      // Ctrl+U / Ctrl+S / Ctrl+P
      if (e.ctrlKey && !e.shiftKey && !e.altKey && ['u', 's', 'p', 'U', 'S', 'P'].includes(e.key)) return true
      return false
    }

    const onContextMenu = (e: MouseEvent) => e.preventDefault()
    const onKeyDown = (e: KeyboardEvent) => {
      if (isDevtoolsKey(e)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const onCopy = (e: ClipboardEvent) => e.preventDefault()
    const onSelectStart = (e: Event) => {
      const t = e.target as HTMLElement | null
      // permite selecionar dentro de inputs/textarea
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      e.preventDefault()
    }
    const onDragStart = (e: DragEvent) => e.preventDefault()

    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('copy', onCopy)
    document.addEventListener('selectstart', onSelectStart)
    document.addEventListener('dragstart', onDragStart)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('selectstart', onSelectStart)
      document.removeEventListener('dragstart', onDragStart)
    }
  }, [])

  return null
}
