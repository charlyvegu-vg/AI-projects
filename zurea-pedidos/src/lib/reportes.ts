import type { Pedido } from '../types'
import { claveDia, fechaLocal, sumarDias } from './tiempo'

export type Periodo = 'dia' | 'semana' | 'mes' | 'rango'

/** Rango de días (claves "AAAA-MM-DD", ambos inclusive). */
export interface Rango { desde: string; hasta: string }

/** Día de la semana de una clave: 0 = lunes … 6 = domingo. */
function diaSemana(clave: string): number {
  return (new Date(`${clave}T12:00:00Z`).getUTCDay() + 6) % 7
}

/** Rango del periodo que contiene el día `ancla`. Las semanas van de lunes a domingo. */
export function rangoDe(periodo: Exclude<Periodo, 'rango'>, ancla: string): Rango {
  if (periodo === 'dia') return { desde: ancla, hasta: ancla }
  if (periodo === 'semana') {
    const desde = sumarDias(ancla, -diaSemana(ancla))
    return { desde, hasta: sumarDias(desde, 6) }
  }
  const desde = ancla.slice(0, 8) + '01'
  const siguiente = sumarDias(desde, 32).slice(0, 8) + '01'
  return { desde, hasta: sumarDias(siguiente, -1) }
}

/** Mueve el ancla al periodo anterior (-1) o siguiente (+1). */
export function moverAncla(periodo: Exclude<Periodo, 'rango'>, ancla: string, paso: number): string {
  if (periodo === 'dia') return sumarDias(ancla, paso)
  if (periodo === 'semana') return sumarDias(ancla, 7 * paso)
  const [a, m] = ancla.split('-').map(Number)
  const total = a * 12 + (m - 1) + paso
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`
}

/** Límites en ISO para consultar la base de datos (hora de Guatemala). */
export function limitesISO(r: Rango): { desde: string; hasta: string } {
  return { desde: fechaLocal(r.desde, '00:00').toISOString(), hasta: fechaLocal(sumarDias(r.hasta, 1), '00:00').toISOString() }
}

export function diasDe(r: Rango): string[] {
  const dias: string[] = []
  for (let d = r.desde; d <= r.hasta; d = sumarDias(d, 1)) dias.push(d)
  return dias
}

export interface FilaProducto { nombre: string; cantidad: number; monto: number }
export interface FilaDia { dia: string; pedidos: number; monto: number }
export interface FilaPago { pedidos: number; monto: number }

export interface Resumen {
  /** Pedidos entregados en el rango: son las ventas. */
  entregados: Pedido[]
  ventas: number
  unidades: number
  promedio: number
  porProducto: FilaProducto[]
  porDia: FilaDia[]
  /** Ventas por forma de pago, para cuadrar caja. */
  porPago: { efectivo: FilaPago; transferencia: FilaPago; sinIndicar: FilaPago }
  /** Pedidos del rango que aún no se entregan (no cuentan como venta). */
  pendientes: { cantidad: number; monto: number }
}

const redondear = (n: number) => Math.round(n * 100) / 100

/** Ventas = pedidos entregados, según su fecha de entrega. */
export function resumir(pedidos: Pedido[], r: Rango): Resumen {
  const enRango = pedidos.filter((p) => { const d = claveDia(p.entregaEn); return d >= r.desde && d <= r.hasta })
  const entregados = enRango.filter((p) => p.fase === 'entregado').sort((a, b) => a.entregaEn.localeCompare(b.entregaEn))
  const sinEntregar = enRango.filter((p) => p.fase !== 'entregado')

  const productos = new Map<string, FilaProducto>()
  const dias = new Map<string, FilaDia>(diasDe(r).map((d) => [d, { dia: d, pedidos: 0, monto: 0 }]))
  let unidades = 0
  const porPago = { efectivo: { pedidos: 0, monto: 0 }, transferencia: { pedidos: 0, monto: 0 }, sinIndicar: { pedidos: 0, monto: 0 } }
  for (const p of entregados) {
    const fp = porPago[p.pago ?? 'sinIndicar']
    fp.pedidos++
    fp.monto = redondear(fp.monto + p.total)
    const fd = dias.get(claveDia(p.entregaEn))!
    fd.pedidos++
    fd.monto = redondear(fd.monto + p.total)
    for (const l of p.lineas) {
      const nombre = l.variedad ? `${l.nombre} (${l.variedad.toLowerCase()})` : l.nombre
      const fp = productos.get(nombre) ?? { nombre, cantidad: 0, monto: 0 }
      fp.cantidad += l.cantidad
      fp.monto = redondear(fp.monto + l.precio * l.cantidad)
      productos.set(nombre, fp)
      unidades += l.cantidad
    }
  }
  const ventas = redondear(entregados.reduce((s, p) => s + p.total, 0))
  return {
    entregados,
    ventas,
    unidades,
    promedio: entregados.length ? redondear(ventas / entregados.length) : 0,
    porProducto: [...productos.values()].sort((a, b) => b.monto - a.monto || a.nombre.localeCompare(b.nombre)),
    porDia: [...dias.values()],
    porPago,
    pendientes: { cantidad: sinEntregar.length, monto: redondear(sinEntregar.reduce((s, p) => s + p.total, 0)) },
  }
}

const celda = (v: string | number) => {
  const s = String(v)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV para contabilidad: una fila por producto de cada pedido entregado. Abre bien en Excel (BOM + punto y coma). */
export function csvVentas(res: Resumen): string {
  const filas: (string | number)[][] = [['Fecha', 'Pedido', 'Casa', 'Cliente', 'Producto', 'Variedad', 'Cantidad', 'Precio unitario', 'Subtotal', 'Total del pedido', 'Forma de pago']]
  for (const p of res.entregados) {
    p.lineas.forEach((l, i) => {
      filas.push([claveDia(p.entregaEn), p.numero, p.casa, p.cliente, l.nombre, l.variedad ?? '', l.cantidad,
        l.precio.toFixed(2), (l.precio * l.cantidad).toFixed(2), i === 0 ? p.total.toFixed(2) : '',
        i === 0 ? (p.pago === 'efectivo' ? 'Efectivo' : p.pago === 'transferencia' ? 'Transferencia' : 'Sin indicar') : ''])
    })
  }
  filas.push([], ['Total', '', '', '', '', '', res.unidades, '', '', res.ventas.toFixed(2)])
  const { efectivo, transferencia, sinIndicar } = res.porPago
  filas.push(['Efectivo', '', '', '', '', '', '', '', '', efectivo.monto.toFixed(2)], ['Transferencia', '', '', '', '', '', '', '', '', transferencia.monto.toFixed(2)])
  if (sinIndicar.pedidos) filas.push(['Sin indicar', '', '', '', '', '', '', '', '', sinIndicar.monto.toFixed(2)])
  return '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n')
}
