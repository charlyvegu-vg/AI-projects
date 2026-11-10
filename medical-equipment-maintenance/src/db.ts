import Dexie, { type EntityTable } from 'dexie'

// Todas las tablas tienen id de texto (UUID) y updatedAt, para poder
// sincronizar con Supabase en la Fase 2 sin cambiar la estructura.
interface Base {
  id: string
  createdAt: string
  updatedAt: string
}

export interface Cliente extends Base {
  nombre: string
  departamento: string
  municipio: string
  direccion: string
  contacto: string
  telefono: string
  correo: string
  notas: string
}

export interface Equipo extends Base {
  clienteId: string
  tipo: string
  marca: string
  modelo: string
  serie: string
  ubicacion: string
  frecuenciaMeses: number // 0 = sin mantenimiento preventivo
  ultimoServicio: string // 'aaaa-mm-dd' o ''
}

export type TipoTrabajo = 'preventivo' | 'correctivo'
export type Prioridad = 'normal' | 'urgente'
export type EstadoTrabajo = 'solicitado' | 'agendado' | 'realizado' | 'cobrado'

export interface Trabajo extends Base {
  clienteId: string
  equipoId: string // '' si no aplica
  tipo: TipoTrabajo
  prioridad: Prioridad
  estado: EstadoTrabajo
  fecha: string // 'aaaa-mm-dd'
  hora: string // 'HH:mm' o ''
  duracionHoras: number
  horasTrabajo: number
  horasViaje: number
  precio: number // monto acordado a cobrar
  descripcion: string
  viajeId: string // Fase 2
  historico: boolean
}

export type MetodoPago = 'efectivo' | 'transferencia' | 'cheque'
export type EstadoCheque = 'pendiente' | 'cobrado' | 'rechazado'

export interface Pago extends Base {
  trabajoId: string
  monto: number
  metodo: MetodoPago
  fecha: string
  referencia: string
  factura: string
  estadoCheque: EstadoCheque // solo aplica a cheques
}

export interface Gasto extends Base {
  trabajoId: string
  viajeId: string // Fase 2: viáticos compartidos
  categoria: string
  monto: number
  fecha: string
  descripcion: string
}

export interface Viaje extends Base {
  fecha: string
  departamento: string
  reparto: 'iguales' | 'porcentaje'
  porcentajes: Record<string, number>
}

export type GrupoCategoria = 'viaticos' | 'materiales' | 'imprevistos'

export interface Categoria {
  id: string
  nombre: string
  grupo: GrupoCategoria
}

export interface Config {
  id: 'config'
  nombreTecnico: string
  telefonoTecnico: string
  correoTecnico: string
  nit: string
  tarifaHora: number
  diasAviso: number
  margenMinimo: number // % para pasar de amarillo a verde
}

export const db = new Dexie('agenda-tecnica') as Dexie & {
  clientes: EntityTable<Cliente, 'id'>
  equipos: EntityTable<Equipo, 'id'>
  trabajos: EntityTable<Trabajo, 'id'>
  pagos: EntityTable<Pago, 'id'>
  gastos: EntityTable<Gasto, 'id'>
  viajes: EntityTable<Viaje, 'id'>
  categorias: EntityTable<Categoria, 'id'>
  config: EntityTable<Config, 'id'>
}

db.version(1).stores({
  clientes: 'id, nombre, departamento',
  equipos: 'id, clienteId',
  trabajos: 'id, clienteId, equipoId, fecha, estado, viajeId',
  pagos: 'id, trabajoId, fecha',
  gastos: 'id, trabajoId, viajeId, fecha',
  viajes: 'id, fecha',
  categorias: 'id',
  config: 'id',
})

export const CONFIG_INICIAL: Config = {
  id: 'config',
  nombreTecnico: '',
  telefonoTecnico: '',
  correoTecnico: '',
  nit: '',
  tarifaHora: 75,
  diasAviso: 15,
  margenMinimo: 20,
}

export const CATEGORIAS_INICIALES: Categoria[] = [
  { id: 'combustible', nombre: 'Combustible', grupo: 'viaticos' },
  { id: 'hospedaje', nombre: 'Hospedaje', grupo: 'viaticos' },
  { id: 'alimentacion', nombre: 'Alimentación', grupo: 'viaticos' },
  { id: 'peajes', nombre: 'Peajes / parqueo', grupo: 'viaticos' },
  { id: 'materiales', nombre: 'Materiales y repuestos', grupo: 'materiales' },
  { id: 'imprevistos', nombre: 'Imprevistos', grupo: 'imprevistos' },
]

export const DEPARTAMENTOS = [
  'Alta Verapaz',
  'Baja Verapaz',
  'Chimaltenango',
  'Chiquimula',
  'El Progreso',
  'Escuintla',
  'Guatemala',
  'Huehuetenango',
  'Izabal',
  'Jalapa',
  'Jutiapa',
  'Petén',
  'Quetzaltenango',
  'Quiché',
  'Retalhuleu',
  'Sacatepéquez',
  'San Marcos',
  'Santa Rosa',
  'Sololá',
  'Suchitepéquez',
  'Totonicapán',
  'Zacapa',
]

export const TIPOS_EQUIPO = [
  'Autoclave',
  'Monitor de signos vitales',
  'Electrocardiógrafo',
  'Desfibrilador',
  'Ultrasonido',
  'Rayos X',
  'Unidad dental',
  'Compresor dental',
  'Centrífuga',
  'Analizador de química',
  'Incubadora neonatal',
  'Máquina de anestesia',
  'Concentrador de oxígeno',
  'Bomba de infusión',
  'Lámpara quirúrgica',
  'Electrobisturí',
]

/** Genera un id único (funciona también en http:// desde el celular). */
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && window.isSecureContext) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

const ahora = () => new Date().toISOString()

/** Crea un registro nuevo con id y fechas de control. */
export function nuevo<T extends object>(datos: T): T & Base {
  const t = ahora()
  return { ...datos, id: uid(), createdAt: t, updatedAt: t }
}

export function tocar<T extends object>(datos: T): T & { updatedAt: string } {
  return { ...datos, updatedAt: ahora() }
}

/** Borra un trabajo con sus pagos y gastos. */
export async function borrarTrabajo(id: string) {
  await db.transaction('rw', db.trabajos, db.pagos, db.gastos, async () => {
    await db.pagos.where('trabajoId').equals(id).delete()
    await db.gastos.where('trabajoId').equals(id).delete()
    await db.trabajos.delete(id)
  })
}

/** Borra un cliente con todos sus equipos, trabajos, pagos y gastos. */
export async function borrarCliente(id: string) {
  const trabajos = await db.trabajos.where('clienteId').equals(id).primaryKeys()
  await db.transaction('rw', [db.clientes, db.equipos, db.trabajos, db.pagos, db.gastos], async () => {
    await db.pagos.where('trabajoId').anyOf(trabajos).delete()
    await db.gastos.where('trabajoId').anyOf(trabajos).delete()
    await db.trabajos.where('clienteId').equals(id).delete()
    await db.equipos.where('clienteId').equals(id).delete()
    await db.clientes.delete(id)
  })
}

/**
 * Cuando un trabajo preventivo queda "realizado", actualiza la fecha del
 * último servicio del equipo (así la próxima fecha se recalcula sola).
 */
export async function actualizarUltimoServicio(t: Trabajo) {
  if (!t.equipoId || (t.estado !== 'realizado' && t.estado !== 'cobrado')) return
  const eq = await db.equipos.get(t.equipoId)
  if (!eq) return
  if (!eq.ultimoServicio || t.fecha > eq.ultimoServicio) {
    await db.equipos.update(eq.id, { ultimoServicio: t.fecha, updatedAt: ahora() })
  }
}
