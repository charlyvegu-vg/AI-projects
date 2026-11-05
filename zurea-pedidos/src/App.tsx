import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { store, useEstado } from './data'
import { esAlerta, esRojo, estadoTimer } from './lib/reglas'
import { mantenerPantallaEncendida } from './lib/pantalla'
import { alCambiarSonido, desbloquearSonido, sonidoActivo } from './lib/sonido'
import { claveDia, nombreDia } from './lib/tiempo'
import { useAhora, useAlertas } from './lib/useAlertas'
import { usePaginaEnDireccion, useRecordado } from './lib/navegacion'
import type { Pedido } from './types'
import { Ajustes } from './components/Ajustes'
import { Catalogo } from './components/Catalogo'
import { FormPedido } from './components/FormPedido'
import { Login } from './components/Login'
import { Marca } from './components/Marca'
import { PestanasDia } from './components/PestanasDia'
import { Inventario } from './components/Inventario'
import { AvisoInventario } from './components/AvisoInventario'
import { ElegirReceta, opcionesReceta } from './components/ElegirReceta'
import { Recetario, type DestinoReceta } from './components/Recetario'
import { Reportes } from './components/Reportes'
import { Tablero } from './components/Tablero'

const PAGINAS = ['pedidos', 'recetario', 'inventario', 'catalogo', 'reportes', 'ajustes'] as const
type Pagina = (typeof PAGINAS)[number]

export function App() {
  const estado = useEstado()
  const ahora = useAhora()
  const hoy = claveDia(ahora)
  const [pagina, setPagina] = usePaginaEnDireccion<Pagina>(PAGINAS, 'pedidos')
  // El día que se ve en Pedidos se recuerda al recargar (días pasados sin pedidos no hacen falta).
  const [dia, setDia] = useRecordado('dia', hoy, (d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  const [form, setForm] = useState<{ id: string | null } | null>(null)
  const [destino, setDestino] = useState<DestinoReceta | null>(null)
  const [eligiendoReceta, setEligiendoReceta] = useState<Pedido | null>(null)
  const sonido = useSyncExternalStore(alCambiarSonido, sonidoActivo)
  const conSesion = !!estado.usuario
  const sacudidas = useAlertas(conSesion ? estado.pedidos : [], ahora)

  // A medianoche, si se estaba viendo "Hoy", pasa al nuevo día.
  const hoyAnterior = useRef(hoy)
  useEffect(() => {
    if (hoyAnterior.current !== hoy) {
      const viejo = hoyAnterior.current
      setDia((d) => (d === viejo ? hoy : d))
      hoyAnterior.current = hoy
    }
  }, [hoy])

  useEffect(() => {
    document.addEventListener('pointerdown', desbloquearSonido)
    const liberar = mantenerPantallaEncendida()
    return () => { document.removeEventListener('pointerdown', desbloquearSonido); liberar() }
  }, [])

  if (!conSesion) {
    return estado.cargando ? <div className="cargando"><Marca grande /></div> : <Login />
  }

  const abrirReceta = (d: DestinoReceta) => { setDestino(d); setPagina('recetario') }
  // Un solo producto: directo a su receta. Varios: se pregunta cuál.
  const irARecetario = (p: Pedido) => {
    const opciones = opcionesReceta(p)
    if (opciones.length === 1) abrirReceta(opciones[0])
    else setEligiendoReceta(p)
  }

  // Pedidos que necesitan atención y no se ven en la pestaña actual.
  const atencion = estado.pedidos.filter((p) => esAlerta(estadoTimer(p, ahora)?.nivel) && (pagina !== 'pedidos' || claveDia(p.entregaEn) !== dia))
  const diaAtencion = atencion.length ? claveDia(atencion[0].entregaEn) : null
  const editando: Pedido | null = form?.id ? estado.pedidos.find((p) => p.id === form.id) ?? null : null

  return (
    <div className="app">
      <header className="barra">
        <Marca />
        <nav className="menu">
          {PAGINAS.map((p) => (
            <button key={p} className={pagina === p ? 'activo' : ''} onClick={() => { setPagina(p); setDestino(null) }}>
              {{ pedidos: 'Pedidos', recetario: 'Recetario', inventario: 'Inventario', catalogo: 'Catálogo', reportes: 'Reportes', ajustes: 'Ajustes' }[p]}
            </button>
          ))}
        </nav>
        <button className="btn btn-primario btn-nuevo" onClick={() => setForm({ id: null })}><span className="btn-nuevo-mas" aria-hidden>+</span>Nuevo pedido</button>
      </header>

      {!sonido && (
        <button className="banda banda-sonido" onClick={desbloquearSonido}>Toca aquí para activar el sonido de las alertas</button>
      )}
      {store.modo === 'local' && (
        <div className="banda banda-local">Modo local: los datos se guardan solo en este dispositivo.</div>
      )}
      {estado.error && <div className="banda banda-error">⚠️ {estado.error}</div>}
      {atencion.length > 0 && diaAtencion && (
        <button
          className={`banda ${atencion.some((p) => esRojo(estadoTimer(p, ahora)?.nivel)) ? 'banda-rojo' : 'banda-amarillo'}`}
          onClick={() => { setPagina('pedidos'); setDia(diaAtencion) }}
        >
          ⚠️ {atencion.length === 1 ? '1 pedido necesita' : `${atencion.length} pedidos necesitan`} atención ({nombreDia(diaAtencion, hoy)}). Toca para ver
        </button>
      )}

      <main className="contenido">
        {pagina === 'pedidos' && (
          <>
            <AvisoInventario insumos={estado.insumos} onVer={() => setPagina('inventario')} />
            <PestanasDia pedidos={estado.pedidos} hoy={hoy} dia={dia} onElegir={setDia} />
            <Tablero pedidos={estado.pedidos} dia={dia} ahora={ahora} sacudidas={sacudidas} onEditar={(p) => setForm({ id: p.id })} onRecetario={irARecetario} />
          </>
        )}
        {pagina === 'recetario' && <Recetario destino={destino} onVolverPedidos={() => { setPagina('pedidos'); setDestino(null) }} onVerInventario={() => { setPagina('inventario'); setDestino(null) }} />}
        {pagina === 'inventario' && <Inventario />}
        {pagina === 'catalogo' && <Catalogo />}
        {pagina === 'reportes' && <Reportes />}
        {pagina === 'ajustes' && <Ajustes />}
      </main>

      {eligiendoReceta && (
        <ElegirReceta pedido={eligiendoReceta} onElegir={(d) => { setEligiendoReceta(null); abrirReceta(d) }} onCerrar={() => setEligiendoReceta(null)} />
      )}
      {form && (
        <FormPedido key={form.id ?? 'nuevo'} pedido={editando} diaSugerido={dia} onCerrar={() => setForm(null)} />
      )}
    </div>
  )
}
