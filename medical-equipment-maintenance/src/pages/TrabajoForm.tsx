import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ESTADOS, nombreEquipo } from '../components/TarjetaTrabajo'
import { Boton, Campo, Encabezado, Entrada, Opciones, Selector, Texto } from '../components/ui'
import { actualizarUltimoServicio, db, nuevo, tocar, type Equipo, type Trabajo } from '../db'
import { hoyISO, num } from '../lib/format'

type Datos = Omit<Trabajo, 'id' | 'createdAt' | 'updatedAt'>

export default function TrabajoForm() {
  const { id } = useParams()
  const [qs] = useSearchParams()
  const nav = useNavigate()
  const clientes = useLiveQuery(() => db.clientes.orderBy('nombre').toArray(), []) ?? []
  const [d, setD] = useState<Datos>({
    clienteId: qs.get('cliente') ?? '',
    equipoId: qs.get('equipo') ?? '',
    tipo: (qs.get('tipo') as Trabajo['tipo']) ?? 'preventivo',
    prioridad: 'normal',
    estado: 'agendado',
    fecha: hoyISO(),
    hora: '',
    duracionHoras: 2,
    horasTrabajo: 0,
    horasViaje: 0,
    precio: 0,
    descripcion: '',
    viajeId: '',
    historico: false,
  })
  const [precio, setPrecio] = useState('')
  const [horasT, setHorasT] = useState('')
  const [horasV, setHorasV] = useState('')
  const [mas, setMas] = useState(false)
  const [estadoElegido, setEstadoElegido] = useState(false)

  useEffect(() => {
    if (!id) return
    db.trabajos.get(id).then((t) => {
      if (!t) return
      setD(t)
      setPrecio(t.precio ? String(t.precio) : '')
      setHorasT(t.horasTrabajo ? String(t.horasTrabajo) : '')
      setHorasV(t.horasViaje ? String(t.horasViaje) : '')
      setEstadoElegido(true)
    })
  }, [id])

  const equipos =
    useLiveQuery(() => (d.clienteId ? db.equipos.where('clienteId').equals(d.clienteId).toArray() : Promise.resolve([] as Equipo[])), [d.clienteId]) ?? []

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    // Si la fecha ya pasó y no se eligió estado, se asume que el trabajo ya se hizo.
    const estado = !estadoElegido && d.fecha < hoyISO() ? 'realizado' : d.estado
    const datos: Datos = { ...d, estado, precio: num(precio), horasTrabajo: num(horasT), horasViaje: num(horasV) }
    let t: Trabajo
    if (id) {
      const actual = await db.trabajos.get(id)
      t = tocar({ ...actual!, ...datos })
      await db.trabajos.put(t)
    } else {
      t = nuevo(datos)
      await db.trabajos.add(t)
    }
    await actualizarUltimoServicio(t)
    if (id) nav(-1)
    else nav(`/trabajos/${t.id}`, { replace: true })
  }

  return (
    <>
      <Encabezado titulo={id ? 'Cambiar trabajo' : 'Nuevo trabajo'} atras />
      <form onSubmit={guardar} className="space-y-6">
        <Campo etiqueta="¿Para qué cliente?">
          <Selector required value={d.clienteId} onChange={(e) => setD({ ...d, clienteId: e.target.value, equipoId: '' })}>
            <option value="">Toque para elegir</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Selector>
          {!id && (
            <button type="button" className="mt-2 font-bold text-primario" onClick={() => nav('/clientes/nuevo')}>
              El cliente no está en la lista
            </button>
          )}
        </Campo>

        {d.clienteId && (
          <Campo etiqueta="¿Qué equipo?">
            <Selector value={d.equipoId} onChange={(e) => setD({ ...d, equipoId: e.target.value })}>
              <option value="">Ninguno en particular</option>
              {equipos.map((e) => (
                <option key={e.id} value={e.id}>
                  {nombreEquipo(e)}
                  {e.ubicacion && ` (${e.ubicacion})`}
                </option>
              ))}
            </Selector>
          </Campo>
        )}

        <Campo etiqueta="¿Qué va a hacer?">
          <Opciones
            valor={d.tipo}
            onChange={(tipo) => setD({ ...d, tipo })}
            opciones={[
              { valor: 'preventivo', texto: 'Mantenimiento' },
              { valor: 'correctivo', texto: 'Reparación' },
            ]}
          />
        </Campo>

        <div className="grid grid-cols-[3fr_2fr] gap-3">
          <Campo etiqueta="¿Qué día?">
            <Entrada type="date" required value={d.fecha} onChange={(e) => setD({ ...d, fecha: e.target.value })} />
          </Campo>
          <Campo etiqueta="¿A qué hora?">
            <Entrada type="time" value={d.hora} onChange={(e) => setD({ ...d, hora: e.target.value })} />
          </Campo>
        </div>

        <Campo etiqueta="¿Cuánto va a cobrar?">
          <Entrada inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Q 0.00" className="tabular" />
        </Campo>

        {mas || id ? (
          <div className="space-y-6 rounded-3xl bg-hoja p-4">
            <Campo etiqueta="¿Es urgente?">
              <Opciones
                valor={d.prioridad}
                onChange={(prioridad) => setD({ ...d, prioridad })}
                opciones={[
                  { valor: 'normal', texto: 'No' },
                  { valor: 'urgente', texto: 'Sí, urgente', activo: 'border-rojo bg-rojo text-white' },
                ]}
              />
            </Campo>
            <Campo etiqueta="¿En qué va?">
              <Opciones
                valor={d.estado}
                columnas={2}
                onChange={(estado) => {
                  setD({ ...d, estado })
                  setEstadoElegido(true)
                }}
                opciones={ESTADOS}
              />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Horas trabajando">
                <Entrada inputMode="decimal" value={horasT} onChange={(e) => setHorasT(e.target.value)} placeholder="0" />
              </Campo>
              <Campo etiqueta="Horas manejando">
                <Entrada inputMode="decimal" value={horasV} onChange={(e) => setHorasV(e.target.value)} placeholder="0" />
              </Campo>
            </div>
            <Campo etiqueta="Notas">
              <Texto value={d.descripcion} onChange={(e) => setD({ ...d, descripcion: e.target.value })} placeholder="Qué falla tiene, qué se hizo…" />
            </Campo>
          </div>
        ) : (
          <Boton type="button" variante="texto" className="w-full" onClick={() => setMas(true)}>
            Agregar más detalles
          </Boton>
        )}

        <Boton type="submit" className="w-full">
          Guardar trabajo
        </Boton>
      </form>
    </>
  )
}
