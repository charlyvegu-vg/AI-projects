import { useState } from 'react'
import { store, useEstado } from '../data'
import { accion } from '../lib/accion'
import { formatoQ } from '../lib/tiempo'
import { SIGUIENTE, avanzarConEnter } from '../lib/teclado'
import type { Producto } from '../types'

type Borrador = { id?: string; nombre: string; variedades: string; tamano: string; precio: string; activo: boolean; orden: number }

export function Catalogo() {
  const { productos } = useEstado()
  const [editando, setEditando] = useState<Borrador | null>(null)
  const lista = [...productos].sort((a, b) => a.orden - b.orden)

  const nuevo = () => setEditando({
    nombre: '', variedades: '', tamano: '', precio: '', activo: true,
    orden: Math.max(0, ...productos.map((p) => p.orden)) + 1,
  })
  const editar = (p: Producto) => setEditando({ ...p, variedades: p.variedades.join(', '), precio: String(p.precio) })

  return (
    <div className="pagina">
      <div className="pagina-cabeza">
        <div><h1>Catálogo</h1><div className="subtitulo">nuestras delicias</div></div>
        <button className="btn btn-primario" onClick={nuevo}>Agregar producto</button>
      </div>
      <div className="carta recorte">
        <ul className="carta-lista">
          {lista.map((p) => (
            <li key={p.id} className={p.activo ? '' : 'inactivo'}>
              <button className="carta-item" onClick={() => editar(p)}>
                <span className="carta-linea">
                  <span className="carta-nombre">{p.nombre}</span>
                  <span className="carta-puntos" />
                  <span className="carta-precio">{formatoQ(p.precio)}</span>
                </span>
                <span className="carta-detalle">
                  {p.tamano && <span>{p.tamano}</span>}
                  {p.variedades.length > 0 && <span className="carta-variedades">{p.variedades.join(', ')}</span>}
                  {!p.activo && <span className="etiqueta">Oculto</span>}
                </span>
              </button>
            </li>
          ))}
          {!lista.length && <li className="vacio">Aún no hay productos. Agrega el primero.</li>}
        </ul>
        <p className="ayuda carta-nota">Toca un producto para editarlo. Cambiar un precio no modifica los pedidos que ya se tomaron.</p>
      </div>
      {editando && <FormProducto inicial={editando} onCerrar={() => setEditando(null)} />}
    </div>
  )
}

function FormProducto({ inicial, onCerrar }: { inicial: Borrador; onCerrar: () => void }) {
  const [b, setB] = useState(inicial)
  const [error, setError] = useState('')
  const campo = (k: keyof Borrador) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setB({ ...b, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const guardar = async () => {
    const precio = Number(b.precio.replace(',', '.'))
    if (!b.nombre.trim()) return setError('Escribe el nombre del producto.')
    if (!(precio > 0)) return setError('Escribe un precio válido.')
    const variedades = b.variedades.split(',').map((v) => v.trim()).filter(Boolean)
      .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
    const ok = await accion(() => store.guardarProducto({
      id: b.id, nombre: b.nombre.trim(), variedades, tamano: b.tamano.trim(), precio, activo: b.activo, orden: b.orden,
    }))
    if (ok) onCerrar()
  }
  const eliminar = async () => {
    if (!b.id || !confirm(`¿Eliminar "${b.nombre}"? Los pedidos anteriores no se afectan.`)) return
    if (await accion(() => store.eliminarProducto(b.id!))) onCerrar()
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal modal-chico" onClick={(e) => e.stopPropagation()}>
        <header className="modal-cabeza">
          <h2>{b.id ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button className="btn btn-icono" onClick={onCerrar}>✕</button>
        </header>
        <div className="modal-cuerpo" onKeyDown={avanzarConEnter(guardar)}>
          <label className="campo"><span>Nombre</span><input value={b.nombre} onChange={campo('nombre')} autoFocus {...SIGUIENTE} /></label>
          <label className="campo"><span>Variedades (separadas por coma, opcional)</span>
            <input value={b.variedades} onChange={campo('variedades')} placeholder="Ej. Manzana, piña, manjar" {...SIGUIENTE} /></label>
          <div className="fila">
            <label className="campo"><span>Tamaño (opcional)</span><input value={b.tamano} onChange={campo('tamano')} placeholder="Ej. Individual" {...SIGUIENTE} /></label>
            <label className="campo campo-precio"><span>Precio (Q)</span><input value={b.precio} onChange={campo('precio')} inputMode="decimal" enterKeyHint="go" /></label>
          </div>
          <label className="check"><input type="checkbox" checked={b.activo} onChange={campo('activo')} /> Disponible para nuevos pedidos</label>
        </div>
        <footer className="modal-pie">
          {error && <div className="error">{error}</div>}
          {b.id && <button className="btn btn-peligro" onClick={eliminar}>Eliminar</button>}
          <span className="espacio" />
          <button className="btn" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-primario" onClick={guardar}>Guardar</button>
        </footer>
      </div>
    </div>
  )
}
