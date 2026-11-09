import { FASES, type Pedido } from '../types'
import { claveDia } from '../lib/tiempo'
import { TarjetaPedido } from './TarjetaPedido'

interface Props {
  pedidos: Pedido[]
  dia: string
  ahora: Date
  sacudidas: Record<string, number>
  onEditar: (p: Pedido) => void
  onRecetario: (p: Pedido) => void
}

export function Tablero({ pedidos, dia, ahora, sacudidas, onEditar, onRecetario }: Props) {
  const delDia = pedidos.filter((p) => claveDia(p.entregaEn) === dia)
  return (
    <div className="tablero">
      {FASES.map((f) => {
        const lista = delDia
          .filter((p) => p.fase === f.id)
          .sort((a, b) => f.id === 'entregado'
            ? b.entregaEn.localeCompare(a.entregaEn)
            : a.timerInicio.localeCompare(b.timerInicio))
        return (
          <section key={f.id} className={`columna columna-${f.id}`}>
            <h2>{f.nombre} <span className="contador">{lista.length}</span></h2>
            <div className="columna-lista">
              {lista.map((p) => (
                <TarjetaPedido key={p.id} pedido={p} ahora={ahora} sacudida={sacudidas[p.id] ?? 0} onEditar={onEditar} onRecetario={onRecetario} />
              ))}
              {!lista.length && <div className="vacio"><span className="vacio-adorno">♡</span>Sin pedidos</div>}
            </div>
          </section>
        )
      })}
    </div>
  )
}
