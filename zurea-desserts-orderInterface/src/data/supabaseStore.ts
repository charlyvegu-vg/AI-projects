import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import type { Ajustes, DatosPedido, Fase, Insumo, Movimiento, Pedido, Producto, Receta } from '../types'
import type { NuevoMovimiento } from '../lib/inventario'
import { derivados } from '../lib/reglas'
import { AJUSTES_INICIALES } from './catalogoInicial'
import { StoreBase, type Store } from './store'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Fila = Record<string, any>

const aPedido = (r: Fila): Pedido => ({
  id: r.id, numero: Number(r.numero), casa: r.casa ?? '', cliente: r.cliente ?? '',
  lineas: r.lineas ?? [], total: Number(r.total), notas: r.notas ?? '', tipo: r.tipo,
  entregaEn: r.entrega_en, timerMin: r.timer_min, timerInicio: r.timer_inicio, fase: r.fase,
  silenciado: r.silenciado, avisoEn: r.aviso_en, avisoEnviado: r.aviso_enviado, creadoEn: r.creado_en,
  pago: r.pago ?? null, pagaCon: r.paga_con == null ? null : Number(r.paga_con),
})

const filaPedido = (p: Partial<Pedido>): Fila => {
  const m: Record<string, string> = {
    casa: 'casa', cliente: 'cliente', lineas: 'lineas', total: 'total', notas: 'notas', tipo: 'tipo',
    entregaEn: 'entrega_en', timerMin: 'timer_min', timerInicio: 'timer_inicio', fase: 'fase',
    silenciado: 'silenciado', avisoEn: 'aviso_en', avisoEnviado: 'aviso_enviado', creadoEn: 'creado_en',
    pago: 'pago', pagaCon: 'paga_con',
  }
  const f: Fila = {}
  for (const [k, v] of Object.entries(p)) if (k in m) f[m[k]] = v
  return f
}

const aProducto = (r: Fila): Producto => ({
  id: r.id, nombre: r.nombre, variedades: r.variedades ?? [], tamano: r.tamano ?? '',
  precio: Number(r.precio), activo: r.activo, orden: r.orden ?? 0, receta: r.receta ?? null,
})

const aInsumo = (r: Fila): Insumo => ({
  id: r.id, nombre: r.nombre, tipo: r.tipo, unidad: r.unidad ?? '', cantidad: Number(r.cantidad),
  referencia: Number(r.referencia), alerta: Number(r.alerta),
})
const aMovimiento = (r: Fila): Movimiento => ({
  id: r.id, insumoId: r.insumo_id, cambio: Number(r.cambio), motivo: r.motivo, detalle: r.detalle ?? '', ref: r.ref, fecha: r.fecha,
})
const porNombre = (a: Insumo, b: Insumo) => a.nombre.localeCompare(b.nombre)
const MOVIMIENTOS_RECIENTES = 200

const aAjustes = (r: Fila | null): Ajustes =>
  r ? { timerMin: r.timer_min, correos: r.correos ?? [] } : AJUSTES_INICIALES

function ok<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

/** Como ok(), pero exige que haya una fila (por ejemplo, después de insertar o actualizar). */
function okFila(res: { data: Fila | null; error: { message: string } | null }): Fila {
  const d = ok(res)
  if (!d) throw new Error('No se encontró el registro')
  return d
}

const DIAS_HISTORIAL = 45

export class SupabaseStore extends StoreBase implements Store {
  modo = 'supabase' as const
  private sb: SupabaseClient
  private canal: RealtimeChannel | null = null

  constructor(url: string, key: string) {
    super({ cargando: true, error: null, usuario: null, pedidos: [], productos: [], ajustes: AJUSTES_INICIALES, insumos: [], movimientos: [] })
    this.sb = createClient(url, key)
    this.sb.auth.onAuthStateChange((_evento, sesion) => {
      const usuario = sesion?.user.email ?? null
      if (usuario === this.estado.usuario && !this.estado.cargando) return
      this.set({ usuario })
      // Fuera del callback para no bloquear el cliente de auth.
      setTimeout(() => (usuario ? this.conectar() : this.desconectar()), 0)
    })
  }

  private async conectar() {
    this.set({ cargando: true, error: null })
    try {
      await this.cargar()
      this.escuchar()
    } catch (e) {
      this.set({ error: (e as Error).message })
    } finally {
      this.set({ cargando: false })
    }
  }

  private desconectar() {
    this.canal?.unsubscribe()
    this.canal = null
    this.set({ cargando: false, pedidos: [], productos: [], insumos: [], movimientos: [] })
  }

  private async cargar() {
    const desde = new Date(Date.now() - DIAS_HISTORIAL * 86_400_000).toISOString()
    const [pedidos, productos, ajustes, insumos, movimientos] = await Promise.all([
      this.sb.from('pedidos').select('*').or(`fase.neq.entregado,entrega_en.gte.${desde}`),
      this.sb.from('productos').select('*').order('orden'),
      this.sb.from('ajustes').select('*').eq('id', 1).maybeSingle(),
      this.sb.from('insumos').select('*'),
      this.sb.from('movimientos').select('*').order('fecha', { ascending: false }).limit(MOVIMIENTOS_RECIENTES),
    ])
    this.set({
      pedidos: (ok(pedidos) ?? []).map(aPedido),
      productos: (ok(productos) ?? []).map(aProducto),
      ajustes: aAjustes(ok(ajustes)),
      insumos: (ok(insumos) ?? []).map(aInsumo).sort(porNombre),
      movimientos: (ok(movimientos) ?? []).map(aMovimiento),
    })
  }

  private escuchar() {
    this.canal?.unsubscribe()
    this.canal = this.sb
      .channel('cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, (c) => {
        if (c.eventType === 'DELETE') this.quitarPedido((c.old as Fila).id)
        else this.ponerPedido(aPedido(c.new))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, (c) => {
        const lista = this.estado.productos.filter((p) => p.id !== ((c.old as Fila)?.id ?? (c.new as Fila).id))
        if (c.eventType !== 'DELETE') lista.push(aProducto(c.new))
        this.set({ productos: lista.sort((a, b) => a.orden - b.orden) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insumos' }, (c) => {
        const lista = this.estado.insumos.filter((i) => i.id !== ((c.old as Fila)?.id ?? (c.new as Fila).id))
        if (c.eventType !== 'DELETE') lista.push(aInsumo(c.new))
        this.set({ insumos: lista.sort(porNombre) })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movimientos' }, (c) => {
        const m = aMovimiento(c.new)
        if (this.estado.movimientos.some((x) => x.id === m.id)) return
        this.set({ movimientos: [m, ...this.estado.movimientos].slice(0, MOVIMIENTOS_RECIENTES) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ajustes' }, (c) => {
        if (c.eventType !== 'DELETE') this.set({ ajustes: aAjustes(c.new) })
      })
      .subscribe((estado) => {
        // Al reconectar (por ejemplo, después de perder el wifi) se recarga todo.
        if (estado === 'SUBSCRIBED') this.cargar().catch((e) => this.set({ error: e.message }))
      })
  }

  private ponerPedido(p: Pedido) {
    this.set({ pedidos: [...this.estado.pedidos.filter((x) => x.id !== p.id), p] })
  }
  private quitarPedido(id: string) {
    this.set({ pedidos: this.estado.pedidos.filter((x) => x.id !== id) })
  }

  private async actualizar(id: string, cambios: Partial<Pedido>) {
    const fila = okFila(await this.sb.from('pedidos').update(filaPedido(cambios)).eq('id', id).select().single())
    this.ponerPedido(aPedido(fila))
  }

  async iniciarSesion(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : error.message)
  }

  async cerrarSesion() {
    await this.sb.auth.signOut()
  }

  async crearPedido(datos: DatosPedido) {
    const creadoEn = new Date().toISOString()
    const fila = filaPedido({ ...datos, ...derivados(datos, creadoEn), creadoEn, fase: 'pendiente', silenciado: false })
    this.ponerPedido(aPedido(okFila(await this.sb.from('pedidos').insert(fila).select().single())))
  }

  async editarPedido(id: string, datos: DatosPedido) {
    const p = this.estado.pedidos.find((x) => x.id === id)
    if (!p) throw new Error('El pedido ya no existe')
    await this.actualizar(id, { ...datos, ...derivados(datos, p.creadoEn, p) })
  }

  async cambiarFase(id: string, fase: Fase) {
    await this.actualizar(id, { fase })
  }

  async silenciar(id: string, silenciado: boolean) {
    await this.actualizar(id, { silenciado })
  }

  async eliminarPedido(id: string) {
    ok(await this.sb.from('pedidos').delete().eq('id', id))
    this.quitarPedido(id)
  }

  async guardarProducto(p: Omit<Producto, 'id' | 'receta'> & { id?: string }) {
    // La receta se guarda aparte (guardarReceta): editar nombre o precio no la toca.
    const { id, ...resto } = p
    ok(id
      ? await this.sb.from('productos').update(resto).eq('id', id)
      : await this.sb.from('productos').insert(resto))
    await this.cargar()
  }

  async eliminarProducto(id: string) {
    ok(await this.sb.from('productos').delete().eq('id', id))
    this.set({ productos: this.estado.productos.filter((p) => p.id !== id) })
  }

  async guardarAjustes(a: Ajustes) {
    ok(await this.sb.from('ajustes').upsert({ id: 1, timer_min: a.timerMin, correos: a.correos }))
    this.set({ ajustes: a })
  }

  async guardarReceta(productoId: string, receta: Receta | null) {
    ok(await this.sb.from('productos').update({ receta }).eq('id', productoId))
    this.set({ productos: this.estado.productos.map((p) => (p.id === productoId ? { ...p, receta } : p)) })
  }

  async guardarInsumo(i: Omit<Insumo, 'id'> & { id?: string }) {
    const { id, ...resto } = i
    const fila = okFila(await (id
      ? this.sb.from('insumos').update(resto).eq('id', id).select().single()
      : this.sb.from('insumos').insert(resto).select().single()))
    this.set({ insumos: [...this.estado.insumos.filter((x) => x.id !== fila.id), aInsumo(fila)].sort(porNombre) })
  }

  async eliminarInsumo(id: string) {
    ok(await this.sb.from('insumos').delete().eq('id', id))
    this.set({ insumos: this.estado.insumos.filter((i) => i.id !== id) })
  }

  async registrarMovimientos(movs: NuevoMovimiento[]) {
    const res = await this.sb.rpc('registrar_movimientos', { movs })
    if (res.error) {
      if (res.error.code === '23505') throw new Error('Esta preparación ya se descontó del inventario.')
      throw new Error(res.error.message)
    }
    await this.cargar()
  }

  async restaurar() {
    throw new Error('Con la base de datos compartida no se restaura desde la tablet. Pide ayuda para importar el respaldo.')
  }

  async pedidosEntre(desde: string, hasta: string) {
    // Supabase devuelve como máximo 1000 filas por consulta: se pide por páginas.
    const pagina = 1000
    const todos: Pedido[] = []
    for (let i = 0; ; i += pagina) {
      const filas = ok(await this.sb.from('pedidos').select('*')
        .gte('entrega_en', desde).lt('entrega_en', hasta)
        .order('entrega_en').range(i, i + pagina - 1)) ?? []
      todos.push(...filas.map(aPedido))
      if (filas.length < pagina) return todos
    }
  }
}
