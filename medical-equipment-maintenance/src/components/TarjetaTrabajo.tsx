import { useNavigate } from 'react-router-dom'
import type { Cliente, Equipo, EstadoTrabajo, Trabajo } from '../db'
import { fechaCorta, hora12, hoyISO, q } from '../lib/format'
import Icono from './Icono'
import { Estado } from './ui'

export const ESTADOS: { valor: EstadoTrabajo; texto: string }[] = [
  { valor: 'solicitado', texto: 'Solicitado' },
  { valor: 'agendado', texto: 'Agendado' },
  { valor: 'realizado', texto: 'Realizado' },
  { valor: 'cobrado', texto: 'Cobrado' },
]

export const TEXTO_ESTADO: Record<EstadoTrabajo, string> = {
  solicitado: 'Solicitado',
  agendado: 'Agendado',
  realizado: 'Falta cobrar',
  cobrado: 'Cobrado',
}

export const COLOR_ESTADO: Record<EstadoTrabajo, 'primario' | 'gris' | 'amarillo' | 'verde'> = {
  solicitado: 'gris',
  agendado: 'primario',
  realizado: 'amarillo',
  cobrado: 'verde',
}

export function nombreEquipo(e?: Equipo) {
  if (!e) return ''
  return [e.tipo, e.marca, e.modelo].filter(Boolean).join(' ')
}

/** Fila de un trabajo: fecha a la izquierda, lugar y equipo al centro. */
export default function TarjetaTrabajo({
  t,
  cliente,
  equipo,
  mostrarPrecio,
  soloHora,
}: {
  t: Trabajo
  cliente?: Cliente
  equipo?: Equipo
  mostrarPrecio?: boolean
  soloHora?: boolean
}) {
  const nav = useNavigate()
  const f = fechaCorta(t.fecha)
  const atrasado = (t.estado === 'solicitado' || t.estado === 'agendado') && t.fecha < hoyISO()
  return (
    <button onClick={() => nav(`/trabajos/${t.id}`)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-papel">
      <span className={`flex w-14 shrink-0 flex-col items-center rounded-2xl py-1.5 ${atrasado ? 'bg-rojo-suave text-rojo' : 'bg-papel'}`}>
        {soloHora && t.hora ? (
          <>
            <span className="text-lg leading-tight font-bold">{hora12(t.hora).split(' ')[0]}</span>
            <span className="text-xs font-bold">{hora12(t.hora).split(' ').slice(1).join(' ')}</span>
          </>
        ) : (
          <>
            <span className="text-xl leading-tight font-bold">{f.dia}</span>
            <span className="text-sm font-bold">{f.mes}</span>
          </>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[1.05rem] font-bold">{cliente?.nombre ?? 'Cliente borrado'}</span>
        <span className="block truncate text-gris">
          {t.tipo === 'correctivo' ? 'Reparación' : 'Mantenimiento'}
          {equipo ? ` de ${equipo.tipo.toLowerCase()}` : ''}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          {t.prioridad === 'urgente' && <Estado color="rojo">Urgente</Estado>}
          {atrasado ? <Estado color="rojo">Atrasado</Estado> : <Estado color={COLOR_ESTADO[t.estado]}>{TEXTO_ESTADO[t.estado]}</Estado>}
          {mostrarPrecio && t.precio > 0 && <span className="tabular ml-auto font-bold">{q(t.precio)}</span>}
        </span>
      </span>
      <Icono nombre="derecha" className="h-5 w-5 shrink-0 text-gris" />
    </button>
  )
}
