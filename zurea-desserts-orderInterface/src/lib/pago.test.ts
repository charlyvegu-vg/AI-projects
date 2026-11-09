import { describe, expect, it } from 'vitest'
import { cambio, sugerenciasPago, textoPago } from './pago'

const q = (n: number) => `Q${n}`

describe('pago', () => {
  it('calcula el cambio', () => {
    expect(cambio(65, 100)).toBe(35)
    expect(cambio(65, null)).toBe(0)
    expect(cambio(65, 60)).toBe(0)
    expect(cambio(37.5, 50)).toBe(12.5)
  })
  it('sugiere montos útiles', () => {
    expect(sugerenciasPago(65)).toEqual([70, 100, 200])
    expect(sugerenciasPago(15)).toEqual([20, 50, 100, 200])
    expect(sugerenciasPago(125)).toEqual([130, 150, 200])
    expect(sugerenciasPago(0)).toEqual([])
  })
  it('texto para la tarjeta', () => {
    expect(textoPago({ pago: 'efectivo', pagaCon: 100, total: 65 }, q)).toBe('Efectivo, paga con Q100: cambio Q35')
    expect(textoPago({ pago: 'efectivo', pagaCon: null, total: 65 }, q)).toBe('Efectivo, exacto')
    expect(textoPago({ pago: 'transferencia', pagaCon: null, total: 65 }, q)).toBe('Transferencia')
    expect(textoPago({ pago: null, pagaCon: null, total: 65 }, q)).toBeNull()
  })
})
