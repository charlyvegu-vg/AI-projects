import type { DatosPedido, Pedido } from '../types'
import { claveDia, fechaLocal, hora24, sumarDias } from './tiempo'

const MIN = 60_000
export const HORAS_AVISO = 5
/** Si el aviso cae entre 9 pm y 7 am, se envía a las 9 pm del día anterior a la entrega. */
export const NOCHE_INICIO = '21:00'
export const NOCHE_FIN = '07:00'

export function calcularTimerInicio(
  tipo: Pedido['tipo'], creadoEn: string, entregaEn: string, timerMin: number,
): string {
  if (tipo === 'asap') return creadoEn
  return new Date(new Date(entregaEn).getTime() - timerMin * MIN).toISOString()
}

/** Correo de aviso: solo para pedidos programados para un día distinto al que se encargaron. */
export function calcularAviso(
  tipo: Pedido['tipo'], creadoEn: string, entregaEn: string,
): string | null {
  if (tipo !== 'programado') return null
  if (claveDia(entregaEn) === claveDia(creadoEn)) return null
  const aviso = new Date(new Date(entregaEn).getTime() - HORAS_AVISO * 60 * MIN)
  const h = hora24(aviso)
  if (h >= NOCHE_INICIO || h < NOCHE_FIN) {
    return fechaLocal(sumarDias(claveDia(entregaEn), -1), NOCHE_INICIO).toISOString()
  }
  return aviso.toISOString()
}

export function calcularTotal(lineas: DatosPedido['lineas']): number {
  return Math.round(lineas.reduce((s, l) => s + l.precio * l.cantidad, 0) * 100) / 100
}

/** Campos que se derivan de los datos capturados. Al editar, conserva el estado del aviso si no cambió. */
export function derivados(
  datos: DatosPedido, creadoEn: string, anterior?: Pick<Pedido, 'avisoEn' | 'avisoEnviado'>,
) {
  const entregaEn = datos.tipo === 'asap' ? creadoEn : datos.entregaEn
  const avisoEn = calcularAviso(datos.tipo, creadoEn, entregaEn)
  const avisoEnviado = anterior && anterior.avisoEn === avisoEn ? anterior.avisoEnviado : false
  return {
    entregaEn,
    total: calcularTotal(datos.lineas),
    timerInicio: calcularTimerInicio(datos.tipo, creadoEn, entregaEn, datos.timerMin),
    avisoEn,
    avisoEnviado,
  }
}

export type Nivel = 'espera' | 'normal' | 'amarillo' | 'rojo' | 'atrasado'

export interface EstadoTimer {
  nivel: Nivel
  /** 0 a 1 (puede pasar de 1 si está atrasado). */
  progreso: number
  /** ms que faltan para el límite (negativo = atrasado). */
  restanteMs: number
  inicio: Date
}

/** Solo aplica a pedidos en "Pendiente". */
export function estadoTimer(p: Pick<Pedido, 'fase' | 'timerInicio' | 'timerMin'>, ahora: Date): EstadoTimer | null {
  if (p.fase !== 'pendiente') return null
  const inicio = new Date(p.timerInicio)
  const duracion = Math.max(1, p.timerMin) * MIN
  const transcurrido = ahora.getTime() - inicio.getTime()
  const progreso = transcurrido / duracion
  const restanteMs = duracion - transcurrido
  let nivel: Nivel
  if (transcurrido < 0) nivel = 'espera'
  else if (progreso < 0.5) nivel = 'normal'
  else if (progreso < 0.7) nivel = 'amarillo'
  else if (progreso < 1) nivel = 'rojo'
  else nivel = 'atrasado'
  return { nivel, progreso, restanteMs, inicio }
}

export function esAlerta(n: Nivel | undefined): boolean {
  return n === 'amarillo' || n === 'rojo' || n === 'atrasado'
}
export function esRojo(n: Nivel | undefined): boolean {
  return n === 'rojo' || n === 'atrasado'
}
