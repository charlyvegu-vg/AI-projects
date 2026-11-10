import { db, type Config } from '../db'
import { nombreEquipo } from '../components/TarjetaTrabajo'
import { rentabilidad } from './calc'
import { agruparPagos } from './consultas'
import { fecha, finDeMes, inicioSemana, nombreMes, sumarDias } from './format'

export type TipoPeriodo = 'semana' | 'mes'

export interface Periodo {
  tipo: TipoPeriodo
  desde: string
  hasta: string
  titulo: string // "Semana del 9 al 15 de noviembre" / "Noviembre 2026"
  archivo: string // parte del nombre del archivo
}

export function periodo(tipo: TipoPeriodo, referencia: string): Periodo {
  if (tipo === 'semana') {
    const desde = inicioSemana(referencia)
    const hasta = sumarDias(desde, 6)
    return { tipo, desde, hasta, titulo: `Semana del ${fecha(desde)} al ${fecha(hasta)}`, archivo: `semana-${desde}` }
  }
  const desde = referencia.slice(0, 8) + '01'
  const nm = nombreMes(desde)
  return { tipo, desde, hasta: finDeMes(desde), titulo: nm.charAt(0).toUpperCase() + nm.slice(1), archivo: `mes-${desde.slice(0, 7)}` }
}

export function moverPeriodo(p: Periodo, pasos: number): Periodo {
  if (p.tipo === 'semana') return periodo('semana', sumarDias(p.desde, 7 * pasos))
  const [a, m] = p.desde.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1 + pasos, 1)).toISOString().slice(0, 10)
  return periodo('mes', d)
}

export interface FilaReporte {
  id: string
  fecha: string
  cliente: string
  departamento: string
  equipo: string
  tipo: string
  estado: string
  metodos: string
  factura: string
  precio: number
  cobrado: number
  pendiente: number
  viaticos: number
  materiales: number
  imprevistos: number
  manoObra: number
  utilidad: number
  margen: number
}

export interface Reporte {
  periodo: Periodo
  filas: FilaReporte[]
  totales: {
    trabajos: number
    preventivos: number
    correctivos: number
    ingreso: number
    cobrado: number
    pendiente: number
    gastos: number // viáticos + materiales + imprevistos
    manoObra: number
    utilidad: number
    margen: number
  }
  tecnico: Config
}

const METODO: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', cheque: 'Cheque' }

/** Trabajos realizados (o ya cobrados) con fecha dentro del período. */
export async function armarReporte(p: Periodo, cfg: Config): Promise<Reporte> {
  const [trabajos, clientes, equipos, pagos, gastos, categorias] = await Promise.all([
    db.trabajos.where('fecha').between(p.desde, p.hasta, true, true).toArray(),
    db.clientes.toArray(),
    db.equipos.toArray(),
    db.pagos.toArray(),
    db.gastos.toArray(),
    db.categorias.toArray(),
  ])
  const cli = new Map(clientes.map((c) => [c.id, c]))
  const eqs = new Map(equipos.map((e) => [e.id, e]))
  const pagosDe = agruparPagos(pagos)

  const filas = trabajos
    .filter((t) => t.estado === 'realizado' || t.estado === 'cobrado')
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .map((t): FilaReporte => {
      const ps = pagosDe.get(t.id) ?? []
      const r = rentabilidad(t, ps, gastos.filter((g) => g.trabajoId === t.id), categorias, cfg)
      const c = cli.get(t.clienteId)
      return {
        id: t.id,
        fecha: t.fecha,
        cliente: c?.nombre ?? '(borrado)',
        departamento: c?.departamento ?? '',
        equipo: nombreEquipo(eqs.get(t.equipoId)),
        tipo: t.tipo === 'preventivo' ? 'Mantenimiento' : 'Reparación',
        estado: t.estado === 'cobrado' ? 'Cobrado' : 'Falta cobrar',
        metodos: [...new Set(ps.map((x) => METODO[x.metodo]))].join(', '),
        factura: ps.map((x) => x.factura).filter(Boolean).join(', '),
        precio: r.ingreso,
        cobrado: r.cobrado,
        pendiente: r.saldo,
        viaticos: r.viaticos,
        materiales: r.materiales,
        imprevistos: r.imprevistos,
        manoObra: r.manoObra,
        utilidad: r.utilidad,
        margen: r.margen,
      }
    })

  const suma = (k: keyof FilaReporte) => filas.reduce((s, f) => s + (f[k] as number), 0)
  const ingreso = suma('precio')
  const utilidad = suma('utilidad')
  return {
    periodo: p,
    filas,
    tecnico: cfg,
    totales: {
      trabajos: filas.length,
      preventivos: filas.filter((f) => f.tipo === 'Mantenimiento').length,
      correctivos: filas.filter((f) => f.tipo === 'Reparación').length,
      ingreso,
      cobrado: suma('cobrado'),
      pendiente: suma('pendiente'),
      gastos: suma('viaticos') + suma('materiales') + suma('imprevistos'),
      manoObra: suma('manoObra'),
      utilidad,
      margen: ingreso > 0 ? (utilidad / ingreso) * 100 : 0,
    },
  }
}
