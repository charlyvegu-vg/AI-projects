import { useEffect, useMemo, useState } from 'react'
import { store, useEstado } from '../data'
import { useRecordado } from '../lib/navegacion'
import { csvVentas, limitesISO, moverAncla, rangoDe, resumir, type Periodo, type Rango } from '../lib/reportes'
import { ZONA, claveDia, fechaLocal, formatoHora, formatoQ, nombreDia, sumarDias } from '../lib/tiempo'
import type { Pedido } from '../types'

const PERIODOS: { id: Periodo; nombre: string }[] = [
  { id: 'dia', nombre: 'Día' },
  { id: 'semana', nombre: 'Semana' },
  { id: 'mes', nombre: 'Mes' },
  { id: 'rango', nombre: 'Rango' },
]

const fmt = (op: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat('es-GT', { timeZone: ZONA, ...op })
  return (clave: string) => f.format(fechaLocal(clave, '12:00')).replace(/\./g, '')
}
const fDiaLargo = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const fDiaMes = fmt({ day: 'numeric', month: 'long' })
const fDiaMesAno = fmt({ day: 'numeric', month: 'long', year: 'numeric' })
const fMes = fmt({ month: 'long', year: 'numeric' })
const fFila = fmt({ weekday: 'short', day: 'numeric', month: 'short' })
const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function titulo(periodo: Periodo, r: Rango): string {
  if (periodo === 'dia') return mayus(fDiaLargo(r.desde))
  if (periodo === 'mes') return mayus(fMes(r.desde))
  if (r.desde === r.hasta) return mayus(fDiaMesAno(r.desde))
  const mismoAno = r.desde.slice(0, 4) === r.hasta.slice(0, 4)
  const inicio = r.desde.slice(0, 7) === r.hasta.slice(0, 7) ? r.desde.slice(8).replace(/^0/, '') : mismoAno ? fDiaMes(r.desde) : fDiaMesAno(r.desde)
  return `${periodo === 'semana' ? 'Semana del' : 'Del'} ${inicio} al ${fDiaMesAno(r.hasta)}`
}

export function Reportes() {
  const { pedidos: cambios } = useEstado()
  const hoy = claveDia(new Date())
  const [periodo, setPeriodo] = useRecordado<Periodo>('reporte-periodo', 'dia', (p) => ['dia', 'semana', 'mes', 'rango'].includes(p))
  const [ancla, setAncla] = useRecordado('reporte-ancla', hoy)
  const [libre, setLibre] = useRecordado<Rango>('reporte-rango', { desde: sumarDias(hoy, -6), hasta: hoy }, (r) => !!r?.desde && !!r?.hasta)
  const [datos, setDatos] = useState<{ clave: string; pedidos: Pedido[] } | null>(null)
  const [error, setError] = useState('')

  const rango = periodo === 'rango' ? libre : rangoDe(periodo, ancla)
  const clave = `${rango.desde}|${rango.hasta}`
  const rangoValido = rango.desde <= rango.hasta

  // Se vuelve a consultar al cambiar el rango o cuando llegan cambios de pedidos (por ejemplo, uno se marca entregado).
  useEffect(() => {
    if (!rangoValido) return
    let vigente = true
    const { desde, hasta } = limitesISO(rango)
    store.pedidosEntre(desde, hasta)
      .then((pedidos) => { if (vigente) { setDatos({ clave, pedidos }); setError('') } })
      .catch((e: Error) => { if (vigente) setError(`No se pudo cargar el reporte: ${e.message}`) })
    return () => { vigente = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, cambios])

  const res = useMemo(() => (datos && datos.clave === clave ? resumir(datos.pedidos, rango) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datos, clave])

  const elegirPeriodo = (p: Periodo) => {
    if (p === 'rango' && periodo !== 'rango') setLibre(rango)
    setPeriodo(p)
  }

  const descargar = () => {
    if (!res) return
    const url = URL.createObjectURL(new Blob([csvVentas(res)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = rango.desde === rango.hasta ? `ventas-${rango.desde}.csv` : `ventas-${rango.desde}-a-${rango.hasta}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const maxDia = res ? Math.max(1, ...res.porDia.map((d) => d.monto)) : 1
  const variosDias = rango.desde !== rango.hasta

  return (
    <div className="pagina pagina-reportes">
      <div className="pagina-cabeza no-imprimir">
        <div><h1>Reportes</h1><div className="subtitulo">cuentas claras</div></div>
        <div className="reporte-acciones">
          <button className="btn" onClick={() => window.print()} disabled={!res}>Imprimir</button>
          <button className="btn btn-primario" onClick={descargar} disabled={!res || !res.entregados.length}>Descargar Excel (CSV)</button>
        </div>
      </div>

      <div className="reporte-controles no-imprimir">
        <div className="segmentado segmentado-oscuro">
          {PERIODOS.map((p) => (
            <button key={p.id} className={periodo === p.id ? 'activo' : ''} onClick={() => elegirPeriodo(p.id)}>{p.nombre}</button>
          ))}
        </div>
        {periodo === 'rango' ? (
          <div className="reporte-rango">
            <label className="campo"><span>Desde</span>
              <input type="date" value={libre.desde} onChange={(e) => e.target.value && setLibre({ ...libre, desde: e.target.value })} /></label>
            <label className="campo"><span>Hasta</span>
              <input type="date" value={libre.hasta} onChange={(e) => e.target.value && setLibre({ ...libre, hasta: e.target.value })} /></label>
          </div>
        ) : (
          <div className="reporte-nav">
            <button className="btn btn-icono" onClick={() => setAncla(moverAncla(periodo, ancla, -1))} aria-label="Periodo anterior">‹</button>
            <button className="btn" onClick={() => setAncla(hoy)} disabled={rango.desde <= hoy && hoy <= rango.hasta}>
              {{ dia: 'Hoy', semana: 'Esta semana', mes: 'Este mes' }[periodo]}
            </button>
            <button className="btn btn-icono" onClick={() => setAncla(moverAncla(periodo, ancla, 1))} aria-label="Periodo siguiente">›</button>
          </div>
        )}
      </div>

      {!rangoValido && <p className="reporte-aviso">La fecha "desde" debe ser anterior o igual a "hasta".</p>}
      {error && <p className="reporte-aviso">{error}</p>}

      {rangoValido && (
        <div className="reporte">
          <section className="cierre recorte">
            <div className="cierre-marca">Zuréa Desserts</div>
            <h2 className="cierre-titulo">{titulo(periodo, rango)}</h2>
            {!res ? <p className="ayuda cierre-cargando">Cargando…</p> : (
              <>
                <div className="cierre-total">
                  <span>Total vendido</span>
                  <b>{formatoQ(res.ventas)}</b>
                </div>
                <dl className="cierre-filas">
                  <div><dt>Pedidos entregados</dt><dd>{res.entregados.length}</dd></div>
                  <div><dt>Productos vendidos</dt><dd>{res.unidades}</dd></div>
                  <div><dt>Promedio por pedido</dt><dd>{formatoQ(res.promedio)}</dd></div>
                </dl>
                <dl className="cierre-filas cierre-pagos">
                  <div><dt>Efectivo</dt><dd>{formatoQ(res.porPago.efectivo.monto)}</dd></div>
                  <div><dt>Transferencia</dt><dd>{formatoQ(res.porPago.transferencia.monto)}</dd></div>
                  {res.porPago.sinIndicar.pedidos > 0 && <div><dt>Sin indicar forma de pago</dt><dd>{formatoQ(res.porPago.sinIndicar.monto)}</dd></div>}
                </dl>
                {res.pendientes.cantidad > 0 && (
                  <p className="cierre-pendientes">
                    {res.pendientes.cantidad === 1 ? 'Hay 1 pedido' : `Hay ${res.pendientes.cantidad} pedidos`} de este periodo sin entregar
                    ({formatoQ(res.pendientes.monto)}). No se cuentan como venta hasta marcarlos como entregados.
                  </p>
                )}
                <p className="ayuda cierre-nota">Se cuentan los pedidos entregados según su fecha de entrega.</p>
              </>
            )}
          </section>

          {res && (
            <div className="reporte-detalle">
              {!res.entregados.length ? (
                <section className="panel reporte-vacio">
                  <h2>Sin ventas en este periodo</h2>
                  <p className="ayuda">Aquí aparecerán los pedidos cuando se marquen como entregados. Prueba con otro {periodo === 'rango' ? 'rango de fechas' : periodo === 'dia' ? 'día' : periodo}.</p>
                </section>
              ) : (
                <>
                  {variosDias && (
                    <section className="panel">
                      <h2>Por día</h2>
                      <table className="tabla-reporte">
                        <thead><tr><th>Día</th><th className="num">Pedidos</th><th className="num">Vendido</th></tr></thead>
                        <tbody>
                          {res.porDia.filter((d) => d.dia <= hoy || d.pedidos).map((d) => (
                            <tr key={d.dia} className={d.pedidos ? '' : 'sin-ventas'}>
                              <td>
                                <span className="dia-nombre">{mayus(fFila(d.dia))}</span>
                                <span className="barra-dia"><span style={{ width: `${(d.monto / maxDia) * 100}%` }} /></span>
                              </td>
                              <td className="num">{d.pedidos || '–'}</td>
                              <td className="num monto">{d.pedidos ? formatoQ(d.monto) : '–'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  )}

                  <section className="panel">
                    <h2>Por producto</h2>
                    <table className="tabla-reporte">
                      <thead><tr><th>Producto</th><th className="num">Cantidad</th><th className="num">Vendido</th></tr></thead>
                      <tbody>
                        {res.porProducto.map((p) => (
                          <tr key={p.nombre}><td>{p.nombre}</td><td className="num">{p.cantidad}</td><td className="num monto">{formatoQ(p.monto)}</td></tr>
                        ))}
                      </tbody>
                      <tfoot><tr><td>Total</td><td className="num">{res.unidades}</td><td className="num monto">{formatoQ(res.ventas)}</td></tr></tfoot>
                    </table>
                  </section>

                  <details className="panel pedidos-reporte" open={!variosDias}>
                    <summary><h2>Pedidos entregados</h2><span className="ayuda">{res.entregados.length}</span></summary>
                    <table className="tabla-reporte">
                      <thead><tr><th>Pedido</th><th>Entrega</th><th>Productos</th><th className="num">Total</th></tr></thead>
                      <tbody>
                        {res.entregados.map((p) => (
                          <tr key={p.id}>
                            <td><b>#{p.numero}</b> {p.casa ? `Casa ${p.casa}` : p.cliente}</td>
                            <td className="suave">{variosDias ? `${nombreDia(claveDia(p.entregaEn), hoy)}, ` : ''}{formatoHora(p.entregaEn)}</td>
                            <td className="suave">{p.lineas.map((l) => `${l.cantidad} ${l.nombre}${l.variedad ? ` (${l.variedad.toLowerCase()})` : ''}`).join(', ')}</td>
                            <td className="num monto">{formatoQ(p.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
