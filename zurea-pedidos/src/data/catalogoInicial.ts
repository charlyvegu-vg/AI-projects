import type { Producto } from '../types'

export const CATALOGO_INICIAL: Omit<Producto, 'id'>[] = [
  { nombre: 'Tartaleta', variedades: ['Manzana', 'Piña', 'Manjar'], tamano: 'Individual', precio: 15, activo: true, orden: 1, receta: null },
  { nombre: 'Tiramisú en vaso', variedades: [], tamano: 'Individual', precio: 20, activo: true, orden: 2, receta: null },
  { nombre: 'Pan de banano', variedades: [], tamano: '5 porciones', precio: 25, activo: true, orden: 3, receta: null },
  { nombre: 'Pan de naranja', variedades: [], tamano: '5 porciones', precio: 25, activo: true, orden: 4, receta: null },
  { nombre: 'Pan de zanahoria', variedades: [], tamano: 'Aprox. 5 porciones', precio: 35, activo: true, orden: 5, receta: null },
  { nombre: 'Pie grande', variedades: ['Manzana', 'Piña', 'Higo'], tamano: '6 a 8 porciones', precio: 75, activo: true, orden: 6, receta: null },
  { nombre: 'Cheesecake', variedades: ['Jalea de mora', 'Jalea de fresa'], tamano: '', precio: 125, activo: true, orden: 7, receta: null },
]

/** Sin correos por defecto: se agregan en Ajustes → Correos de aviso. */
export const AJUSTES_INICIALES = { timerMin: 15, correos: [] as string[] }
