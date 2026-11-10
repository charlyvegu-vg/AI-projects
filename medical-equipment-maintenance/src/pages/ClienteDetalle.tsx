import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import EtiquetaServicio from '../components/EtiquetaServicio'
import Icono from '../components/Icono'
import TarjetaTrabajo from '../components/TarjetaTrabajo'
import { Boton, BotonLink, Desplegable, Encabezado, Titulo, Vacio } from '../components/ui'
import { borrarCliente, db } from '../db'
import { estadoEquipo } from '../lib/calc'
import { useConfig } from '../lib/hooks'
import { whatsLibre, whatsMantenimiento } from '../lib/whatsapp'

export default function ClienteDetalle() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const cfg = useConfig()
  const datos = useLiveQuery(
    async () => ({
      cliente: await db.clientes.get(id),
      equipos: await db.equipos.where('clienteId').equals(id).toArray(),
      trabajos: (await db.trabajos.where('clienteId').equals(id).toArray()).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    }),
    [id],
  )

  if (!datos) return null
  const { cliente: c, equipos, trabajos } = datos
  if (!c) return <Encabezado titulo="No se encontró el cliente" atras />

  async function borrar() {
    if (!confirm(`¿Borrar "${c!.nombre}" con todos sus equipos, trabajos, pagos y gastos? No se puede deshacer.`)) return
    await borrarCliente(id)
    nav('/clientes', { replace: true })
  }

  const eqMap = new Map(equipos.map((e) => [e.id, e]))
  // Primero los que necesitan atención.
  const orden = { vencido: 0, pronto: 1, 'al-dia': 2, 'sin-dato': 3 }
  const ordenados = [...equipos].sort((a, b) => orden[estadoEquipo(a, cfg.diasAviso)] - orden[estadoEquipo(b, cfg.diasAviso)])

  return (
    <>
      <Encabezado
        titulo=""
        atras
        accion={
          <Boton variante="texto" icono="editar" className="min-h-12 px-3" onClick={() => nav(`/clientes/${id}/editar`)}>
            Editar
          </Boton>
        }
      />

      <section className="mb-6 px-1">
        <h1 className="text-[1.75rem] leading-tight font-bold">{c.nombre}</h1>
        <p className="mt-2 flex items-start gap-2 text-gris">
          <Icono nombre="lugar" className="mt-0.5 h-5 w-5 shrink-0" />
          {[c.direccion, c.municipio, c.departamento].filter(Boolean).join(', ')}
        </p>
        {c.contacto && <p className="mt-1 pl-7 text-gris">Hablar con {c.contacto}</p>}
        {c.notas && <p className="mt-3 rounded-2xl bg-etiqueta-suave px-4 py-3">{c.notas}</p>}
      </section>

      {c.telefono ? (
        <div className="mb-8 grid grid-cols-2 gap-2">
          <BotonLink variante="whatsapp" icono="mensaje" href={whatsLibre(c, cfg)}>
            Escribir
          </BotonLink>
          <BotonLink icono="telefono" href={`tel:${c.telefono.replace(/\s/g, '')}`}>
            Llamar
          </BotonLink>
        </div>
      ) : (
        <Boton variante="secundario" className="mb-8 w-full" onClick={() => nav(`/clientes/${id}/editar`)}>
          Agregar su teléfono
        </Boton>
      )}

      <Titulo
        accion={
          <Boton variante="texto" icono="mas" className="min-h-11 px-3" onClick={() => nav(`/clientes/${id}/equipos/nuevo`)}>
            Equipo
          </Boton>
        }
      >
        Sus equipos
      </Titulo>
      {equipos.length === 0 && <Vacio>Anote los equipos que atiende aquí para que la app le avise cuándo les toca mantenimiento.</Vacio>}
      <div className="space-y-2">
        {ordenados.map((e) => {
          const est = estadoEquipo(e, cfg.diasAviso)
          return (
            <EtiquetaServicio key={e.id} equipo={e} diasAviso={cfg.diasAviso} onClick={() => nav(`/equipos/${e.id}/editar`)}>
              <div className="grid grid-cols-2 gap-2 [&>*:only-child]:col-span-2">
                {(est === 'vencido' || est === 'pronto') && c.telefono && (
                  <BotonLink variante="whatsapp" className="min-h-11 px-2 text-base" href={whatsMantenimiento(c, [e], cfg)}>
                    Avisar
                  </BotonLink>
                )}
                <Boton variante="secundario" className="min-h-11 px-2 text-base" onClick={() => nav(`/trabajos/nuevo?cliente=${id}&equipo=${e.id}`)}>
                  Agendar
                </Boton>
              </div>
            </EtiquetaServicio>
          )
        })}
      </div>

      <div className="mt-8">
        <Desplegable titulo="Trabajos anteriores" resumen={String(trabajos.length)}>
          {trabajos.length === 0 ? (
            <p className="py-2 text-gris">Todavía no hay trabajos con este cliente.</p>
          ) : (
            <div className="-mx-4 -my-3 divide-y divide-linea">
              {trabajos.map((t) => (
                <TarjetaTrabajo key={t.id} t={t} cliente={c} equipo={eqMap.get(t.equipoId)} mostrarPrecio />
              ))}
            </div>
          )}
        </Desplegable>
      </div>

      <Boton variante="peligro" className="mt-6 w-full" onClick={borrar}>
        Borrar este cliente
      </Boton>
    </>
  )
}
