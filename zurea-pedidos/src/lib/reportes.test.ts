import { describe, expect, it } from 'vitest'
import { csvVentas, limitesISO, moverAncla, rangoDe, resumir } from './reportes'
import { fechaLocal } from './tiempo'
import type { Pedido } from '../types'

const pedido = (dia: string, hora: string, total: number, fase: Pedido['fase'] = 'entregado', extra: Partial<Pedido> = {}): Pedido => ({
  id: dia + hora, numero: 1, casa: '5', cliente: '', notas: '', tipo: 'asap', timerMin: 15,
  entregaEn: fechaLocal(dia, hora).toISOString(), timerInicio: '', fase, silenciado: false,
  avisoEn: null, avisoEnviado: false, creadoEn: '', total,
  lineas: [{ productoId: 'p', nombre: 'Tartaleta', variedad: 'Piña', precio: total, cantidad: 1 }],
  ...extra,
})

describe('periodos', () => {
  it('semana de lunes a domingo', () => {
    expect(rangoDe('semana', '2026-11-04')).toEqual({ desde: '2026-11-02', hasta: '2026-11-08' })
    expect(rangoDe('semana', '2026-11-08')).toEqual({ desde: '2026-11-02', hasta: '2026-11-08' })
    expect(rangoDe('semana', '2026-12-31')).toEqual({ desde: '2026-12-28', hasta: '2027-01-03' })
  })
  it('mes completo, incluido febrero', () => {
    expect(rangoDe('mes', '2026-11-04')).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' })
    expect(rangoDe('mes', '2028-02-10')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' })
  })
  it('mueve entre periodos', () => {
    expect(moverAncla('mes', '2026-01-15', -1)).toBe('2025-12-01')
    expect(moverAncla('mes', '2026-12-15', 1)).toBe('2027-01-01')
    expect(moverAncla('semana', '2026-11-04', 1)).toBe('2026-11-11')
    expect(moverAncla('dia', '2026-11-30', 1)).toBe('2026-12-01')
  })
  it('límites en hora de Guatemala', () => {
    expect(limitesISO({ desde: '2026-11-04', hasta: '2026-11-04' }))
      .toEqual({ desde: '2026-11-04T06:00:00.000Z', hasta: '2026-11-05T06:00:00.000Z' })
  })
})

describe('resumen', () => {
  const r = { desde: '2026-11-02', hasta: '2026-11-08' }
  const pedidos = [
    pedido('2026-11-02', '23:50', 15),            // tarde en la noche: sigue siendo el día 2 en Guatemala
    pedido('2026-11-04', '10:00', 30.5),
    pedido('2026-11-05', '10:00', 20, 'entregado', { pago: 'efectivo', pagaCon: 50 }),
    pedido('2026-11-05', '11:00', 10, 'entregado', { pago: 'transferencia' }),
    pedido('2026-11-04', '12:00', 75, 'listo'),   // sin entregar: no es venta
    pedido('2026-11-09', '00:10', 99),            // fuera del rango
  ]
  const res = resumir(pedidos, r)
  it('cuenta solo entregados dentro del rango', () => {
    expect(res.entregados).toHaveLength(4)
    expect(res.ventas).toBe(75.5)
    expect(res.promedio).toBe(18.88)
    expect(res.porPago).toEqual({ efectivo: { pedidos: 1, monto: 20 }, transferencia: { pedidos: 1, monto: 10 }, sinIndicar: { pedidos: 2, monto: 45.5 } })
    expect(res.pendientes).toEqual({ cantidad: 1, monto: 75 })
  })
  it('agrupa por día y por producto', () => {
    expect(res.porDia).toHaveLength(7)
    expect(res.porDia[0]).toEqual({ dia: '2026-11-02', pedidos: 1, monto: 15 })
    expect(res.porDia[2]).toEqual({ dia: '2026-11-04', pedidos: 1, monto: 30.5 })
    expect(res.porProducto).toEqual([{ nombre: 'Tartaleta (piña)', cantidad: 4, monto: 75.5 }])
  })
  it('genera CSV con total', () => {
    const csv = csvVentas(resumir(pedidos.filter((p) => !p.pago), r))
    expect(csv.startsWith('﻿Fecha;Pedido')).toBe(true)
    expect(csv).toContain('2026-11-02;1;5;;Tartaleta;Piña;1;15.00;15.00;15.00;Sin indicar')
    expect(csv).toContain('Total;;;;;;2;;;45.50')
    expect(csv.trim().endsWith('Sin indicar;;;;;;;;;45.50')).toBe(true)
    expect(csvVentas(res)).toContain('Efectivo;;;;;;;;;20.00')
  })
})
