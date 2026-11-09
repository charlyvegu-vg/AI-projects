import { describe, expect, it } from 'vitest'
import { aplicarMovimientos, consumoPara, conUnidad, estadoTexto, nivel, porAcabarse, tandasSugeridas } from './inventario'
import type { Insumo, Receta } from '../types'

const ins = (nombre: string, tipo: Insumo['tipo'], cantidad: number, referencia = 0, alerta = tipo === 'contable' ? 3 : 25): Insumo =>
  ({ id: nombre, nombre, tipo, unidad: tipo === 'contable' ? 'caja' : 'lb', cantidad, referencia, alerta })

describe('alertas', () => {
  it('contables: avisa con 3 o menos', () => {
    expect(nivel(ins('Queso', 'contable', 4))).toBe('ok')
    expect(nivel(ins('Queso', 'contable', 3))).toBe('bajo')
    expect(nivel(ins('Queso', 'contable', 0))).toBe('agotado')
  })
  it('pesados: avisa al llegar al 25 %', () => {
    expect(nivel(ins('Harina', 'pesado', 5.1, 20))).toBe('ok')
    expect(nivel(ins('Harina', 'pesado', 5, 20))).toBe('bajo')
    expect(nivel(ins('Harina', 'pesado', 0, 20))).toBe('agotado')
  })
  it('ordena: agotados primero, luego los más bajos', () => {
    const lista = [ins('Azúcar', 'pesado', 4, 20), ins('Coco', 'pesado', 0, 1), ins('Harina', 'pesado', 2, 20), ins('Sal', 'pesado', 10, 20)]
    expect(porAcabarse(lista).map((i) => i.nombre)).toEqual(['Coco', 'Harina', 'Azúcar'])
  })
  it('textos', () => {
    expect(conUnidad(1, 'caja')).toBe('1 caja')
    expect(conUnidad(3, 'barra')).toBe('3 barras')
    expect(conUnidad(2, 'unidad')).toBe('2 unidades')
    expect(conUnidad(4.5, 'lb')).toBe('4.5 lb')
    expect(estadoTexto(ins('Harina', 'pesado', 4, 25))).toBe('Queda 16 % (4 lb)')
    expect(estadoTexto(ins('Queso', 'contable', 1))).toBe('Queda 1 caja')
  })
})

describe('recetas e inventario', () => {
  const receta: Receta = {
    rinde: '', unidadesPorTanda: 12, ingredientes: [], pasos: [], notas: '',
    consumo: [
      { insumoId: 'Harina', cantidad: 0.55, variedad: null },
      { insumoId: 'Azúcar', cantidad: 0.1, variedad: null },
      { insumoId: 'Azúcar', cantidad: 0.15, variedad: 'Piña' },
      { insumoId: 'Manzanas', cantidad: 3, variedad: 'Manzana' },
    ],
  }
  it('suma generales y de la variedad, por tandas', () => {
    expect(consumoPara(receta, 'Piña', 2)).toEqual([
      { insumoId: 'Harina', cantidad: 1.1, variedad: 'Piña' },
      { insumoId: 'Azúcar', cantidad: 0.5, variedad: 'Piña' },
    ])
  })
  it('tandas según lo que rinde', () => {
    expect(tandasSugeridas(receta, 3)).toBe(1)
    expect(tandasSugeridas(receta, 13)).toBe(2)
    expect(tandasSugeridas({ ...receta, unidadesPorTanda: null }, 30)).toBe(1)
  })
  it('descuenta sin bajar de cero; una compra fija el nuevo 100 %', () => {
    const r = aplicarMovimientos([ins('Harina', 'pesado', 4, 25), ins('Queso', 'contable', 1)], [
      { insumoId: 'Queso', cambio: -3, motivo: 'receta', detalle: '', ref: null },
      { insumoId: 'Harina', cambio: 10, motivo: 'compra', detalle: '', ref: null },
    ])
    expect(r[1].cantidad).toBe(0)
    expect(r[0]).toMatchObject({ cantidad: 14, referencia: 14 })
  })
})
