import { useState } from 'react'
import { store, useEstado } from '../data'
import { accion } from '../lib/accion'
import { calcularAviso, calcularTotal } from '../lib/reglas'
import { claveDia, fechaLocal, formatoFechaHora, formatoQ, hora24, nombreDia, sumarDias } from '../lib/tiempo'
import type { LineaPedido, MetodoPago, Pedido, Producto, TipoEntrega } from '../types'
import { cambio, sugerenciasPago } from '../lib/pago'
import { SelectorHora, horaTexto } from './SelectorHora'

interface Props {
  pedido: Pedido | null
  /** Día que se está viendo en el tablero (para sugerir la fecha). */
  diaSugerido: string
  onCerrar: () => void
}

const DIAS_A_MOSTRAR = 7

/** "Hecho"/Enter en el teclado de la tablet: suelta el campo para que se esconda el teclado. */
function alTerminar(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'Enter' || e.keyCode === 13) {
    e.preventDefault()
    e.currentTarget.blur()
  }
}

/** Tocar fuera de un campo de texto esconde el teclado (la tablet no lo hace sola). */
function soltarAlTocarFuera(e: React.PointerEvent) {
  const activo = document.activeElement as HTMLElement | null
  if (!activo || !/^(INPUT|TEXTAREA)$/.test(activo.tagName)) return
  if ((e.target as HTMLElement).closest('input, textarea, select, label')) return
  activo.blur()
}

/** "hoy", "mañana" o "el jueves, 6 de noviembre". */
function cuandoTexto(dia: string, hoy: string): string {
  const nd = nombreDia(dia, hoy)
  return nd === 'Hoy' || nd === 'Mañana' ? nd.toLowerCase() : `el ${nombreDia(dia, hoy, true)}`
}

export function FormPedido({ pedido, diaSugerido, onCerrar }: Props) {
  const { productos, ajustes } = useEstado()
  const ahora = new Date()
  const hoy = claveDia(ahora)

  const [casa, setCasa] = useState(pedido?.casa ?? '')
  const [cliente, setCliente] = useState(pedido?.cliente ?? '')
  const [lineas, setLineas] = useState<LineaPedido[]>(pedido?.lineas ?? [])
  const [notas, setNotas] = useState(pedido?.notas ?? '')
  const [tipo, setTipo] = useState<TipoEntrega>(pedido?.tipo ?? (diaSugerido > hoy ? 'programado' : 'asap'))
  const [dia, setDia] = useState(pedido?.tipo === 'programado' ? claveDia(pedido.entregaEn) : diaSugerido > hoy ? diaSugerido : hoy)
  const [hora, setHora] = useState(pedido?.tipo === 'programado' ? hora24(pedido.entregaEn) : '')
  const [timerMin, setTimerMin] = useState(pedido?.timerMin ?? ajustes.timerMin)
  const [eligiendo, setEligiendo] = useState<Producto | null>(null)
  const [conNombre, setConNombre] = useState(!!pedido?.cliente)
  const [pago, setPago] = useState<MetodoPago | null>(pedido?.pago ?? null)
  // Texto del campo "paga con" ('' = exacto o no se sabe).
  const [pagaCon, setPagaCon] = useState(pedido?.pagaCon != null ? String(pedido.pagaCon) : '')
  // true mientras se escribe en "Otro" (para no borrar lo escrito si coincide con un botón).
  const [otro, setOtro] = useState(false)
  const elegirMonto = (v: string) => { setPagaCon(v); setOtro(false) }
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const activos = productos.filter((p) => p.activo).sort((a, b) => a.orden - b.orden)
  const total = calcularTotal(lineas)
  const entrega = tipo === 'programado' && hora ? fechaLocal(dia, hora) : null
  const avisoEn = entrega ? calcularAviso('programado', pedido?.creadoEn ?? ahora.toISOString(), entrega.toISOString()) : null
  const pagaConNum = pagaCon.trim() ? Number(pagaCon.replace(',', '.')) : null
  const vuelto = cambio(total, pagaConNum)
  const sugerencias = sugerenciasPago(total)
  const elegirPago = (m: MetodoPago) => setPago((actual) => (actual === m ? null : m))
  const unidades = (prodId: string) => lineas.filter((l) => l.productoId === prodId).reduce((s, l) => s + l.cantidad, 0)

  // Días en botones: hoy y los siguientes. Si el pedido es para un día más lejano, se agrega.
  const dias = Array.from({ length: DIAS_A_MOSTRAR }, (_, k) => sumarDias(hoy, k))
  if (!dias.includes(dia)) dias.push(dia)

  const agregar = (prod: Producto, variedad: string | null) => {
    setLineas((ls) => {
      const i = ls.findIndex((l) => l.productoId === prod.id && l.variedad === variedad)
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, cantidad: l.cantidad + 1 } : l))
      return [...ls, { productoId: prod.id, nombre: prod.nombre, variedad, precio: prod.precio, cantidad: 1 }]
    })
    setError('')
  }
  const cambiarCantidad = (i: number, d: number) =>
    setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, cantidad: l.cantidad + d } : l)).filter((l) => l.cantidad > 0))

  const elegirDia = (d: string) => {
    setDia(d)
    // Si la hora elegida ya pasó para hoy, se borra para elegir otra.
    if (d === hoy && hora && fechaLocal(d, hora).getTime() < ahora.getTime()) setHora('')
  }

  const guardar = async () => {
    if (!casa.trim() && !cliente.trim()) return setError('Escribe el número de casa o el nombre del cliente.')
    if (!lineas.length) return setError('Toca al menos un producto.')
    if (tipo === 'programado' && !hora) return setError('Elige la hora de entrega.')
    if (!pedido && entrega && entrega.getTime() < ahora.getTime() - 60_000) return setError('La hora de entrega ya pasó. Elige otra.')
    if (!(timerMin >= 1)) return setError('El temporizador debe ser de al menos 1 minuto.')
    if (pago === 'efectivo' && pagaConNum !== null && !(pagaConNum >= 0)) return setError('Escribe con cuánto paga, solo números.')
    if (pago === 'efectivo' && pagaConNum !== null && pagaConNum < total) return setError(`Paga con ${formatoQ(pagaConNum)}, menos que el total de ${formatoQ(total)}.`)
    setError('')
    const datos = {
      casa: casa.trim(), cliente: cliente.trim(), lineas, notas: notas.trim(), tipo,
      entregaEn: entrega?.toISOString() ?? pedido?.creadoEn ?? ahora.toISOString(), timerMin,
      pago, pagaCon: pago === 'efectivo' && pagaConNum !== null && pagaConNum > total ? pagaConNum : null,
    }
    setGuardando(true)
    const ok = await accion(() => (pedido ? store.editarPedido(pedido.id, datos) : store.crearPedido(datos)))
    setGuardando(false)
    if (ok) onCerrar()
  }

  const eliminar = async () => {
    if (!pedido || !confirm(`¿Eliminar el pedido #${pedido.numero}? No se puede deshacer.`)) return
    if (await accion(() => store.eliminarPedido(pedido.id))) onCerrar()
  }

  const minimoHoy = dia === hoy && !pedido ? hora24(ahora) : undefined

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal modal-pedido" onClick={(e) => e.stopPropagation()} onPointerDown={soltarAlTocarFuera} role="dialog" aria-labelledby="titulo-pedido">
        <header className="modal-cabeza">
          <h2 id="titulo-pedido">{pedido ? `Editar pedido #${pedido.numero}` : 'Nuevo pedido'}</h2>
          <button className="btn btn-icono btn-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>

        <div className="modal-cuerpo form-pedido">
          <div className="form-col">
            <section className="paso">
              <h3><span className="paso-n">1</span>¿Para quién?</h3>
              <div className="quien">
                <label className="campo campo-casa">
                  <span>Número de casa</span>
                  <input
                    value={casa} onChange={(e) => setCasa(e.target.value.replace(/[^\d]/g, ''))}
                    inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" autoComplete="off" onKeyDown={alTerminar}
                    placeholder="24" autoFocus={!pedido} aria-describedby="ayuda-casa"
                  />
                </label>
                {conNombre ? (
                  <label className="campo">
                    <span>Nombre {casa ? '(opcional)' : ''}</span>
                    <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" autoComplete="off" enterKeyHint="done" onKeyDown={alTerminar} autoFocus={!pedido} />
                  </label>
                ) : (
                  <button className="btn btn-con-nombre" onClick={() => setConNombre(true)}>Agregar nombre</button>
                )}
              </div>
              <p className="ayuda" id="ayuda-casa">Solo número. Si no tiene casa, usa el nombre.</p>
            </section>

            <section className="paso">
              <h3><span className="paso-n">2</span>¿Qué lleva?</h3>
              {eligiendo ? (
                <div className="variedades">
                  <div className="variedades-cabeza">
                    <div className="variedades-titulo">{eligiendo.nombre}: ¿de qué?</div>
                    <button className="btn btn-volver" onClick={() => setEligiendo(null)}>Listo</button>
                  </div>
                  <div className="rejilla rejilla-grande">
                    {eligiendo.variedades.map((v) => {
                      const n = lineas.find((l) => l.productoId === eligiendo.id && l.variedad === v)?.cantidad ?? 0
                      return (
                        <button key={v} className={`btn btn-producto ${n ? 'con-cantidad' : ''}`} onClick={() => agregar(eligiendo, v)}>
                          <span className="producto-nombre">{v}</span>
                          {n > 0 && <span className="producto-cuenta" aria-label={`${n} en el pedido`}>{n}</span>}
                        </button>
                      )
                    })}
                  </div>
                  <p className="ayuda ayuda-oscura">Cada toque agrega uno. Toca Listo para volver a los productos.</p>
                </div>
              ) : (
                <div className="rejilla rejilla-grande">
                  {activos.map((p) => {
                    const n = unidades(p.id)
                    return (
                      <button key={p.id} className={`btn btn-producto ${n ? 'con-cantidad' : ''}`}
                        onClick={() => (p.variedades.length ? setEligiendo(p) : agregar(p, null))}>
                        <span className="producto-nombre">{p.nombre}</span>
                        <span className="producto-precio">{formatoQ(p.precio)}</span>
                        {p.variedades.length > 0 && <span className="producto-tamano">Elegir sabor</span>}
                        {n > 0 && <span className="producto-cuenta" aria-label={`${n} en el pedido`}>{n}</span>}
                      </button>
                    )
                  })}
                  {!activos.length && <div className="vacio">No hay productos. Agrégalos en Catálogo.</div>}
                </div>
              )}
            </section>
          </div>

          <div className="form-col">
            <section className="paso resumen">
              <h3>El pedido</h3>
              <ul className="lineas">
                {lineas.map((l, i) => (
                  <li key={i}>
                    <span className="linea-nombre">{l.nombre}{l.variedad ? <em> {l.variedad.toLowerCase()}</em> : ''}</span>
                    <span className="cantidad cantidad-grande">
                      <button className="btn" onClick={() => cambiarCantidad(i, -1)} aria-label={`Quitar uno de ${l.nombre}`}>−</button>
                      <b>{l.cantidad}</b>
                      <button className="btn" onClick={() => cambiarCantidad(i, 1)} aria-label={`Agregar uno de ${l.nombre}`}>+</button>
                    </span>
                    <span className="linea-sub">{formatoQ(l.precio * l.cantidad)}</span>
                  </li>
                ))}
                {!lineas.length && <li className="vacio">Toca los productos de la izquierda para agregarlos.</li>}
              </ul>
              <div className="total">Total <b>{formatoQ(total)}</b></div>
              <label className="campo">
                <span>Notas (opcional)</span>
                <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Mensaje en el pastel, indicaciones…" />
              </label>
            </section>

            <section className="paso">
              <h3><span className="paso-n">3</span>¿Para cuándo?</h3>
              <div className="segmentado segmentado-grande">
                <button className={tipo === 'asap' ? 'activo' : ''} aria-pressed={tipo === 'asap'} onClick={() => setTipo('asap')}>Lo antes posible</button>
                <button className={tipo === 'programado' ? 'activo' : ''} aria-pressed={tipo === 'programado'} onClick={() => setTipo('programado')}>Para una hora</button>
              </div>
              {tipo === 'programado' && (
                <div className="programar">
                  <div className="dias" role="group" aria-label="Día de entrega">
                    {dias.map((d) => (
                      <button key={d} className={`btn dia ${dia === d ? 'activo' : ''}`} aria-pressed={dia === d} onClick={() => elegirDia(d)}>
                        {nombreDia(d, hoy)}
                      </button>
                    ))}
                    <label className="btn dia dia-otra">
                      Otra fecha
                      <input type="date" min={pedido ? undefined : hoy} value={dia} onChange={(e) => e.target.value && elegirDia(e.target.value)}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} aria-label="Elegir otra fecha" />
                    </label>
                  </div>
                  <SelectorHora valor={hora} onCambiar={setHora} minimo={minimoHoy} />
                  <div className={`entrega-resumen ${entrega ? '' : 'pendiente'}`} aria-live="polite">
                    {entrega
                      ? <span>Entrega <b>{cuandoTexto(dia, hoy)}</b> a las <b>{horaTexto(hora)}</b></span>
                      : 'Elige la hora de entrega'}
                    {avisoEn && <small>Aviso por correo {formatoFechaHora(avisoEn, ahora)}</small>}
                  </div>
                </div>
              )}
            </section>

            <section className="paso">
              <h3><span className="paso-n">4</span>¿Cómo paga? <small className="opcional">opcional</small></h3>
              <div className="segmentado segmentado-grande">
                <button className={pago === 'efectivo' ? 'activo' : ''} aria-pressed={pago === 'efectivo'} onClick={() => elegirPago('efectivo')}>Efectivo</button>
                <button className={pago === 'transferencia' ? 'activo' : ''} aria-pressed={pago === 'transferencia'} onClick={() => elegirPago('transferencia')}>Transferencia</button>
              </div>
              {pago === 'efectivo' && (
                <div className="efectivo">
                  <span className="reloj-etiqueta" id="etq-paga">¿Con cuánto paga?</span>
                  <div className="paga-con" role="group" aria-labelledby="etq-paga">
                    <button className={`btn ${!otro && !pagaCon.trim() ? 'activo' : ''}`} aria-pressed={!otro && !pagaCon.trim()} onClick={() => elegirMonto('')}>Exacto</button>
                    {sugerencias.map((v) => (
                      <button key={v} className={`btn ${!otro && pagaConNum === v ? 'activo' : ''}`} aria-pressed={!otro && pagaConNum === v} onClick={() => elegirMonto(String(v))}>{formatoQ(v)}</button>
                    ))}
                    <label className={`paga-otro ${otro || (pagaConNum !== null && !sugerencias.includes(pagaConNum)) ? 'activo' : ''}`}>
                      <span>Q</span>
                      <input value={otro || (pagaConNum !== null && !sugerencias.includes(pagaConNum)) ? pagaCon : ''} onChange={(e) => { setOtro(true); setPagaCon(e.target.value.replace(/[^\d.,]/g, '')) }}
                        inputMode="decimal" enterKeyHint="done" onKeyDown={alTerminar} placeholder="Otro" aria-label="Otra cantidad" />
                    </label>
                  </div>
                  <div className={`cambio ${vuelto > 0 ? '' : 'sin-cambio'}`} aria-live="polite">
                    {!lineas.length ? 'Agrega productos para calcular el cambio.'
                      : pagaConNum !== null && pagaConNum < total ? <>Faltan <b>{formatoQ(Math.round((total - pagaConNum) * 100) / 100)}</b> para el total</>
                      : vuelto > 0 ? <>Cambio <b>{formatoQ(vuelto)}</b><small>Paga con {formatoQ(pagaConNum!)}, total {formatoQ(total)}</small></>
                      : <>Sin cambio: paga exacto {formatoQ(total)}</>}
                  </div>
                </div>
              )}
              {pago === 'transferencia' && <p className="ayuda">Confirma que la transferencia llegó antes de entregar.</p>}
            </section>

            <details className="mas-opciones">
              <summary>Tiempo para empezar a prepararlo: <b>{timerMin} min</b></summary>
              <div className="campo-timer">
                <span className="cantidad cantidad-grande">
                  <button className="btn" onClick={() => setTimerMin((m) => Math.max(1, m - 5))}>−5</button>
                  <b>{timerMin}</b><span>min</span>
                  <button className="btn" onClick={() => setTimerMin((m) => m + 5)}>+5</button>
                </span>
                <p className="ayuda">{tipo === 'programado'
                  ? `El temporizador arranca ${timerMin} min antes de la hora de entrega.`
                  : `El temporizador avisa si no se empieza en ${timerMin} min.`}</p>
              </div>
            </details>
          </div>
        </div>

        <footer className="modal-pie">
          {error && <div className="error" role="alert">{error}</div>}
          {pedido && <button className="btn btn-peligro" onClick={eliminar}>Eliminar</button>}
          <span className="espacio" />
          <button className="btn btn-pie" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-primario btn-pie btn-crear" disabled={guardando} onClick={guardar}>
            {guardando ? 'Guardando…' : pedido ? 'Guardar cambios' : lineas.length ? `Crear pedido de ${formatoQ(total)}` : 'Crear pedido'}
          </button>
        </footer>
      </div>
    </div>
  )
}
