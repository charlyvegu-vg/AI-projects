import type { Ajustes, DatosPedido, Fase, Insumo, Movimiento, Pedido, Producto, Receta } from '../types'
import { aplicarMovimientos, yaDescontado, type NuevoMovimiento } from '../lib/inventario'
import { derivados } from '../lib/reglas'
import type { DatosApp } from '../lib/respaldo'
import { AJUSTES_INICIALES, CATALOGO_INICIAL } from './catalogoInicial'
import { StoreBase, nuevoId, type Store } from './store'

const CLAVE = 'zurea-datos-v1'
/** Datos de las pruebas con demo: se borran al abrir la versión beta por primera vez. */
const CLAVES_VIEJAS = ['reposteria-pedidos-v1']

function borrarDatosDePrueba() {
  for (const k of CLAVES_VIEJAS) localStorage.removeItem(k)
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i)
    if (k?.startsWith('preparacion:')) localStorage.removeItem(k)
  }
}

interface Guardado { pedidos: Pedido[]; productos: Producto[]; ajustes: Ajustes; insumos: Insumo[]; movimientos: Movimiento[] }

const MAX_MOVIMIENTOS = 500

function leer(): Guardado {
  if (CLAVES_VIEJAS.some((k) => localStorage.getItem(k) !== null)) borrarDatosDePrueba()
  try {
    const raw = localStorage.getItem(CLAVE)
    // Datos guardados antes de existir el inventario no traen esas listas.
    if (raw) return { insumos: [], movimientos: [], ...JSON.parse(raw) }
  } catch { /* datos dañados: se reinicia */ }
  // Primera vez en este dispositivo: se guarda enseguida para que los productos conserven su identificador al recargar.
  const inicial: Guardado = {
    pedidos: [],
    productos: CATALOGO_INICIAL.map((p) => ({ ...p, id: nuevoId() })),
    ajustes: AJUSTES_INICIALES,
    insumos: [],
    movimientos: [],
  }
  localStorage.setItem(CLAVE, JSON.stringify(inicial))
  return inicial
}

/** Datos solo en este dispositivo. Se sincroniza entre pestañas del mismo navegador. */
export class LocalStore extends StoreBase implements Store {
  modo = 'local' as const
  private canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CLAVE) : null

  constructor() {
    super({ cargando: false, error: null, usuario: 'local', ...leer() })
    this.canal?.addEventListener('message', () => this.set(leer()))
    window.addEventListener('storage', (e) => { if (e.key === CLAVE) this.set(leer()) })
  }

  private guardar(cambios: Partial<Guardado>) {
    this.set(cambios)
    const { pedidos, productos, ajustes, insumos, movimientos } = this.estado
    localStorage.setItem(CLAVE, JSON.stringify({ pedidos, productos, ajustes, insumos, movimientos }))
    this.canal?.postMessage('cambio')
  }

  private actualizar(id: string, fn: (p: Pedido) => Pedido) {
    this.guardar({ pedidos: this.estado.pedidos.map((p) => (p.id === id ? fn(p) : p)) })
  }

  async iniciarSesion() {}
  async cerrarSesion() {}

  async crearPedido(datos: DatosPedido) {
    const creadoEn = new Date().toISOString()
    const numero = Math.max(0, ...this.estado.pedidos.map((p) => p.numero)) + 1
    const pedido: Pedido = {
      ...datos, ...derivados(datos, creadoEn),
      id: nuevoId(), numero, fase: 'pendiente', silenciado: false, creadoEn,
    }
    this.guardar({ pedidos: [...this.estado.pedidos, pedido] })
  }

  async editarPedido(id: string, datos: DatosPedido) {
    this.actualizar(id, (p) => ({ ...p, ...datos, ...derivados(datos, p.creadoEn, p) }))
  }

  async cambiarFase(id: string, fase: Fase) {
    this.actualizar(id, (p) => ({ ...p, fase }))
  }

  async silenciar(id: string, silenciado: boolean) {
    this.actualizar(id, (p) => ({ ...p, silenciado }))
  }

  async eliminarPedido(id: string) {
    this.guardar({ pedidos: this.estado.pedidos.filter((p) => p.id !== id) })
  }

  async guardarProducto(p: Omit<Producto, 'id' | 'receta'> & { id?: string }) {
    const { productos } = this.estado
    const existe = p.id && productos.some((x) => x.id === p.id)
    this.guardar({
      productos: existe
        ? productos.map((x) => (x.id === p.id ? ({ ...x, ...p, id: x.id } as Producto) : x))
        : [...productos, { ...p, receta: null, id: nuevoId() }],
    })
  }

  async eliminarProducto(id: string) {
    this.guardar({ productos: this.estado.productos.filter((p) => p.id !== id) })
  }

  async guardarAjustes(ajustes: Ajustes) {
    this.guardar({ ajustes })
  }

  async guardarReceta(productoId: string, receta: Receta | null) {
    this.guardar({ productos: this.estado.productos.map((p) => (p.id === productoId ? { ...p, receta } : p)) })
  }

  async guardarInsumo(i: Omit<Insumo, 'id'> & { id?: string }) {
    const { insumos } = this.estado
    const existe = i.id && insumos.some((x) => x.id === i.id)
    this.guardar({
      insumos: existe ? insumos.map((x) => (x.id === i.id ? ({ ...i, id: x.id } as Insumo) : x)) : [...insumos, { ...i, id: nuevoId() }],
    })
  }

  async eliminarInsumo(id: string) {
    this.guardar({ insumos: this.estado.insumos.filter((i) => i.id !== id) })
  }

  async registrarMovimientos(movs: NuevoMovimiento[]) {
    const ref = movs.find((m) => m.ref)?.ref
    if (ref && yaDescontado(this.estado.movimientos, ref)) throw new Error('Esta preparación ya se descontó del inventario.')
    const fecha = new Date().toISOString()
    const nuevos: Movimiento[] = movs.map((m) => ({ ...m, id: nuevoId(), fecha }))
    this.guardar({
      insumos: aplicarMovimientos(this.estado.insumos, movs),
      movimientos: [...nuevos.reverse(), ...this.estado.movimientos].slice(0, MAX_MOVIMIENTOS),
    })
  }

  async restaurar(d: DatosApp) {
    const { pedidos, productos, ajustes, insumos, movimientos } = d
    this.guardar({ pedidos, productos, ajustes, insumos, movimientos })
  }

  async pedidosEntre(desde: string, hasta: string) {
    const d = Date.parse(desde), h = Date.parse(hasta)
    return this.estado.pedidos.filter((p) => { const t = Date.parse(p.entregaEn); return t >= d && t < h })
  }
}
