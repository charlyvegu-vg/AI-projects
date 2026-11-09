import { describe, expect, it } from 'vitest'
import { ingredientesPara, renglones } from './preparacion'
import { opcionesReceta } from '../components/ElegirReceta'
import type { Pedido, Receta } from '../types'

const receta: Receta = {
  rinde: '', pasos: [], notas: '',
  ingredientes: [
    { texto: 'Harina', variedad: null },
    { texto: 'Manzana', variedad: 'Manzana' },
    { texto: 'Piña', variedad: 'Piña' },
  ],
}

describe('recetario', () => {
  it('muestra los ingredientes generales más los de la variedad', () => {
    expect(ingredientesPara(receta, 'Piña').map((i) => i.texto)).toEqual(['Harina', 'Piña'])
    expect(ingredientesPara(receta, null).map((i) => i.texto)).toEqual(['Harina'])
  })
  it('limpia renglones vacíos y viñetas', () => {
    expect(renglones('- 2 huevos\n\n  • 1 taza de azúcar \n* sal')).toEqual(['2 huevos', '1 taza de azúcar', 'sal'])
  })
  it('una opción por producto y variedad, sumando cantidades', () => {
    const p = {
      id: 'x', numero: 9, casa: '24', cliente: '',
      lineas: [
        { productoId: 'a', nombre: 'Tartaleta', variedad: 'Piña', precio: 15, cantidad: 2 },
        { productoId: 'b', nombre: 'Tiramisú', variedad: null, precio: 20, cantidad: 1 },
        { productoId: 'a', nombre: 'Tartaleta', variedad: 'Piña', precio: 15, cantidad: 1 },
        { productoId: 'a', nombre: 'Tartaleta', variedad: 'Manjar', precio: 15, cantidad: 1 },
      ],
    } as Pedido
    const o = opcionesReceta(p)
    expect(o).toHaveLength(3)
    expect(o[0]).toEqual({ productoId: 'a', nombre: 'Tartaleta', variedad: 'Piña', pedido: { id: 'x', numero: 9, titulo: 'Casa 24', cantidad: 3 } })
  })
})
