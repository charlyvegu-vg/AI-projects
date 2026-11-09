import { useCallback, useState } from 'react'
import type { Ingrediente, Receta } from '../types'

/** Ingredientes que aplican a una variedad: los generales más los de esa variedad. */
export function ingredientesPara(receta: Receta, variedad: string | null): Ingrediente[] {
  return receta.ingredientes.filter((i) => !i.variedad || i.variedad === variedad)
}

/** Separa el texto del editor (un ingrediente por renglón) en una lista limpia. */
export function renglones(texto: string): string[] {
  return texto.split('\n').map((l) => l.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean)
}

const PREFIJO = 'preparacion:'
const VIGENCIA_MS = 3 * 86_400_000

interface Guardado { t: number; marcados: string[] }

function limpiarViejos() {
  const ahora = Date.now()
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i)
    if (!k?.startsWith(PREFIJO)) continue
    try {
      if (ahora - (JSON.parse(localStorage.getItem(k)!) as Guardado).t > VIGENCIA_MS) localStorage.removeItem(k)
    } catch { localStorage.removeItem(k) }
  }
}

function leer(clave: string): Set<string> {
  try {
    const g = JSON.parse(localStorage.getItem(PREFIJO + clave) ?? 'null') as Guardado | null
    return new Set(g?.marcados ?? [])
  } catch { return new Set() }
}

/**
 * Lista de ingredientes tachados, guardada en este dispositivo para no perderla al cambiar de pantalla.
 * Se identifica cada ingrediente por su texto, así editar la receta no desordena lo marcado.
 */
export function useChecklist(clave: string) {
  const [estado, setEstado] = useState(() => { limpiarViejos(); return { clave, marcados: leer(clave) } })
  const marcados = estado.clave === clave ? estado.marcados : leer(clave)
  if (estado.clave !== clave) setEstado({ clave, marcados })

  const guardar = useCallback((nuevos: Set<string>) => {
    setEstado({ clave, marcados: nuevos })
    if (nuevos.size) localStorage.setItem(PREFIJO + clave, JSON.stringify({ t: Date.now(), marcados: [...nuevos] }))
    else localStorage.removeItem(PREFIJO + clave)
  }, [clave])

  const alternar = (texto: string) => {
    const n = new Set(marcados)
    if (n.has(texto)) n.delete(texto)
    else n.add(texto)
    guardar(n)
  }
  return { marcados, alternar, reiniciar: () => guardar(new Set()) }
}
