import type { Categoria, Config, Equipo, Gasto, Pago, Trabajo } from '../db'
import { diasEntre, hoyISO, sumarMeses } from './format'

/** Próxima fecha de mantenimiento preventivo, o '' si no aplica. */
export function proximoServicio(e: Equipo): string {
  if (!e.frecuenciaMeses || !e.ultimoServicio) return ''
  return sumarMeses(e.ultimoServicio, e.frecuenciaMeses)
}

export type EstadoVencimiento = 'vencido' | 'pronto' | 'al-dia' | 'sin-dato'

export function estadoEquipo(e: Equipo, diasAviso: number, hoy = hoyISO()): EstadoVencimiento {
  const p = proximoServicio(e)
  if (!p) return 'sin-dato'
  const n = diasEntre(hoy, p)
  if (n < 0) return 'vencido'
  if (n <= diasAviso) return 'pronto'
  return 'al-dia'
}

/** Cuánto se ha recibido de verdad (los cheques rechazados no cuentan). */
export function totalCobrado(pagos: Pago[]): number {
  return pagos
    .filter((p) => !(p.metodo === 'cheque' && p.estadoCheque === 'rechazado'))
    .reduce((s, p) => s + p.monto, 0)
}

/** Cheques recibidos que todavía no se han cambiado en el banco. */
export function chequesPendientes(pagos: Pago[]): number {
  return pagos
    .filter((p) => p.metodo === 'cheque' && p.estadoCheque === 'pendiente')
    .reduce((s, p) => s + p.monto, 0)
}

export interface Rentabilidad {
  ingreso: number // lo cobrado, o el precio acordado si aún no se cobra
  viaticos: number
  materiales: number
  imprevistos: number
  manoObra: number
  costos: number
  utilidad: number
  margen: number // %
  color: 'verde' | 'amarillo' | 'rojo' | 'gris'
  cobrado: number
  saldo: number // pendiente de cobro
}

export function rentabilidad(
  t: Trabajo,
  pagos: Pago[],
  gastos: Gasto[],
  categorias: Categoria[],
  config: Config,
): Rentabilidad {
  const grupo = (c: string) => categorias.find((x) => x.id === c)?.grupo ?? 'imprevistos'
  const suma = (g: string) => gastos.filter((x) => grupo(x.categoria) === g).reduce((s, x) => s + x.monto, 0)

  const cobrado = totalCobrado(pagos)
  const ingreso = Math.max(cobrado, t.precio)
  const viaticos = suma('viaticos')
  const materiales = suma('materiales')
  const imprevistos = suma('imprevistos')
  const manoObra = (t.horasTrabajo + t.horasViaje) * config.tarifaHora
  const costos = viaticos + materiales + imprevistos + manoObra
  const utilidad = ingreso - costos
  const margen = ingreso > 0 ? (utilidad / ingreso) * 100 : 0

  let color: Rentabilidad['color'] = 'gris'
  if (ingreso > 0 || costos > 0) {
    if (utilidad < 0) color = 'rojo'
    else if (margen < config.margenMinimo) color = 'amarillo'
    else color = 'verde'
  }

  return {
    ingreso,
    viaticos,
    materiales,
    imprevistos,
    manoObra,
    costos,
    utilidad,
    margen,
    color,
    cobrado,
    saldo: Math.max(0, t.precio - cobrado),
  }
}

export const COLOR_SEMAFORO = {
  verde: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  amarillo: 'bg-amber-100 text-amber-800 border-amber-300',
  rojo: 'bg-red-100 text-red-800 border-red-300',
  gris: 'bg-slate-100 text-slate-600 border-slate-300',
}

export const TEXTO_SEMAFORO = {
  verde: 'Rentable',
  amarillo: 'Margen bajo',
  rojo: 'Pérdida',
  gris: 'Sin datos',
}
