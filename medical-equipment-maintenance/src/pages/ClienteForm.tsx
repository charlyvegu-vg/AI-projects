import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Boton, Campo, Encabezado, Entrada, Selector, Texto } from '../components/ui'
import { DEPARTAMENTOS, db, nuevo, tocar, type Cliente } from '../db'

type Datos = Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>
const VACIO: Datos = { nombre: '', departamento: 'Guatemala', municipio: '', direccion: '', contacto: '', telefono: '', correo: '', notas: '' }

export default function ClienteForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const [d, setD] = useState<Datos>(VACIO)
  const [masDatos, setMasDatos] = useState(false)

  useEffect(() => {
    if (id) db.clientes.get(id).then((c) => c && (setD(c), setMasDatos(true)))
  }, [id])

  const set = (k: keyof Datos) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value })

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (id) {
      const actual = await db.clientes.get(id)
      await db.clientes.put(tocar({ ...actual!, ...d }))
      nav(-1)
    } else {
      const c = nuevo(d)
      await db.clientes.add(c)
      nav(`/clientes/${c.id}`, { replace: true })
    }
  }

  return (
    <>
      <Encabezado titulo={id ? 'Cambiar cliente' : 'Nuevo cliente'} atras />
      <form onSubmit={guardar} className="space-y-6">
        <Campo etiqueta="Nombre de la clínica u hospital">
          <Entrada required autoFocus={!id} value={d.nombre} onChange={set('nombre')} placeholder="Clínica San Rafael" />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Departamento">
            <Selector value={d.departamento} onChange={set('departamento')}>
              {DEPARTAMENTOS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Municipio">
            <Entrada value={d.municipio} onChange={set('municipio')} />
          </Campo>
        </div>
        <Campo etiqueta="Teléfono o WhatsApp">
          <Entrada type="tel" inputMode="tel" value={d.telefono} onChange={set('telefono')} placeholder="5555 1234" />
        </Campo>
        <Campo etiqueta="¿Con quién habla?">
          <Entrada value={d.contacto} onChange={set('contacto')} placeholder="Dra. Pérez" />
        </Campo>

        {masDatos ? (
          <>
            <Campo etiqueta="Dirección">
              <Entrada value={d.direccion} onChange={set('direccion')} />
            </Campo>
            <Campo etiqueta="Correo">
              <Entrada type="email" value={d.correo} onChange={set('correo')} />
            </Campo>
            <Campo etiqueta="Notas">
              <Texto value={d.notas} onChange={set('notas')} placeholder="Horarios, cómo llegar, forma de pago…" />
            </Campo>
          </>
        ) : (
          <Boton type="button" variante="texto" className="w-full" onClick={() => setMasDatos(true)}>
            Agregar dirección, correo o notas
          </Boton>
        )}

        <Boton type="submit" className="w-full">
          Guardar cliente
        </Boton>
      </form>
    </>
  )
}
