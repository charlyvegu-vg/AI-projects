import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router-dom'
import TarjetaTrabajo from '../components/TarjetaTrabajo'
import { Encabezado, Grupo, Opciones, Vacio } from '../components/ui'
import { db } from '../db'
import { chequesPendientes, totalCobrado } from '../lib/calc'
import { agruparPagos, esPendiente } from '../lib/consultas'
import { q } from '../lib/format'

type Filtro = 'proximos' | 'por-cobrar' | 'hechos'

export default function Trabajos() {
  const [qs, setQs] = useSearchParams()
  const filtro = (qs.get('filtro') as Filtro) ?? 'proximos'
  const datos = useLiveQuery(async () => {
    const [trabajos, clientes, equipos, pagos] = await Promise.all([db.trabajos.toArray(), db.clientes.toArray(), db.equipos.toArray(), db.pagos.toArray()])
    return { trabajos, clientes, equipos, pagos }
  }, [])
  if (!datos) return null

  const cli = new Map(datos.clientes.map((c) => [c.id, c]))
  const eqs = new Map(datos.equipos.map((e) => [e.id, e]))
  const pagosDe = agruparPagos(datos.pagos)
  const falta = (id: string, precio: number) => Math.max(0, precio - totalCobrado(pagosDe.get(id) ?? []))

  let lista = datos.trabajos
  let vacio = ''
  if (filtro === 'proximos') {
    lista = lista.filter(esPendiente).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    vacio = 'No tiene trabajos pendientes. Toque "Nuevo" para agendar uno.'
  } else if (filtro === 'por-cobrar') {
    lista = lista
      .filter((t) => (t.estado === 'realizado' || t.estado === 'cobrado') && (falta(t.id, t.precio) > 0.009 || chequesPendientes(pagosDe.get(t.id) ?? []) > 0))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
    vacio = 'No le deben nada. Todos los trabajos están cobrados.'
  } else {
    lista = lista.filter((t) => !esPendiente(t)).sort((a, b) => b.fecha.localeCompare(a.fecha))
    vacio = 'Todavía no hay trabajos realizados.'
  }
  const totalFalta = lista.reduce((s, t) => s + falta(t.id, t.precio), 0)
  const cheques = chequesPendientes(datos.pagos)

  return (
    <>
      <Encabezado titulo="Trabajos" />
      <div className="mb-5">
        <Opciones<Filtro>
          valor={filtro}
          onChange={(f) => setQs({ filtro: f }, { replace: true })}
          opciones={[
            { valor: 'proximos', texto: 'Por hacer' },
            { valor: 'por-cobrar', texto: 'Por cobrar' },
            { valor: 'hechos', texto: 'Hechos' },
          ]}
        />
      </div>

      {filtro === 'por-cobrar' && lista.length > 0 && (
        <div className="mb-5 rounded-3xl bg-hoja p-5">
          <p className="text-gris">Le deben en total</p>
          <p className="tabular text-[2rem] leading-tight font-bold">{q(totalFalta)}</p>
          {cheques > 0 && <p className="mt-2 text-gris">Además tiene {q(cheques)} en cheques que aún no cambia en el banco.</p>}
        </div>
      )}

      {lista.length === 0 ? (
        <Vacio>{vacio}</Vacio>
      ) : (
        <Grupo>
          {lista.map((t) => (
            <TarjetaTrabajo key={t.id} t={t} cliente={cli.get(t.clienteId)} equipo={eqs.get(t.equipoId)} mostrarPrecio={filtro !== 'proximos'} />
          ))}
        </Grupo>
      )}
    </>
  )
}
