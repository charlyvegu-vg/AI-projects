import { useRef, useState } from 'react'
import { store, useEstado } from '../data'
import { marcarRespaldo, ultimoRespaldo, useProteccion } from '../lib/almacenamiento'
import { crearRespaldo, leerRespaldo, nombreArchivo, resumenRespaldo, type DatosApp } from '../lib/respaldo'
import { formatoFechaHora } from '../lib/tiempo'

function descargar(d: DatosApp, nombre: string) {
  const r = crearRespaldo(d)
  const url = URL.createObjectURL(new Blob([JSON.stringify(r)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return r.fecha
}

/** Guardar y restaurar un archivo con todos los datos, en Descargas de la tablet. */
export function Respaldo() {
  const estado = useEstado()
  const proteccion = useProteccion()
  const archivo = useRef<HTMLInputElement>(null)
  const [ultimo, setUltimo] = useState(ultimoRespaldo)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const guardar = () => {
    const fecha = descargar(estado, nombreArchivo())
    marcarRespaldo(fecha)
    setUltimo(fecha)
    setMensaje({ tipo: 'ok', texto: `Respaldo guardado en Descargas (${resumenRespaldo(estado)}).` })
  }

  const restaurar = async (f: File | undefined) => {
    if (archivo.current) archivo.current.value = ''
    if (!f) return
    try {
      const r = leerRespaldo(await f.text())
      const cuando = formatoFechaHora(r.fecha, new Date())
      if (!confirm(`¿Restaurar el respaldo guardado ${cuando}?\n\nTiene ${resumenRespaldo(r)}.\n\nReemplaza todo lo que hay ahora en esta tablet. Antes se guardará un respaldo de lo actual en Descargas.`)) return
      // Red de seguridad: lo que había antes queda en Descargas.
      const hayDatos = estado.pedidos.length || estado.insumos.length || estado.productos.some((p) => p.receta)
      if (hayDatos) descargar(estado, nombreArchivo().replace('respaldo', 'antes-de-restaurar'))
      await store.restaurar(r)
      setMensaje({ tipo: 'ok', texto: `Listo: se restauró el respaldo guardado ${cuando}.` })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: (e as Error).message })
    }
  }

  return (
    <section className="panel panel-respaldo">
      <h2>Respaldo de datos</h2>
      <p className="ayuda">Guarda un archivo con todos los pedidos, recetas e inventario en la carpeta Descargas de la tablet. Conviene hacerlo al terminar cada día.</p>
      <p className="respaldo-ultimo">
        {ultimo ? <>Último respaldo: <b>{formatoFechaHora(ultimo, new Date())}</b></> : 'Aún no has guardado un respaldo en esta tablet.'}
      </p>
      <div className="fila">
        <button className="btn btn-primario btn-pie" onClick={guardar}>Guardar respaldo</button>
        <button className="btn btn-pie" onClick={() => archivo.current?.click()}>Restaurar un respaldo</button>
        <input ref={archivo} type="file" accept=".json,application/json" hidden onChange={(e) => restaurar(e.target.files?.[0])} />
      </div>
      {mensaje && <p className={`respaldo-mensaje ${mensaje.tipo}`} role="status">{mensaje.texto}</p>}
      <p className={`respaldo-proteccion ${proteccion ?? ''}`}>
        {proteccion === 'activa' && 'Protección contra borrado: activa. Chrome no borrará estos datos aunque falte espacio.'}
        {proteccion === 'pendiente' && 'Protección contra borrado: Chrome aún no la concede. Se vuelve a pedir cada vez que se abre la app; usarla seguido o instalarla ayuda.'}
        {proteccion === 'no-disponible' && 'Protección contra borrado: no disponible en esta dirección (Chrome solo la permite con https). Mientras tanto, guarda respaldos.'}
      </p>
    </section>
  )
}
