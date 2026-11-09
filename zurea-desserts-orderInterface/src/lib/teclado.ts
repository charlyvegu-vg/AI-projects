import type React from 'react'

const CAMPOS = 'input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])'

/**
 * Tecla "Ir" / "Siguiente" / Enter del teclado de la tablet dentro de un formulario:
 * pasa al siguiente campo y, en el último, ejecuta `alTerminar` (por ejemplo, guardar) y esconde el teclado.
 * En las cajas de texto de varios renglones, Enter sigue haciendo un renglón nuevo.
 * Sin `alTerminar`, en el último campo solo esconde el teclado.
 */
export function avanzarConEnter(alTerminar?: () => void) {
  return (e: React.KeyboardEvent<HTMLElement>) => {
    const t = e.target as HTMLElement
    if ((e.key !== 'Enter' && e.keyCode !== 13) || t.tagName !== 'INPUT') return
    e.preventDefault()
    const campos = [...e.currentTarget.querySelectorAll<HTMLElement>(CAMPOS)].filter((c) => c.offsetParent !== null)
    const siguiente = campos[campos.indexOf(t) + 1]
    if (siguiente && siguiente.tagName === 'INPUT') {
      siguiente.focus()
      return
    }
    t.blur()
    alTerminar?.()
  }
}

/** Para marcar en el teclado qué hará la tecla: "next" si hay otro campo después, si no "done"/"go". */
export const SIGUIENTE = { enterKeyHint: 'next' as const }
