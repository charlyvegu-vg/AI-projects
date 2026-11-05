import { estadoTexto, nivel, porAcabarse } from '../lib/inventario'
import type { Insumo } from '../types'

const MAX = 4

/** Aviso en la página de pedidos cuando hay insumos por acabarse. */
export function AvisoInventario({ insumos, onVer }: { insumos: Insumo[]; onVer: () => void }) {
  const bajos = porAcabarse(insumos)
  if (!bajos.length) return null
  const agotados = bajos.filter((i) => nivel(i) === 'agotado').length
  const resto = bajos.length - MAX
  return (
    <button className={`aviso-inventario ${agotados ? 'con-agotados' : ''}`} onClick={onVer}>
      <span className="aviso-inventario-titulo">
        {bajos.length === 1 ? '1 insumo por acabarse' : `${bajos.length} insumos por acabarse`}
        {agotados > 0 && <em>{agotados === 1 ? ', 1 agotado' : `, ${agotados} agotados`}</em>}
      </span>
      <span className="aviso-inventario-lista">
        {bajos.slice(0, MAX).map((i) => (
          <span key={i.id} className={`aviso-item nivel-${nivel(i)}`}><b>{i.nombre}</b> {estadoTexto(i).toLowerCase()}</span>
        ))}
        {resto > 0 && <span className="aviso-item">y {resto} más</span>}
      </span>
      <span className="aviso-inventario-ver">Ver inventario</span>
    </button>
  )
}
