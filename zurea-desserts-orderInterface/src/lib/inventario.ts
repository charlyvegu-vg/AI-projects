import type { Consumo, Insumo, Movimiento, MotivoMovimiento, Receta } from '../types'

export const ALERTA_CONTABLE = 3
export const ALERTA_PESADO = 25

export type NivelInsumo = 'ok' | 'bajo' | 'agotado'

/** Porcentaje restante de un insumo pesado (respecto a su última compra). */
export function porcentaje(i: Insumo): number {
  return i.referencia > 0 ? Math.max(0, Math.min(100, (i.cantidad / i.referencia) * 100)) : 0
}

export function nivel(i: Insumo): NivelInsumo {
  if (i.cantidad <= 0) return 'agotado'
  if (i.tipo === 'contable') return i.cantidad <= i.alerta ? 'bajo' : 'ok'
  return porcentaje(i) <= i.alerta ? 'bajo' : 'ok'
}

/** Insumos que necesitan atención, primero los agotados y luego los más bajos. */
export function porAcabarse(insumos: Insumo[]): Insumo[] {
  const peso = (i: Insumo) => (nivel(i) === 'agotado' ? -1 : i.tipo === 'pesado' ? porcentaje(i) / 100 : i.cantidad / Math.max(1, i.alerta * 4))
  return insumos.filter((i) => nivel(i) !== 'ok').sort((a, b) => peso(a) - peso(b) || a.nombre.localeCompare(b.nombre))
}

/** Números legibles: hasta 2 decimales, sin ceros de más. */
export function cantidadTexto(n: number): string {
  return n.toLocaleString('es-GT', { maximumFractionDigits: 2 })
}

/** "2 cajas", "1 caja", "4.5 lb". Las abreviaturas (lb, kg, g, oz, ml) no se pluralizan. */
export function conUnidad(n: number, unidad: string): string {
  const u = unidad.trim()
  if (!u) return cantidadTexto(n)
  const abreviatura = /^(lb|kg|g|gr|oz|ml|l|lt)\.?$/i.test(u)
  const plural = n === 1 || abreviatura ? u : /[aeiouáéó]$/i.test(u) ? u + 's' : u + 'es'
  return `${cantidadTexto(n)} ${plural}`
}

/** Descripción corta del estado: "Quedan 2 cajas" o "Queda 18 % (4.5 lb)". */
export function estadoTexto(i: Insumo): string {
  if (i.cantidad <= 0) return 'Agotado'
  if (i.tipo === 'contable') return `${i.cantidad === 1 ? 'Queda' : 'Quedan'} ${conUnidad(i.cantidad, i.unidad)}`
  return `Queda ${Math.round(porcentaje(i))} % (${conUnidad(i.cantidad, i.unidad)})`
}

/** Consumo de la receta para una variedad (generales + los de esa variedad), multiplicado por las tandas. */
export function consumoPara(receta: Receta, variedad: string | null, tandas: number): Consumo[] {
  const total = new Map<string, number>()
  for (const c of receta.consumo ?? []) {
    if (c.variedad && c.variedad !== variedad) continue
    total.set(c.insumoId, (total.get(c.insumoId) ?? 0) + c.cantidad * tandas)
  }
  return [...total].map(([insumoId, cantidad]) => ({ insumoId, cantidad: Math.round(cantidad * 1000) / 1000, variedad }))
}

/** Tandas sugeridas para preparar `cantidad` unidades (1 si la receta no dice cuánto rinde). */
export function tandasSugeridas(receta: Receta, cantidad: number | undefined): number {
  const por = receta.unidadesPorTanda
  if (!cantidad || !por || por <= 0) return 1
  return Math.max(1, Math.ceil(cantidad / por))
}

export interface NuevoMovimiento {
  insumoId: string
  cambio: number
  motivo: MotivoMovimiento
  detalle: string
  ref: string | null
}

/**
 * Aplica movimientos a los insumos. El inventario no baja de cero.
 * Una compra deja como nueva referencia (100 %) la cantidad resultante.
 */
export function aplicarMovimientos(insumos: Insumo[], movs: NuevoMovimiento[]): Insumo[] {
  const porId = new Map(insumos.map((i) => [i.id, { ...i }]))
  for (const m of movs) {
    const i = porId.get(m.insumoId)
    if (!i) continue
    i.cantidad = Math.max(0, Math.round((i.cantidad + m.cambio) * 1000) / 1000)
    if (m.motivo === 'compra') i.referencia = i.cantidad
  }
  return insumos.map((i) => porId.get(i.id)!)
}

/** ¿Ya se descontó del inventario esta preparación? */
export function yaDescontado(movimientos: Movimiento[], ref: string): boolean {
  return movimientos.some((m) => m.ref === ref)
}
