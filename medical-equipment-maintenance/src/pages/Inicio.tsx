import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icono from '../components/Icono'
import TarjetaTrabajo from '../components/TarjetaTrabajo'
import { Boton, Desplegable, Grupo, Titulo, Vacio } from '../components/ui'
import { db } from '../db'
import { cargarDemo } from '../lib/demo'
import { esPendiente, porContactar, totalPorCobrar } from '../lib/consultas'
import { fechaLarga, hoyISO, q, saludoHora, sumarDias } from '../lib/format'
import { useConfig } from '../lib/hooks'

export default function Inicio() {
  const cfg = useConfig()
  const nav = useNavigate()
  const [cargando, setCargando] = useState(false)
  const datos = useLiveQuery(async () => {
    const [clientes, equipos, trabajos, pagos] = await Promise.all([db.clientes.toArray(), db.equipos.toArray(), db.trabajos.toArray(), db.pagos.toArray()])
    return { clientes, equipos, trabajos, pagos }
  }, [])
  if (!datos) return null

  const { clientes, equipos, trabajos, pagos } = datos
  const hoy = hoyISO()
  const nombre = cfg.nombreTecnico.split(' ')[0]

  const cabecera = (
    <header className="pt-[calc(env(safe-area-inset-top)+1rem)] pb-6">
      <div className="mb-3 flex justify-end">
        <button onClick={() => nav('/config')} className="flex h-11 items-center gap-1.5 rounded-full bg-hoja px-4 font-bold text-gris active:bg-linea">
          <Icono nombre="ajustes" className="h-5 w-5" />
          Ajustes
        </button>
      </div>
      <p className="text-gris first-letter:uppercase">{fechaLarga(hoy)}</p>
      <h1 className="text-[2rem] leading-tight font-bold">
        {saludoHora()}
        {nombre && `, ${nombre}`}
      </h1>
    </header>
  )

  if (clientes.length === 0) {
    return (
      <>
        {cabecera}
        <div className="space-y-4 rounded-3xl bg-hoja p-6">
          <p className="text-xl font-bold">Empecemos por sus clientes</p>
          <p className="text-gris">Agregue la primera clínica que atiende. Después podrá anotar sus equipos y trabajos.</p>
          <Boton className="w-full" icono="mas" onClick={() => nav('/clientes/nuevo')}>
            Agregar un cliente
          </Boton>
          <Boton
            variante="texto"
            className="w-full"
            disabled={cargando}
            onClick={async () => {
              setCargando(true)
              await cargarDemo()
              setCargando(false)
            }}
          >
            {cargando ? 'Cargando…' : 'Ver con clínicas de ejemplo'}
          </Boton>
        </div>
      </>
    )
  }

  const cli = new Map(clientes.map((c) => [c.id, c]))
  const eqs = new Map(equipos.map((e) => [e.id, e]))
  const pendientes = trabajos.filter(esPendiente)
  const atrasados = pendientes.filter((t) => t.fecha < hoy)
  const deHoy = pendientes.filter((t) => t.fecha === hoy).sort((a, b) => a.hora.localeCompare(b.hora))
  const semana = pendientes
    .filter((t) => t.fecha > hoy && t.fecha <= sumarDias(hoy, 7))
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
  const llamar = porContactar(clientes, equipos, trabajos, cfg.diasAviso)
  const cobrar = totalPorCobrar(trabajos, pagos)

  return (
    <>
      {cabecera}

      {atrasados.length > 0 && (
        <button
          onClick={() => nav('/trabajos')}
          className="mb-5 flex w-full items-center gap-3 rounded-3xl bg-rojo-suave px-4 py-4 text-left text-rojo"
        >
          <Icono nombre="alerta" className="h-7 w-7 shrink-0" />
          <span className="flex-1 font-bold">
            {atrasados.length === 1 ? 'Un trabajo quedó atrasado' : `${atrasados.length} trabajos quedaron atrasados`}
            <span className="block font-normal">Toque para marcarlos como realizados o cambiarles la fecha.</span>
          </span>
        </button>
      )}

      <Titulo>Hoy</Titulo>
      {deHoy.length === 0 ? (
        <Vacio>No tiene trabajos para hoy.</Vacio>
      ) : (
        <Grupo>
          {deHoy.map((t) => (
            <TarjetaTrabajo key={t.id} t={t} cliente={cli.get(t.clienteId)} equipo={eqs.get(t.equipoId)} soloHora />
          ))}
        </Grupo>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button onClick={() => nav('/contactar')} className="flex min-h-36 flex-col justify-between rounded-3xl bg-etiqueta p-4 text-left text-tinta active:brightness-95">
          <Icono nombre="telefono" className="h-7 w-7" />
          <span>
            <span className="block text-[2.25rem] leading-none font-bold">{llamar.length}</span>
            <span className="block font-bold">{llamar.length === 1 ? 'cliente por llamar' : 'clientes por llamar'}</span>
          </span>
        </button>
        <button
          onClick={() => nav('/trabajos?filtro=por-cobrar')}
          className="flex min-h-36 flex-col justify-between rounded-3xl bg-hoja p-4 text-left active:bg-papel"
        >
          <Icono nombre="dinero" className="h-7 w-7 text-verde" />
          <span>
            <span className="tabular block text-[1.35rem] leading-none font-bold">{q(cobrar)}</span>
            <span className="block font-bold text-gris">por cobrar</span>
          </span>
        </button>
      </div>

      <div className="mt-6">
        <Desplegable titulo="Próximos 7 días" resumen={semana.length === 0 ? 'Nada' : `${semana.length} ${semana.length === 1 ? 'trabajo' : 'trabajos'}`}>
          {semana.length === 0 ? (
            <p className="py-2 text-gris">No hay trabajos agendados esta semana.</p>
          ) : (
            <div className="-mx-4 -my-3 divide-y divide-linea">
              {semana.map((t) => (
                <TarjetaTrabajo key={t.id} t={t} cliente={cli.get(t.clienteId)} equipo={eqs.get(t.equipoId)} />
              ))}
            </div>
          )}
        </Desplegable>
      </div>
    </>
  )
}
