import type { Cliente, Equipo, Pago, Trabajo } from '../db'
import { proximoServicio, totalCobrado } from './calc'
import { hoyISO, sumarDias } from './format'

export const esPendiente = (t: Trabajo) => t.estado === 'solicitado' || t.estado === 'agendado'

/** Clientes con equipos que vencen en N días (o ya vencieron) y que aún no tienen trabajo agendado. */
export function porContactar(clientes: Cliente[], equipos: Equipo[], trabajos: Trabajo[], diasAviso: number) {
  const conTrabajo = new Set(trabajos.filter(esPendiente).map((t) => t.equipoId).filter(Boolean))
  const limite = sumarDias(hoyISO(), diasAviso)
  const grupos = new Map<string, Equipo[]>()
  for (const e of equipos) {
    const p = proximoServicio(e)
    if (p && p <= limite && !conTrabajo.has(e.id)) grupos.set(e.clienteId, [...(grupos.get(e.clienteId) ?? []), e])
  }
  const cli = new Map(clientes.map((c) => [c.id, c]))
  return [...grupos.entries()]
    .filter(([id]) => cli.has(id))
    .map(([id, lista]) => ({ cliente: cli.get(id)!, lista: lista.sort((a, b) => proximoServicio(a).localeCompare(proximoServicio(b))) }))
    .sort((a, b) => proximoServicio(a.lista[0]).localeCompare(proximoServicio(b.lista[0])))
}

export function agruparPagos(pagos: Pago[]) {
  const m = new Map<string, Pago[]>()
  for (const p of pagos) m.set(p.trabajoId, [...(m.get(p.trabajoId) ?? []), p])
  return m
}

/** Total que falta cobrar de trabajos ya realizados. */
export function totalPorCobrar(trabajos: Trabajo[], pagos: Pago[]) {
  const pp = agruparPagos(pagos)
  return trabajos
    .filter((t) => t.estado === 'realizado' || t.estado === 'cobrado')
    .reduce((s, t) => s + Math.max(0, t.precio - totalCobrado(pp.get(t.id) ?? [])), 0)
}
