import { useEffect, useState } from 'react'
import { store } from '../data'
import { accion } from '../lib/accion'
import { esAlerta, estadoTimer } from '../lib/reglas'
import { formatoDuracion, formatoFechaHora, formatoHora, formatoQ } from '../lib/tiempo'
import { cambio, textoPago } from '../lib/pago'
import { FASES, type Fase, type Pedido } from '../types'

const SIGUIENTE: Record<Fase, { fase: Fase; texto: string } | null> = {
  pendiente: { fase: 'preparacion', texto: 'Iniciar preparación' },
  preparacion: { fase: 'listo', texto: 'Listo para entrega' },
  listo: { fase: 'entregado', texto: 'Entregado' },
  entregado: null,
}

interface Props {
  pedido: Pedido
  ahora: Date
  sacudida: number
  onEditar: (p: Pedido) => void
  onRecetario: (p: Pedido) => void
}

export function TarjetaPedido({ pedido: p, ahora, sacudida, onEditar, onRecetario }: Props) {
  const [sacudiendo, setSacudiendo] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => { if (sacudida) setSacudiendo(true) }, [sacudida])

  const est = estadoTimer(p, ahora)
  const sig = SIGUIENTE[p.fase]
  const idx = FASES.findIndex((f) => f.id === p.fase)
  const anterior = idx > 0 ? FASES[idx - 1] : null

  const ejecutar = async (fn: () => Promise<unknown>) => {
    setOcupado(true)
    await accion(fn)
    setOcupado(false)
  }

  const titulo = p.casa ? `Casa ${p.casa}` : p.cliente

  return (
    <article
      className={`tarjeta recorte nivel-${est?.nivel ?? 'ninguno'} ${sacudiendo ? 'sacudir' : ''}`}
      onAnimationEnd={() => setSacudiendo(false)}
    >
      <header className="tarjeta-cabeza">
        <div>
          <div className="tarjeta-titulo">{titulo}</div>
          {p.casa && p.cliente && <div className="tarjeta-sub">{p.cliente}</div>}
        </div>
        <div className="tarjeta-num">#{p.numero}</div>
      </header>

      <div className="tarjeta-entrega">
        {p.tipo === 'asap' ? <><span className="punto punto-asap" />Lo antes posible</> : <><span className="punto" />Entrega {formatoHora(p.entregaEn)}</>}
      </div>

      <ul className="tarjeta-lineas">
        {p.lineas.map((l, i) => (
          <li key={i}>
            <b>{l.cantidad}×</b> {l.nombre}{l.variedad ? ` (${l.variedad.toLowerCase()})` : ''}
          </li>
        ))}
      </ul>
      {p.notas && <div className="tarjeta-notas">{p.notas}</div>}
      {p.pago && (
        <div className={`tarjeta-pago ${cambio(p.total, p.pagaCon) > 0 ? 'con-cambio' : ''}`}>{textoPago(p, formatoQ)}</div>
      )}
      {p.fase !== 'entregado' && (
        <button className="btn-receta" onClick={() => onRecetario(p)}>Ir al recetario</button>
      )}

      {est && (
        <div className="timer">
          {est.nivel === 'espera' ? (
            <div className="timer-texto">Temporizador inicia {formatoHora(est.inicio)}</div>
          ) : (
            <>
              <div className="timer-barra">
                <div style={{ width: `${Math.min(100, est.progreso * 100)}%` }} />
              </div>
              <div className="timer-texto">
                {est.nivel === 'atrasado'
                  ? <>Atrasado <b>+{formatoDuracion(-est.restanteMs)}</b></>
                  : <>Iniciar en <b>{formatoDuracion(est.restanteMs)}</b></>}
              </div>
            </>
          )}
        </div>
      )}

      {p.avisoEn && p.fase !== 'entregado' && (
        <div className="tarjeta-aviso">
          {p.avisoEnviado ? '✉ Aviso enviado' : `✉ Aviso por correo ${formatoFechaHora(p.avisoEn, ahora)}`}
        </div>
      )}

      <footer className="tarjeta-pie">
        <span className="tarjeta-total">{formatoQ(p.total)}</span>
        <div className="tarjeta-botones">
          {est && esAlerta(est.nivel) && (
            <button
              className={`btn btn-icono ${p.silenciado ? '' : 'btn-silenciar'}`}
              disabled={ocupado}
              onClick={() => ejecutar(() => store.silenciar(p.id, !p.silenciado))}
              title={p.silenciado ? 'Activar sonido' : 'Silenciar'}
            >
              {p.silenciado ? '🔈 Activar' : '🔇 Silenciar'}
            </button>
          )}
          <button className="btn btn-icono" onClick={() => onEditar(p)} title="Editar">✎</button>
          {anterior && (
            <button
              className="btn btn-icono" disabled={ocupado} title={`Regresar a ${anterior.nombre}`}
              onClick={() => ejecutar(() => store.cambiarFase(p.id, anterior.id))}
            >↩︎</button>
          )}
        </div>
      </footer>
      {sig && (
        <button
          className={`btn btn-siguiente fase-${sig.fase}`} disabled={ocupado}
          onClick={() => ejecutar(() => store.cambiarFase(p.id, sig.fase))}
        >
          {sig.texto}
        </button>
      )}
    </article>
  )
}
