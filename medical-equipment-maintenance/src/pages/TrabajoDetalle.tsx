import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icono from '../components/Icono'
import { ESTADOS, nombreEquipo } from '../components/TarjetaTrabajo'
import { Boton, Campo, Desplegable, Encabezado, Entrada, Estado, Fila, Hoja, Opciones, cx } from '../components/ui'
import {
  actualizarUltimoServicio,
  borrarTrabajo,
  db,
  nuevo,
  tocar,
  type EstadoCheque,
  type EstadoTrabajo,
  type Gasto,
  type MetodoPago,
  type Pago,
  type Trabajo,
} from '../db'
import { rentabilidad, totalCobrado } from '../lib/calc'
import { fecha, fechaLarga, hora12, hoyISO, num, q } from '../lib/format'
import { useCategorias, useConfig } from '../lib/hooks'

const METODOS: { valor: MetodoPago; texto: string }[] = [
  { valor: 'efectivo', texto: 'Efectivo' },
  { valor: 'transferencia', texto: 'Transferencia' },
  { valor: 'cheque', texto: 'Cheque' },
]
const TEXTO_METODO: Record<MetodoPago, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', cheque: 'Cheque' }

const RESULTADO = {
  verde: { fondo: 'bg-verde text-white', titulo: 'Le dejó ganancia' },
  amarillo: { fondo: 'bg-etiqueta text-tinta', titulo: 'Ganancia baja' },
  rojo: { fondo: 'bg-rojo text-white', titulo: 'Perdió dinero' },
  gris: { fondo: 'bg-hoja text-tinta', titulo: 'Aún sin datos' },
}

/** El botón grande con lo que toca hacer después. */
const SIGUIENTE: Partial<Record<EstadoTrabajo, { texto: string; a: EstadoTrabajo }>> = {
  solicitado: { texto: 'Confirmar la visita', a: 'agendado' },
  agendado: { texto: 'Marcar como realizado', a: 'realizado' },
}

export default function TrabajoDetalle() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const cfg = useConfig()
  const categorias = useCategorias()
  const [pagoAbierto, setPagoAbierto] = useState<Pago | 'nuevo' | null>(null)
  const [gastoAbierto, setGastoAbierto] = useState<Gasto | 'nuevo' | null>(null)

  const datos = useLiveQuery(async () => {
    const t = await db.trabajos.get(id)
    if (!t) return { t: undefined }
    return {
      t,
      cliente: await db.clientes.get(t.clienteId),
      equipo: t.equipoId ? await db.equipos.get(t.equipoId) : undefined,
      pagos: (await db.pagos.where('trabajoId').equals(id).toArray()).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      gastos: (await db.gastos.where('trabajoId').equals(id).toArray()).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    }
  }, [id])

  if (!datos) return null
  const { t } = datos
  if (!t) return <Encabezado titulo="No se encontró el trabajo" atras />
  const { cliente, equipo, pagos = [], gastos = [] } = datos
  const r = rentabilidad(t, pagos, gastos, categorias, cfg)
  const nombreCat = (c: string) => categorias.find((x) => x.id === c)?.nombre ?? c
  const res = RESULTADO[r.color]
  const sig = SIGUIENTE[t.estado]
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0)
  const pasoActual = ESTADOS.findIndex((e) => e.valor === t.estado)

  async function cambiarEstado(estado: EstadoTrabajo) {
    const n = tocar({ ...t!, estado })
    await db.trabajos.put(n)
    await actualizarUltimoServicio(n)
  }

  async function borrar() {
    if (!confirm('¿Borrar este trabajo con sus pagos y gastos?')) return
    await borrarTrabajo(id)
    nav(-1)
  }

  return (
    <>
      <Encabezado
        titulo=""
        atras
        accion={
          <Boton variante="texto" icono="editar" className="min-h-12 px-3" onClick={() => nav(`/trabajos/${id}/editar`)}>
            Editar
          </Boton>
        }
      />

      <section className="mb-6 px-1">
        {t.prioridad === 'urgente' && (
          <div className="mb-2">
            <Estado color="rojo">Urgente</Estado>
          </div>
        )}
        <h1 className="text-[1.75rem] leading-tight font-bold">
          {t.tipo === 'correctivo' ? 'Reparación' : 'Mantenimiento'}
          {equipo ? ` de ${equipo.tipo.toLowerCase()}` : ''}
        </h1>
        <button className="mt-1 block text-left text-lg font-bold text-primario" onClick={() => cliente && nav(`/clientes/${cliente.id}`)}>
          {cliente?.nombre ?? 'Cliente borrado'}
        </button>
        <p className="mt-3 flex items-center gap-2 text-gris">
          <Icono nombre="agenda" className="h-5 w-5 shrink-0" />
          <span className="first-letter:uppercase">
            {fechaLarga(t.fecha)}
            {t.hora && `, ${hora12(t.hora)}`}
          </span>
        </p>
        <p className="mt-1 flex items-center gap-2 text-gris">
          <Icono nombre="lugar" className="h-5 w-5 shrink-0" />
          {[cliente?.municipio, cliente?.departamento].filter(Boolean).join(', ')}
        </p>
        {t.descripcion && <p className="mt-3 rounded-2xl bg-hoja px-4 py-3">{t.descripcion}</p>}
      </section>

      {/* Avance del trabajo: es una secuencia real, por eso va numerada. */}
      <ol className="mb-4 grid grid-cols-4 gap-1.5" aria-label="Avance del trabajo">
        {ESTADOS.map((e, i) => {
          const hecho = i <= pasoActual
          return (
            <li key={e.valor}>
              <button onClick={() => cambiarEstado(e.valor)} className="flex w-full flex-col items-center gap-1.5" aria-current={i === pasoActual ? 'step' : undefined}>
                <span className={cx('h-2 w-full rounded-full', hecho ? 'bg-primario' : 'bg-linea')} />
                <span className={cx('text-sm', i === pasoActual ? 'font-bold text-primario' : hecho ? 'text-tinta' : 'text-gris')}>{e.texto}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="mb-6">
        {sig && (
          <Boton className="w-full" icono="check" onClick={() => cambiarEstado(sig.a)}>
            {sig.texto}
          </Boton>
        )}
        {t.estado === 'realizado' && (
          <Boton className="w-full" icono="dinero" onClick={() => setPagoAbierto('nuevo')}>
            Registrar el pago
          </Boton>
        )}
        {t.estado === 'cobrado' && (
          <p className="flex items-center justify-center gap-2 rounded-2xl bg-verde-suave py-4 font-bold text-verde">
            <Icono nombre="check" /> Trabajo terminado y cobrado
          </p>
        )}
      </div>

      <section className={cx('mb-3 rounded-3xl p-5', res.fondo)}>
        <p className="font-bold">{res.titulo}</p>
        <p className="tabular text-[2.4rem] leading-tight font-bold">{q(r.utilidad)}</p>
        {r.ingreso > 0 && (
          <p className="opacity-90">
            {r.utilidad >= 0
              ? `De cada Q 100 que cobra, le quedan Q ${r.margen.toFixed(0)}`
              : `Gastó ${q(-r.utilidad)} más de lo que cobró`}
            {r.cobrado < t.precio && ' (según el precio acordado)'}
          </p>
        )}
      </section>

      <div className="space-y-3">
        <Desplegable titulo="¿Cómo se calcula?">
          <Fila etiqueta={r.cobrado >= t.precio ? 'Le pagaron' : 'Precio acordado'} valor={q(r.ingreso)} />
          <Fila etiqueta="Menos viáticos" valor={q(r.viaticos)} />
          <Fila etiqueta="Menos materiales" valor={q(r.materiales)} />
          <Fila etiqueta="Menos imprevistos" valor={q(r.imprevistos)} />
          <Fila etiqueta={`Menos su tiempo (${t.horasTrabajo + t.horasViaje} h)`} valor={q(r.manoObra)} />
          <Fila etiqueta="Le quedó" valor={q(r.utilidad)} fuerte />
          {t.horasTrabajo + t.horasViaje === 0 && (
            <p className="mt-2 text-sm text-gris">Anote en "Editar" las horas de trabajo y de viaje para que se cuente su tiempo.</p>
          )}
        </Desplegable>

        <Desplegable titulo="Pagos" resumen={`${q(r.cobrado)} de ${q(t.precio)}`}>
          {pagos.length === 0 && <p className="py-1 text-gris">Todavía no ha recibido pagos.</p>}
          <div className="-mx-4 divide-y divide-linea">
            {pagos.map((p) => (
              <button key={p.id} onClick={() => setPagoAbierto(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-papel">
                <span className="flex-1">
                  <span className="block font-bold">{TEXTO_METODO[p.metodo]}</span>
                  <span className="block text-sm text-gris">{fecha(p.fecha)}</span>
                </span>
                {p.metodo === 'cheque' && p.estadoCheque !== 'cobrado' && (
                  <Estado color={p.estadoCheque === 'rechazado' ? 'rojo' : 'amarillo'}>{p.estadoCheque === 'rechazado' ? 'Rechazado' : 'Sin cambiar'}</Estado>
                )}
                <span className="tabular font-bold">{q(p.monto)}</span>
              </button>
            ))}
          </div>
          {r.saldo > 0 && <p className="py-2 font-bold text-[#7a5a00]">Falta cobrar {q(r.saldo)}</p>}
          <Boton variante="secundario" icono="mas" className="mt-2 w-full" onClick={() => setPagoAbierto('nuevo')}>
            Agregar pago
          </Boton>
        </Desplegable>

        <Desplegable titulo="Gastos" resumen={q(totalGastos)}>
          {gastos.length === 0 && <p className="py-1 text-gris">No ha anotado gastos.</p>}
          <div className="-mx-4 divide-y divide-linea">
            {gastos.map((g) => (
              <button key={g.id} onClick={() => setGastoAbierto(g)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-papel">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{nombreCat(g.categoria)}</span>
                  {g.descripcion && <span className="block truncate text-sm text-gris">{g.descripcion}</span>}
                </span>
                <span className="tabular font-bold">{q(g.monto)}</span>
              </button>
            ))}
          </div>
          <Boton variante="secundario" icono="mas" className="mt-2 w-full" onClick={() => setGastoAbierto('nuevo')}>
            Agregar gasto
          </Boton>
        </Desplegable>

        {equipo && (
          <Desplegable titulo="Datos del equipo">
            <Fila etiqueta="Equipo" valor={nombreEquipo(equipo)} />
            {equipo.serie && <Fila etiqueta="Serie" valor={equipo.serie} />}
            {equipo.ubicacion && <Fila etiqueta="Ubicación" valor={equipo.ubicacion} />}
          </Desplegable>
        )}
      </div>

      <Boton variante="peligro" className="mt-6 w-full" onClick={borrar}>
        Borrar este trabajo
      </Boton>

      <Hoja abierta={!!pagoAbierto} titulo={pagoAbierto && pagoAbierto !== 'nuevo' ? 'Cambiar pago' : 'Registrar pago'} onCerrar={() => setPagoAbierto(null)}>
        {pagoAbierto && (
          <FormPago
            key={pagoAbierto === 'nuevo' ? 'nuevo' : pagoAbierto.id}
            editando={pagoAbierto === 'nuevo' ? null : pagoAbierto}
            trabajo={t}
            saldo={r.saldo}
            pagos={pagos}
            onCerrar={() => setPagoAbierto(null)}
          />
        )}
      </Hoja>
      <Hoja abierta={!!gastoAbierto} titulo={gastoAbierto && gastoAbierto !== 'nuevo' ? 'Cambiar gasto' : 'Anotar gasto'} onCerrar={() => setGastoAbierto(null)}>
        {gastoAbierto && (
          <FormGasto
            key={gastoAbierto === 'nuevo' ? 'nuevo' : gastoAbierto.id}
            editando={gastoAbierto === 'nuevo' ? null : gastoAbierto}
            trabajo={t}
            onCerrar={() => setGastoAbierto(null)}
          />
        )}
      </Hoja>
    </>
  )
}

function FormPago({ editando, trabajo, saldo, pagos, onCerrar }: { editando: Pago | null; trabajo: Trabajo; saldo: number; pagos: Pago[]; onCerrar: () => void }) {
  const [monto, setMonto] = useState(editando ? String(editando.monto) : saldo > 0 ? String(saldo) : '')
  const [metodo, setMetodo] = useState<MetodoPago>(editando?.metodo ?? 'efectivo')
  const [fechaP, setFechaP] = useState(editando?.fecha ?? hoyISO())
  const [referencia, setReferencia] = useState(editando?.referencia ?? '')
  const [factura, setFactura] = useState(editando?.factura ?? '')
  const [estadoCheque, setEstadoCheque] = useState<EstadoCheque>(editando?.estadoCheque ?? 'pendiente')
  const [mas, setMas] = useState(!!(editando?.referencia || editando?.factura))

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    const datos = { trabajoId: trabajo.id, monto: num(monto), metodo, fecha: fechaP, referencia, factura, estadoCheque: metodo === 'cheque' ? estadoCheque : ('cobrado' as const) }
    const p = editando ? tocar({ ...editando, ...datos }) : nuevo(datos)
    await db.pagos.put(p)
    // Si con este pago ya se cubrió el precio, el trabajo pasa a "cobrado".
    const todos = [...pagos.filter((x) => x.id !== p.id), p]
    if (trabajo.precio > 0 && totalCobrado(todos) >= trabajo.precio && trabajo.estado === 'realizado') {
      await db.trabajos.put(tocar({ ...trabajo, estado: 'cobrado' }))
    }
    onCerrar()
  }

  async function borrar() {
    if (!editando || !confirm('¿Borrar este pago?')) return
    await db.pagos.delete(editando.id)
    onCerrar()
  }

  return (
    <form onSubmit={guardar} className="space-y-5">
      <Campo etiqueta="¿Cuánto le pagaron?" ayuda={saldo > 0 && !editando ? `Le deben ${q(saldo)}. Si le pagaron solo una parte, cambie el monto.` : undefined}>
        <Entrada required inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} className="tabular text-2xl font-bold" />
      </Campo>
      <Campo etiqueta="¿Cómo le pagaron?">
        <Opciones valor={metodo} onChange={setMetodo} opciones={METODOS} />
      </Campo>
      {metodo === 'cheque' && (
        <Campo etiqueta="¿Ya cambió el cheque?">
          <Opciones
            valor={estadoCheque}
            onChange={setEstadoCheque}
            opciones={[
              { valor: 'pendiente', texto: 'Todavía no' },
              { valor: 'cobrado', texto: 'Sí', activo: 'border-verde bg-verde text-white' },
              { valor: 'rechazado', texto: 'Rebotó', activo: 'border-rojo bg-rojo text-white' },
            ]}
          />
        </Campo>
      )}
      {mas ? (
        <>
          <Campo etiqueta="Fecha del pago">
            <Entrada type="date" value={fechaP} onChange={(e) => setFechaP(e.target.value)} />
          </Campo>
          <Campo etiqueta={metodo === 'cheque' ? 'Número de cheque y banco' : 'Número de referencia'}>
            <Entrada value={referencia} onChange={(e) => setReferencia(e.target.value)} />
          </Campo>
          <Campo etiqueta="Número de factura">
            <Entrada value={factura} onChange={(e) => setFactura(e.target.value)} />
          </Campo>
        </>
      ) : (
        <Boton type="button" variante="texto" className="w-full" onClick={() => setMas(true)}>
          Agregar fecha, referencia o factura
        </Boton>
      )}
      <Boton type="submit" className="w-full">
        Guardar pago
      </Boton>
      {editando && (
        <Boton type="button" variante="peligro" className="w-full" onClick={borrar}>
          Borrar este pago
        </Boton>
      )}
    </form>
  )
}

function FormGasto({ editando, trabajo, onCerrar }: { editando: Gasto | null; trabajo: Trabajo; onCerrar: () => void }) {
  const categorias = useCategorias()
  const [categoria, setCategoria] = useState(editando?.categoria ?? 'combustible')
  const [monto, setMonto] = useState(editando ? String(editando.monto) : '')
  const [descripcion, setDescripcion] = useState(editando?.descripcion ?? '')

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    const datos = { trabajoId: trabajo.id, viajeId: editando?.viajeId ?? '', categoria, monto: num(monto), fecha: editando?.fecha ?? trabajo.fecha, descripcion }
    await db.gastos.put(editando ? tocar({ ...editando, ...datos }) : nuevo(datos))
    onCerrar()
  }

  async function borrar() {
    if (!editando || !confirm('¿Borrar este gasto?')) return
    await db.gastos.delete(editando.id)
    onCerrar()
  }

  return (
    <form onSubmit={guardar} className="space-y-5">
      <Campo etiqueta="¿En qué gastó?">
        <Opciones valor={categoria} onChange={setCategoria} columnas={2} opciones={categorias.map((c) => ({ valor: c.id, texto: c.nombre }))} />
      </Campo>
      <Campo etiqueta="¿Cuánto?">
        <Entrada required inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Q 0.00" className="tabular text-2xl font-bold" />
      </Campo>
      <Campo etiqueta="Nota (si quiere)">
        <Entrada value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Por ejemplo: empaque de puerta" />
      </Campo>
      <Boton type="submit" className="w-full">
        Guardar gasto
      </Boton>
      {editando && (
        <Boton type="button" variante="peligro" className="w-full" onClick={borrar}>
          Borrar este gasto
        </Boton>
      )}
    </form>
  )
}
