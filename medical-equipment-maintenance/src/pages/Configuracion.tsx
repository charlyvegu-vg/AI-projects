import { useEffect, useRef, useState } from 'react'
import { Boton, Campo, Encabezado, Entrada, Seccion, Selector, Tarjeta } from '../components/ui'
import { CONFIG_INICIAL, db, uid, type Config, type GrupoCategoria } from '../db'
import { borrarTodo, cargarDemo } from '../lib/demo'
import { hoyISO, num } from '../lib/format'
import { useCategorias } from '../lib/hooks'

const GRUPOS: Record<GrupoCategoria, string> = { viaticos: 'Viáticos', materiales: 'Materiales', imprevistos: 'Imprevistos' }

export default function Configuracion() {
  const [c, setC] = useState<Config>(CONFIG_INICIAL)
  const [tarifa, setTarifa] = useState('')
  const [guardado, setGuardado] = useState(false)
  const categorias = useCategorias()
  const [nuevaCat, setNuevaCat] = useState('')
  const [grupoCat, setGrupoCat] = useState<GrupoCategoria>('viaticos')
  const archivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    db.config.get('config').then((x) => {
      if (x) {
        setC(x)
        setTarifa(String(x.tarifaHora))
      }
    })
  }, [])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    await db.config.put({ ...c, tarifaHora: num(tarifa), diasAviso: Number(c.diasAviso) || 15, margenMinimo: Number(c.margenMinimo) || 0 })
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  async function exportar() {
    const tablas = ['clientes', 'equipos', 'trabajos', 'pagos', 'gastos', 'viajes', 'categorias', 'config'] as const
    const datos: Record<string, unknown[]> = {}
    for (const t of tablas) datos[t] = await db.table(t).toArray()
    const blob = new Blob([JSON.stringify({ app: 'agenda-tecnica', version: 1, fecha: new Date().toISOString(), datos }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `respaldo-agenda-tecnica-${hoyISO()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importar(f: File) {
    try {
      if (f.size > 20 * 1024 * 1024) throw new Error('muy grande')
      const json = JSON.parse(await f.text())
      if (json?.app !== 'agenda-tecnica' || typeof json.datos !== 'object') throw new Error('formato')
      // Solo se aceptan las tablas conocidas y listas de registros.
      const PERMITIDAS = ['clientes', 'equipos', 'trabajos', 'pagos', 'gastos', 'viajes', 'categorias', 'config']
      const entradas = Object.entries(json.datos as Record<string, unknown>)
      if (entradas.some(([k, v]) => !PERMITIDAS.includes(k) || !Array.isArray(v))) throw new Error('formato')
      if (!confirm('Esto reemplaza TODOS los datos actuales por los del respaldo. ¿Continuar?')) return
      await db.transaction('rw', db.tables, async () => {
        for (const [tabla, filas] of entradas as [string, unknown[]][]) {
          await db.table(tabla).clear()
          await db.table(tabla).bulkPut(filas)
        }
      })
      alert('Respaldo restaurado.')
      location.reload()
    } catch {
      alert('El archivo no es un respaldo válido de Agenda Técnica.')
    }
  }

  return (
    <>
      <Encabezado titulo="Ajustes" atras />
      <form onSubmit={guardar}>
        <Seccion titulo="Mis datos">
          <Tarjeta className="space-y-5">
            <Campo etiqueta="Nombre">
              <Entrada value={c.nombreTecnico} onChange={(e) => setC({ ...c, nombreTecnico: e.target.value })} placeholder="Aparece en sus mensajes de WhatsApp" />
            </Campo>
            <div className="grid grid-cols-2 gap-2">
              <Campo etiqueta="Teléfono">
                <Entrada type="tel" value={c.telefonoTecnico} onChange={(e) => setC({ ...c, telefonoTecnico: e.target.value })} />
              </Campo>
              <Campo etiqueta="NIT">
                <Entrada value={c.nit} onChange={(e) => setC({ ...c, nit: e.target.value })} />
              </Campo>
            </div>
            <Campo etiqueta="Correo">
              <Entrada type="email" value={c.correoTecnico} onChange={(e) => setC({ ...c, correoTecnico: e.target.value })} />
            </Campo>
          </Tarjeta>
        </Seccion>

        <Seccion titulo="Cálculos y avisos">
          <Tarjeta className="space-y-5">
            <Campo etiqueta="¿Cuánto vale una hora de su tiempo? (Q)" ayuda="Se usa para calcular si un trabajo le deja ganancia, contando horas trabajando y manejando.">
              <Entrada inputMode="decimal" value={tarifa} onChange={(e) => setTarifa(e.target.value)} />
            </Campo>
            <Campo etiqueta="¿Con cuántos días de anticipación quiere que le avise?">
              <Entrada type="number" min={1} value={c.diasAviso} onChange={(e) => setC({ ...c, diasAviso: Number(e.target.value) })} />
            </Campo>
            <Campo etiqueta="Ganancia mínima aceptable (%)" ayuda="Si un trabajo deja menos que esto, se marca en amarillo.">
              <Entrada type="number" min={0} value={c.margenMinimo} onChange={(e) => setC({ ...c, margenMinimo: Number(e.target.value) })} />
            </Campo>
          </Tarjeta>
        </Seccion>
        <Boton type="submit" className="mb-6 w-full">
          {guardado ? '✓ Guardado' : 'Guardar ajustes'}
        </Boton>
      </form>

      <Seccion titulo="Categorías de gastos">
        <Tarjeta>
          <ul className="mb-3 divide-y divide-linea">
            {categorias.map((cat) => (
              <li key={cat.id} className="flex items-center justify-between py-2">
                <span>{cat.nombre}</span>
                <span className="text-xs text-gris">{GRUPOS[cat.grupo]}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Entrada placeholder="Nueva categoría" value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} />
            <Selector className="w-36" value={grupoCat} onChange={(e) => setGrupoCat(e.target.value as GrupoCategoria)}>
              {Object.entries(GRUPOS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Selector>
          </div>
          <Boton
            variante="secundario"
            className="mt-2 w-full"
            disabled={!nuevaCat.trim()}
            onClick={async () => {
              await db.categorias.add({ id: uid(), nombre: nuevaCat.trim(), grupo: grupoCat })
              setNuevaCat('')
            }}
          >
            Agregar categoría
          </Boton>
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Respaldo">
        <Tarjeta className="space-y-2">
          <p className="text-sm text-gris">
            Por ahora los datos se guardan solo en este dispositivo. Descargue un respaldo de vez en cuando (en la Fase 2 se sincronizarán solos en la nube).
          </p>
          <Boton className="w-full" onClick={exportar}>
            Descargar respaldo
          </Boton>
          <Boton variante="secundario" className="w-full" onClick={() => archivo.current?.click()}>
            Restaurar respaldo
          </Boton>
          <input ref={archivo} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])} />
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Clínicas de ejemplo">
        <Tarjeta className="space-y-2">
          <Boton variante="secundario" className="w-full" onClick={async () => { await cargarDemo(); alert('Datos de prueba cargados.') }}>
            Cargar clínicas de ejemplo
          </Boton>
          <Boton
            variante="peligro"
            className="w-full"
            onClick={async () => {
              if (confirm('¿Borrar TODOS los clientes, equipos, trabajos, pagos y gastos? No se puede deshacer.')) {
                await borrarTodo()
                alert('Datos borrados.')
              }
            }}
          >
            Borrar todos los datos
          </Boton>
        </Tarjeta>
      </Seccion>
      <p className="pb-4 text-center text-xs text-gris">Agenda Técnica · versión 0.2 (Fase 1)</p>
    </>
  )
}
