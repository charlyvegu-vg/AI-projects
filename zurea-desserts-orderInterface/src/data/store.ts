import type { Ajustes, DatosPedido, Fase, Insumo, Movimiento, Pedido, Producto, Receta } from '../types'
import type { NuevoMovimiento } from '../lib/inventario'
import type { DatosApp } from '../lib/respaldo'

export interface Estado {
  cargando: boolean
  error: string | null
  /** null = sin sesión (solo en modo Supabase). */
  usuario: string | null
  pedidos: Pedido[]
  productos: Producto[]
  ajustes: Ajustes
  insumos: Insumo[]
  /** Movimientos recientes del inventario (los más nuevos primero). */
  movimientos: Movimiento[]
}

export interface Store {
  modo: 'local' | 'supabase'
  getState(): Estado
  subscribe(fn: () => void): () => void
  iniciarSesion(email: string, password: string): Promise<void>
  cerrarSesion(): Promise<void>
  crearPedido(datos: DatosPedido): Promise<void>
  editarPedido(id: string, datos: DatosPedido): Promise<void>
  cambiarFase(id: string, fase: Fase): Promise<void>
  silenciar(id: string, silenciado: boolean): Promise<void>
  eliminarPedido(id: string): Promise<void>
  guardarProducto(p: Omit<Producto, 'id' | 'receta'> & { id?: string }): Promise<void>
  eliminarProducto(id: string): Promise<void>
  guardarAjustes(a: Ajustes): Promise<void>
  guardarReceta(productoId: string, receta: Receta | null): Promise<void>
  guardarInsumo(i: Omit<Insumo, 'id'> & { id?: string }): Promise<void>
  eliminarInsumo(id: string): Promise<void>
  /** Aplica entradas y salidas del inventario. Falla si `ref` ya se registró (para no descontar dos veces). */
  registrarMovimientos(movs: NuevoMovimiento[]): Promise<void>
  /** Reemplaza todos los datos por los de un respaldo. */
  restaurar(d: DatosApp): Promise<void>
  /** Pedidos con entrega entre `desde` (incluido) y `hasta` (excluido), en ISO. Para reportes: incluye historial completo. */
  pedidosEntre(desde: string, hasta: string): Promise<Pedido[]>
}

/** Base con suscripción y estado inmutable. */
export abstract class StoreBase {
  protected estado: Estado
  private oyentes = new Set<() => void>()

  constructor(inicial: Estado) {
    this.estado = inicial
  }
  getState = () => this.estado
  subscribe = (fn: () => void) => {
    this.oyentes.add(fn)
    return () => { this.oyentes.delete(fn) }
  }
  protected set(cambios: Partial<Estado>) {
    this.estado = { ...this.estado, ...cambios }
    this.oyentes.forEach((fn) => fn())
  }
}

export function nuevoId(): string {
  // crypto.randomUUID solo existe en https/localhost; respaldo para pruebas en red local.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}
