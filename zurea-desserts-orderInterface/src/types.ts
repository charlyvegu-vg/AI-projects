export type Fase = 'pendiente' | 'preparacion' | 'listo' | 'entregado'

export const FASES: { id: Fase; nombre: string }[] = [
  { id: 'pendiente', nombre: 'Pendiente' },
  { id: 'preparacion', nombre: 'En preparación' },
  { id: 'listo', nombre: 'Listo para entrega' },
  { id: 'entregado', nombre: 'Entregado' },
]

export interface Ingrediente {
  /** Ej. "2 tazas de harina". */
  texto: string
  /** null = se usa en todas las variedades. */
  variedad: string | null
}

/** Lo que una tanda de la receta descuenta del inventario. */
export interface Consumo {
  insumoId: string
  /** En la unidad del insumo (ej. 0.5 si el insumo se lleva en libras). */
  cantidad: number
  /** null = en todas las variedades. */
  variedad: string | null
}

export interface Receta {
  rinde: string
  /** Cuántas unidades del producto salen de una tanda (para calcular tandas por pedido). null = no se sabe. */
  unidadesPorTanda?: number | null
  ingredientes: Ingrediente[]
  pasos: string[]
  notas: string
  consumo?: Consumo[]
}

/** Contable: cajas, latas, barras… avisa al llegar al mínimo. Pesado: libras, kilos… avisa al bajar del porcentaje. */
export type TipoInsumo = 'contable' | 'pesado'

export interface Insumo {
  id: string
  nombre: string
  tipo: TipoInsumo
  /** "caja", "lata", "lb", "kg"… */
  unidad: string
  cantidad: number
  /** Pesados: cantidad que equivale al 100 % (se actualiza al registrar una compra). */
  referencia: number
  /** Contables: avisa con esta cantidad o menos (3 por defecto). Pesados: porcentaje (25 por defecto). */
  alerta: number
}

export type MotivoMovimiento = 'receta' | 'compra' | 'ajuste'

export interface Movimiento {
  id: string
  insumoId: string
  /** Positivo = entra, negativo = sale. */
  cambio: number
  motivo: MotivoMovimiento
  /** Descripción para el historial, ej. "Pedido #12: Tartaleta (piña) ×1 tanda". */
  detalle: string
  /** Para no descontar dos veces la misma preparación. */
  ref: string | null
  fecha: string
}

export interface Producto {
  id: string
  nombre: string
  variedades: string[]
  tamano: string
  precio: number
  activo: boolean
  orden: number
  /** null = aún no tiene receta. */
  receta: Receta | null
}

/** Copia del producto al momento del pedido (si luego cambia el precio, el pedido no cambia). */
export interface LineaPedido {
  productoId: string
  nombre: string
  variedad: string | null
  precio: number
  cantidad: number
}

export type TipoEntrega = 'asap' | 'programado'

export type MetodoPago = 'efectivo' | 'transferencia'

export interface Pedido {
  id: string
  numero: number
  casa: string
  cliente: string
  lineas: LineaPedido[]
  total: number
  notas: string
  tipo: TipoEntrega
  /** Para "lo antes posible" es la hora en que se creó. */
  entregaEn: string
  timerMin: number
  /** Momento en que arranca el temporizador. */
  timerInicio: string
  fase: Fase
  silenciado: boolean
  /** Momento en que se debe enviar el correo de aviso (null = no aplica). */
  avisoEn: string | null
  avisoEnviado: boolean
  creadoEn: string
  /** Forma de pago (sin indicar en pedidos viejos). */
  pago?: MetodoPago | null
  /** Efectivo: con cuánto paga el cliente (para calcular el cambio). null = exacto o no se sabe. */
  pagaCon?: number | null
}

export type DatosPedido = Pick<
  Pedido,
  'casa' | 'cliente' | 'lineas' | 'notas' | 'tipo' | 'entregaEn' | 'timerMin' | 'pago' | 'pagaCon'
>

export interface Ajustes {
  timerMin: number
  correos: string[]
}
