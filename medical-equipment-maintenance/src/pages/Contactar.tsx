import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import EtiquetaServicio from '../components/EtiquetaServicio'
import Icono from '../components/Icono'
import { Boton, BotonLink, Encabezado, Vacio } from '../components/ui'
import { db } from '../db'
import { porContactar } from '../lib/consultas'
import { useConfig } from '../lib/hooks'
import { whatsMantenimiento } from '../lib/whatsapp'

export default function Contactar() {
  const cfg = useConfig()
  const nav = useNavigate()
  const lista = useLiveQuery(async () => {
    const [c, e, t] = await Promise.all([db.clientes.toArray(), db.equipos.toArray(), db.trabajos.toArray()])
    return porContactar(c, e, t, cfg.diasAviso)
  }, [cfg.diasAviso])
  if (!lista) return null

  return (
    <>
      <Encabezado titulo="Por llamar" atras />
      <p className="mb-5 px-1 text-gris">
        A estos equipos les toca mantenimiento en los próximos {cfg.diasAviso} días o ya se les pasó. Escríbale al cliente para agendar la visita.
      </p>
      {lista.length === 0 && <Vacio>Todos sus clientes están al día.</Vacio>}
      <div className="space-y-6">
        {lista.map(({ cliente, lista: eqs }) => (
          <section key={cliente.id}>
            <button onClick={() => nav(`/clientes/${cliente.id}`)} className="mb-2 block px-1 text-left">
              <span className="block text-lg leading-snug font-bold">{cliente.nombre}</span>
              <span className="flex items-center gap-1 text-gris">
                <Icono nombre="lugar" className="h-4 w-4" />
                {cliente.municipio || cliente.departamento}
              </span>
            </button>
            <div className="space-y-2">
              {eqs.map((e) => (
                <EtiquetaServicio key={e.id} equipo={e} diasAviso={cfg.diasAviso} />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {cliente.telefono ? (
                <BotonLink variante="whatsapp" icono="mensaje" href={whatsMantenimiento(cliente, eqs, cfg)}>
                  Escribir
                </BotonLink>
              ) : (
                <Boton variante="secundario" onClick={() => nav(`/clientes/${cliente.id}/editar`)}>
                  Poner teléfono
                </Boton>
              )}
              <Boton variante="secundario" icono="agenda" onClick={() => nav(`/trabajos/nuevo?cliente=${cliente.id}&equipo=${eqs[0].id}&tipo=preventivo`)}>
                Agendar
              </Boton>
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
