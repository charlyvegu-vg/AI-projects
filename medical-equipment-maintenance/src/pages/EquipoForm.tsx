import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Boton, Campo, Encabezado, Entrada, Opciones } from '../components/ui'
import { TIPOS_EQUIPO, db, nuevo, tocar, type Equipo } from '../db'
import { proximoServicio } from '../lib/calc'
import { fecha } from '../lib/format'

type Datos = Omit<Equipo, 'id' | 'createdAt' | 'updatedAt'>

export default function EquipoForm() {
  const { clienteId, id } = useParams()
  const nav = useNavigate()
  const [d, setD] = useState<Datos>({
    clienteId: clienteId ?? '',
    tipo: '',
    marca: '',
    modelo: '',
    serie: '',
    ubicacion: '',
    frecuenciaMeses: 6,
    ultimoServicio: '',
  })

  useEffect(() => {
    if (id) db.equipos.get(id).then((e) => e && setD(e))
  }, [id])

  const set = (k: keyof Datos) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value })

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    const datos = { ...d, frecuenciaMeses: Number(d.frecuenciaMeses) || 0 }
    if (id) {
      const actual = await db.equipos.get(id)
      await db.equipos.put(tocar({ ...actual!, ...datos }))
    } else {
      await db.equipos.add(nuevo(datos))
    }
    nav(-1)
  }

  async function borrar() {
    if (!id || !confirm('¿Borrar este equipo? Los trabajos registrados se conservan.')) return
    await db.equipos.delete(id)
    nav(-1)
  }

  const proximo = proximoServicio({ ...d, frecuenciaMeses: Number(d.frecuenciaMeses) } as Equipo)

  return (
    <>
      <Encabezado titulo={id ? 'Cambiar equipo' : 'Nuevo equipo'} atras />
      <form onSubmit={guardar} className="space-y-6">
        <Campo etiqueta="¿Qué equipo es?">
          <Entrada required list="tipos-equipo" value={d.tipo} onChange={set('tipo')} placeholder="Autoclave, monitor…" autoFocus={!id} />
          <datalist id="tipos-equipo">
            {TIPOS_EQUIPO.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Marca">
            <Entrada value={d.marca} onChange={set('marca')} />
          </Campo>
          <Campo etiqueta="Modelo">
            <Entrada value={d.modelo} onChange={set('modelo')} />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Número de serie">
            <Entrada value={d.serie} onChange={set('serie')} />
          </Campo>
          <Campo etiqueta="Ubicación">
            <Entrada value={d.ubicacion} onChange={set('ubicacion')} placeholder="Emergencia" />
          </Campo>
        </div>
        <Campo etiqueta="¿Cada cuánto le toca mantenimiento?">
          <Opciones
            valor={String(d.frecuenciaMeses)}
            onChange={(v) => setD({ ...d, frecuenciaMeses: Number(v) })}
            opciones={[
              { valor: '3', texto: '3 meses' },
              { valor: '6', texto: '6 meses' },
              { valor: '12', texto: '12 meses' },
              { valor: '0', texto: 'Nunca' },
            ]}
          />
          {!['0', '3', '6', '12'].includes(String(d.frecuenciaMeses)) && (
            <p className="mt-1 text-sm text-gris">Actual: {d.frecuenciaMeses} meses</p>
          )}
        </Campo>
        <Campo etiqueta="¿Cuándo fue el último mantenimiento?" ayuda="Si no lo sabe, déjelo vacío. La app lo anota sola cada vez que usted termina un trabajo.">
          <Entrada type="date" value={d.ultimoServicio} onChange={set('ultimoServicio')} />
        </Campo>
        {proximo && (
          <p className="rounded-2xl bg-etiqueta-suave px-4 py-3">
            El próximo mantenimiento será el <b>{fecha(proximo)}</b>
          </p>
        )}
        <Boton type="submit" className="w-full">
          Guardar equipo
        </Boton>
        {id && (
          <Boton type="button" variante="peligro" className="w-full" onClick={borrar}>
            Borrar este equipo
          </Boton>
        )}
      </form>
    </>
  )
}
