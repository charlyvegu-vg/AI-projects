import type { ReactNode } from 'react'
import type { Equipo } from '../db'
import { estadoEquipo, proximoServicio } from '../lib/calc'
import { diasEntre, fechaCorta, hoyISO } from '../lib/format'
import { cx } from './ui'

/**
 * El elemento distintivo de la app: cada equipo se ve como la etiqueta de
 * mantenimiento que se cuelga en el aparato, con la fecha del próximo servicio.
 */
const TONO = {
  vencido: { tag: 'bg-rojo text-white', texto: 'Vencido' },
  pronto: { tag: 'bg-etiqueta text-tinta', texto: 'Le toca pronto' },
  'al-dia': { tag: 'bg-verde text-white', texto: 'Al día' },
  'sin-dato': { tag: 'bg-linea text-gris', texto: 'Sin fecha' },
}

export function textoCuando(p: string, hoy = hoyISO()) {
  const n = diasEntre(hoy, p)
  if (n === 0) return 'Le toca hoy'
  if (n === 1) return 'Le toca mañana'
  if (n > 1) return `Faltan ${n} días`
  if (n === -1) return 'Venció ayer'
  return `Venció hace ${-n} días`
}

export default function EtiquetaServicio({
  equipo,
  diasAviso,
  onClick,
  children,
  titulo,
}: {
  equipo: Equipo
  diasAviso: number
  onClick?: () => void
  children?: ReactNode
  titulo?: ReactNode
}) {
  const est = estadoEquipo(equipo, diasAviso)
  const p = proximoServicio(equipo)
  const f = p ? fechaCorta(p) : null
  const tono = TONO[est]
  return (
    <div className="flex overflow-hidden rounded-3xl bg-hoja">
      {/* la etiqueta colgante, con su perforación */}
      <div className={cx('relative flex w-24 shrink-0 flex-col items-center justify-center px-2 pt-7 pb-3 text-center', tono.tag)}>
        <span className="absolute top-3 h-3.5 w-3.5 rounded-full bg-papel ring-2 ring-black/10" />
        {f ? (
          <>
            <span className="text-[2rem] leading-none font-bold">{f.dia}</span>
            <span className="text-base font-bold">{f.mes}</span>
          </>
        ) : (
          <span className="text-sm font-bold">Sin fecha</span>
        )}
      </div>
      <div className="min-w-0 flex-1 py-3 pr-3 pl-4">
        <button onClick={onClick} disabled={!onClick} className="block w-full text-left">
          {titulo}
          <span className="block text-[1.05rem] leading-snug font-bold">{equipo.tipo}</span>
          <span className="block truncate text-gris">{[equipo.marca, equipo.modelo].filter(Boolean).join(' ') || 'Sin marca'}</span>
          <span className={cx('mt-1 block font-bold', est === 'vencido' ? 'text-rojo' : est === 'pronto' ? 'text-[#7a5a00]' : 'text-gris')}>
            {p ? textoCuando(p) : tono.texto}
          </span>
        </button>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  )
}
