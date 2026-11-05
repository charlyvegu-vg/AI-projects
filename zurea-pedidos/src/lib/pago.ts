import type { MetodoPago, Pedido } from '../types'

/** Billetes de quetzal que se usan para sugerir "paga con". */
const BILLETES = [5, 10, 20, 50, 100, 200]

/** Cambio a dar (0 si paga exacto o no se sabe). */
export function cambio(total: number, pagaCon: number | null | undefined): number {
  if (pagaCon == null) return 0
  return Math.max(0, Math.round((pagaCon - total) * 100) / 100)
}

/**
 * Montos sugeridos para "paga con": el siguiente múltiplo de 5, 10, 50 y 100 por encima del total
 * y los billetes que alcanzan. Hasta 4, sin repetir, de menor a mayor.
 */
export function sugerenciasPago(total: number): number[] {
  if (!(total > 0)) return []
  const arriba = (m: number) => Math.ceil(total / m) * m
  const candidatos = [arriba(10), arriba(50), arriba(100), ...BILLETES.filter((b) => b >= total)]
  return [...new Set(candidatos)].filter((v) => v > total).sort((a, b) => a - b).slice(0, 4)
}

export const NOMBRE_PAGO: Record<MetodoPago, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia' }

export function textoPago(p: Pick<Pedido, 'pago' | 'pagaCon' | 'total'>, formatoQ: (n: number) => string): string | null {
  if (!p.pago) return null
  if (p.pago === 'transferencia') return 'Transferencia'
  if (p.pagaCon == null || p.pagaCon <= p.total) return 'Efectivo, exacto'
  return `Efectivo, paga con ${formatoQ(p.pagaCon)}: cambio ${formatoQ(cambio(p.total, p.pagaCon))}`
}
