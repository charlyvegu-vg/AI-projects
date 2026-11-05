import type { Ajustes, Insumo, Movimiento, Pedido, Producto } from '../types'

export interface DatosApp {
  pedidos: Pedido[]
  productos: Producto[]
  ajustes: Ajustes
  insumos: Insumo[]
  movimientos: Movimiento[]
}

export interface Respaldo extends DatosApp {
  app: 'zurea'
  version: 1
  fecha: string
}

export function crearRespaldo(d: DatosApp, fecha = new Date()): Respaldo {
  const { pedidos, productos, ajustes, insumos, movimientos } = d
  return { app: 'zurea', version: 1, fecha: fecha.toISOString(), pedidos, productos, ajustes, insumos, movimientos }
}

/** "zurea-respaldo-2026-11-05-1430.json" (hora de Guatemala). */
export function nombreArchivo(fecha = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(fecha)
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  return `zurea-respaldo-${v('year')}-${v('month')}-${v('day')}-${v('hour').replace('24', '00')}${v('minute')}.json`
}

const lista = (x: unknown) => Array.isArray(x)

/** Revisa que el archivo sea un respaldo de esta app. Lanza un error con un mensaje claro si no lo es. */
export function leerRespaldo(texto: string): Respaldo {
  let d: Record<string, unknown>
  try { d = JSON.parse(texto) } catch { throw new Error('El archivo no es un respaldo de Zuréa (no se pudo leer).') }
  if (!d || d.app !== 'zurea') throw new Error('El archivo no es un respaldo de Zuréa.')
  if (d.version !== 1) throw new Error('Este respaldo es de otra versión de la app.')
  if (!lista(d.pedidos) || !lista(d.productos) || !lista(d.insumos) || !lista(d.movimientos) || !d.ajustes || typeof d.ajustes !== 'object')
    throw new Error('El respaldo está incompleto o dañado.')
  return d as unknown as Respaldo
}

/** Resumen para confirmar antes de restaurar: "12 pedidos, 7 productos, 31 insumos". */
export function resumenRespaldo(r: DatosApp): string {
  const n = (k: number, uno: string, varios: string) => `${k} ${k === 1 ? uno : varios}`
  const recetas = r.productos.filter((p) => p.receta).length
  return [n(r.pedidos.length, 'pedido', 'pedidos'), n(r.productos.length, 'producto', 'productos'),
    n(recetas, 'receta', 'recetas'), n(r.insumos.length, 'insumo', 'insumos')].join(', ')
}
