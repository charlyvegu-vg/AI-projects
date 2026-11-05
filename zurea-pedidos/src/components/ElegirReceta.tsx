import type { Pedido } from '../types'
import type { DestinoReceta } from './Recetario'

/** Una opción por producto y variedad del pedido (sumando cantidades repetidas). */
export function opcionesReceta(p: Pedido): DestinoReceta[] {
  const titulo = p.casa ? `Casa ${p.casa}` : p.cliente
  const mapa = new Map<string, DestinoReceta>()
  for (const l of p.lineas) {
    const k = `${l.productoId}|${l.variedad ?? ''}`
    const previo = mapa.get(k)
    if (previo) previo.pedido!.cantidad += l.cantidad
    else mapa.set(k, { productoId: l.productoId, variedad: l.variedad, nombre: l.nombre, pedido: { id: p.id, numero: p.numero, titulo, cantidad: l.cantidad } })
  }
  return [...mapa.values()]
}

interface Props {
  pedido: Pedido
  onElegir: (d: DestinoReceta) => void
  onCerrar: () => void
}

export function ElegirReceta({ pedido, onElegir, onCerrar }: Props) {
  const opciones = opcionesReceta(pedido)
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal modal-chico" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="titulo-elegir">
        <header className="modal-cabeza">
          <h2 id="titulo-elegir">¿Qué receta necesitas?</h2>
          <button className="btn btn-icono" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>
        <div className="modal-cuerpo">
          <p className="ayuda">El pedido #{pedido.numero} tiene varios productos.</p>
          <div className="opciones-receta">
            {opciones.map((o) => (
              <button key={o.productoId + (o.variedad ?? '')} className="btn btn-producto" onClick={() => onElegir(o)}>
                <span className="producto-nombre">{o.nombre}</span>
                <span className="producto-tamano">{o.pedido!.cantidad} {o.pedido!.cantidad === 1 ? 'unidad' : 'unidades'}{o.variedad ? `, ${o.variedad.toLowerCase()}` : ''}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
