import { useRef } from 'react'
import type { Pedido } from '../types'
import { claveDia, nombreDia, sumarDias } from '../lib/tiempo'

interface Props {
  pedidos: Pedido[]
  hoy: string
  dia: string
  onElegir: (dia: string) => void
}

/** Hoy y Mañana siempre; además, cualquier día con pedidos por entregar o futuros. */
export function PestanasDia({ pedidos, hoy, dia, onElegir }: Props) {
  const fecha = useRef<HTMLInputElement>(null)
  const manana = sumarDias(hoy, 1)
  const cuenta = new Map<string, number>()
  for (const p of pedidos) {
    const d = claveDia(p.entregaEn)
    const activo = p.fase !== 'entregado'
    if (activo || d >= hoy) cuenta.set(d, (cuenta.get(d) ?? 0) + (activo ? 1 : 0))
  }
  const dias = [...new Set([hoy, manana, dia, ...cuenta.keys()])].sort()

  return (
    <nav className="pestanas">
      {dias.map((d) => {
        const n = cuenta.get(d) ?? 0
        const atrasado = d < hoy && n > 0
        return (
          <button key={d} className={`pestana ${d === dia ? 'activa' : ''} ${atrasado ? 'pestana-atrasada' : ''}`} onClick={() => onElegir(d)}>
            {nombreDia(d, hoy)}{n > 0 && <span className="pestana-n">{n}</span>}
          </button>
        )
      })}
      <label className="pestana pestana-fecha">
        Otra fecha
        <input
          ref={fecha} type="date"
          onChange={(e) => e.target.value && onElegir(e.target.value)}
          onClick={() => fecha.current?.showPicker?.()}
        />
      </label>
    </nav>
  )
}
