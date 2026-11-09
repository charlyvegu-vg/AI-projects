import { useEffect, useRef, useState } from 'react'
import type { Pedido } from '../types'
import { bipBip } from './sonido'
import { esRojo, estadoTimer, type Nivel } from './reglas'

const REPETIR_MS = 20_000

/**
 * Revisa cada segundo los pedidos pendientes:
 * - al llegar al 50% (amarillo): sacude la tarjeta y suena "bip bip" una vez
 * - desde el 70% (rojo): sacude y suena cada 20 segundos
 * Silenciar apaga el sonido de ese pedido, pero la tarjeta se sigue sacudiendo.
 * Devuelve un contador por pedido que cambia cada vez que la tarjeta debe sacudirse.
 */
export function useAlertas(pedidos: Pedido[], ahora: Date): Record<string, number> {
  const memoria = useRef(new Map<string, { nivel: Nivel; ultimo: number }>())
  const [sacudidas, setSacudidas] = useState<Record<string, number>>({})

  useEffect(() => {
    const t = ahora.getTime()
    const mem = memoria.current
    const alertar: Pedido[] = []
    const vivos = new Set<string>()

    for (const p of pedidos) {
      const est = estadoTimer(p, ahora)
      if (!est) continue
      vivos.add(p.id)
      const prev = mem.get(p.id)
      if (!prev) {
        // Primera vez que lo vemos (al abrir la app): si ya está en rojo, alerta enseguida.
        mem.set(p.id, { nivel: est.nivel, ultimo: esRojo(est.nivel) ? t : 0 })
        if (esRojo(est.nivel)) alertar.push(p)
        continue
      }
      const entraAmarillo = est.nivel === 'amarillo' && (prev.nivel === 'espera' || prev.nivel === 'normal')
      const tocaRojo = esRojo(est.nivel) && (!esRojo(prev.nivel) || t - prev.ultimo >= REPETIR_MS)
      if (entraAmarillo || tocaRojo) {
        alertar.push(p)
        prev.ultimo = t
      }
      prev.nivel = est.nivel
    }
    for (const id of mem.keys()) if (!vivos.has(id)) mem.delete(id)

    if (alertar.length) {
      if (alertar.some((p) => !p.silenciado)) bipBip()
      setSacudidas((s) => {
        const n = { ...s }
        for (const p of alertar) n[p.id] = (n[p.id] ?? 0) + 1
        return n
      })
    }
  }, [pedidos, ahora])

  return sacudidas
}

export function useAhora(ms = 1000): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), ms)
    return () => clearInterval(id)
  }, [ms])
  return ahora
}
