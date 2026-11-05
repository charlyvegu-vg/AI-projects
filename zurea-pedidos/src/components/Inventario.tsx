import { useState } from 'react'
import { store, useEstado } from '../data'
import { accion } from '../lib/accion'
import { ALERTA_CONTABLE, ALERTA_PESADO, cantidadTexto, conUnidad, estadoTexto, nivel, porAcabarse, porcentaje } from '../lib/inventario'
import { formatoFechaHora } from '../lib/tiempo'
import { SIGUIENTE, avanzarConEnter } from '../lib/teclado'
import type { Insumo, TipoInsumo } from '../types'

type Dialogo = { tipo: 'insumo'; insumo: Insumo | null } | { tipo: 'compra' | 'conteo'; insumo: Insumo }

export function Inventario() {
  const { insumos, movimientos, productos } = useEstado()
  const [dialogo, setDialogo] = useState<Dialogo | null>(null)
  const [busca, setBusca] = useState('')
  const bajos = porAcabarse(insumos)
  const filtro = busca.trim().toLowerCase()
  const visibles = [...insumos].sort((a, b) => a.nombre.localeCompare(b.nombre)).filter((i) => !filtro || i.nombre.toLowerCase().includes(filtro))
  const nombre = (id: string) => insumos.find((i) => i.id === id)?.nombre ?? 'Insumo eliminado'

  // La última receta descontada: sus movimientos comparten fecha y detalle.
  const ultimo = movimientos.find((m) => m.motivo === 'receta')
  const orden = { agotado: 0, bajo: 1, ok: 2 }
  const nivelDe = (id: string) => { const i = insumos.find((x) => x.id === id); return i ? orden[nivel(i)] : 3 }
  const ultimoGrupo = (ultimo ? movimientos.filter((m) => m.motivo === 'receta' && m.fecha === ultimo.fecha && m.detalle === ultimo.detalle) : [])
    .sort((a, b) => nivelDe(a.insumoId) - nivelDe(b.insumoId))
  // Cambios de los últimos 30 minutos, para resaltar en la lista.
  const desde = Date.now() - 30 * 60_000
  const recientes = new Map<string, number>()
  for (const m of movimientos) {
    if (Date.parse(m.fecha) < desde) break
    recientes.set(m.insumoId, (recientes.get(m.insumoId) ?? 0) + m.cambio)
  }

  // Cambio rápido de contables (−1 / +1): queda como ajuste en el historial.
  const sumar = (i: Insumo, d: number) =>
    accion(() => store.registrarMovimientos([{ insumoId: i.id, cambio: d, motivo: 'ajuste', detalle: d > 0 ? 'Ajuste rápido (+1)' : 'Ajuste rápido (−1)', ref: null }]))

  return (
    <div className="pagina pagina-inventario">
      <div className="pagina-cabeza">
        <div><h1>Inventario</h1><div className="subtitulo">lo que hay en la alacena</div></div>
        <button className="btn btn-primario" onClick={() => setDialogo({ tipo: 'insumo', insumo: null })}>Agregar insumo</button>
      </div>

      {bajos.length > 0 && (
        <section className="por-acabarse" aria-labelledby="titulo-bajos">
          <h2 id="titulo-bajos">Por acabarse</h2>
          <ul>
            {bajos.map((i) => (
              <li key={i.id} className={`nivel-${nivel(i)}`}>
                <span className="bajo-nombre">{i.nombre}</span>
                <span className="bajo-estado">{estadoTexto(i)}</span>
                <button className="btn btn-mini" onClick={() => setDialogo({ tipo: 'compra', insumo: i })}>Registrar compra</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ultimoGrupo.length > 0 && (
        <section className="ultimo-descuento" aria-labelledby="titulo-ultimo">
          <div className="ultimo-cabeza">
            <h2 id="titulo-ultimo">Último descuento por receta</h2>
            <span>{formatoFechaHora(ultimo!.fecha, new Date())}</span>
          </div>
          <p className="ultimo-detalle">{ultimo!.detalle}</p>
          <ul>
            {ultimoGrupo.map((m) => {
              const i = insumos.find((x) => x.id === m.insumoId)
              if (!i) return null
              const antes = i.cantidad - m.cambio
              const n = nivel(i)
              return (
                <li key={m.id} className={`nivel-${n}`}>
                  <span className="ultimo-nombre">{i.nombre}</span>
                  <span className="ultimo-cambio">{conUnidad(Math.round(antes * 1000) / 1000, i.unidad)} <span aria-hidden>→</span><span className="sr-solo">pasó a</span> <b>{conUnidad(i.cantidad, i.unidad)}</b></span>
                  {i.tipo === 'pesado' ? (
                    <span className="nivel-barra" role="img" aria-label={`${Math.round(porcentaje(i))} % restante`}>
                      <span className="nivel-antes" style={{ width: `${Math.min(100, i.referencia > 0 ? (antes / i.referencia) * 100 : 0)}%` }} />
                      <span style={{ width: `${porcentaje(i)}%` }} />
                      <i style={{ left: `${i.alerta}%` }} />
                    </span>
                  ) : <span className="nivel-barra nivel-barra-vacia" />}
                  <span className="ultimo-estado">{n === 'ok' ? 'Bien' : n === 'agotado' ? 'Agotado' : 'Por acabarse'}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {!insumos.length ? (
        <section className="panel inventario-vacio">
          <h2>Aún no hay insumos</h2>
          <p className="ayuda">Agrega lo que usas en las recetas: harina, azúcar, quesos, fruta, cajas… Luego, en cada receta, indica cuánto se descuenta por tanda.</p>
          <button className="btn btn-primario" onClick={() => setDialogo({ tipo: 'insumo', insumo: null })}>Agregar el primero</button>
        </section>
      ) : (
        <section className="alacena recorte">
          <input className="alacena-buscar" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar insumo" aria-label="Buscar insumo" />
          <ul className="alacena-lista">
            {visibles.map((i) => {
              const n = nivel(i)
              return (
                <li key={i.id} className={`insumo nivel-${n} ${recientes.get(i.id) ? 'reciente' : ''}`}>
                  <div className="insumo-info">
                    <span className="insumo-nombre">{i.nombre}</span>
                    {recientes.has(i.id) && recientes.get(i.id) !== 0 && (
                      <span className="insumo-reciente">{recientes.get(i.id)! < 0 ? 'Bajó' : 'Subió'} {conUnidad(Math.abs(Math.round(recientes.get(i.id)! * 1000) / 1000), i.unidad)} hace poco</span>
                    )}
                    <span className="insumo-regla">
                      {i.tipo === 'contable' ? `Avisa con ${conUnidad(i.alerta, i.unidad)} o menos` : `Avisa al bajar de ${cantidadTexto(i.alerta)} % de ${conUnidad(i.referencia, i.unidad)}`}
                    </span>
                  </div>
                  {i.tipo === 'contable' ? (
                    <div className="insumo-conteo">
                      <button className="btn btn-mini" onClick={() => sumar(i, -1)} disabled={i.cantidad <= 0} aria-label={`Quitar 1 a ${i.nombre}`}>−</button>
                      <span className="insumo-cantidad">{cantidadTexto(i.cantidad)}<small>{conUnidad(i.cantidad, i.unidad).replace(/^\S+\s?/, '')}</small></span>
                      <button className="btn btn-mini" onClick={() => sumar(i, 1)} aria-label={`Agregar 1 a ${i.nombre}`}>+</button>
                    </div>
                  ) : (
                    <div className="insumo-peso">
                      <span className="insumo-cantidad">{cantidadTexto(i.cantidad)}<small>{i.unidad}</small></span>
                      <span className="nivel-barra" role="img" aria-label={`${Math.round(porcentaje(i))} % restante`}>
                        <span style={{ width: `${porcentaje(i)}%` }} />
                        <i style={{ left: `${i.alerta}%` }} />
                      </span>
                      <span className="insumo-pct">{Math.round(porcentaje(i))} %</span>
                    </div>
                  )}
                  <div className="insumo-acciones">
                    <button className="btn btn-mini" onClick={() => setDialogo({ tipo: 'compra', insumo: i })}>Compra</button>
                    <button className="btn btn-mini" onClick={() => setDialogo({ tipo: 'conteo', insumo: i })}>Contar</button>
                    <button className="btn btn-mini" onClick={() => setDialogo({ tipo: 'insumo', insumo: i })}>Editar</button>
                  </div>
                </li>
              )
            })}
            {!visibles.length && <li className="vacio">No hay insumos con "{busca}".</li>}
          </ul>
        </section>
      )}

      {movimientos.length > 0 && (
        <section className="panel">
          <h2>Movimientos recientes</h2>
          <table className="tabla-reporte">
            <thead><tr><th>Cuándo</th><th>Insumo</th><th>Detalle</th><th className="num">Cambio</th></tr></thead>
            <tbody>
              {movimientos.slice(0, 25).map((m) => {
                const ins = insumos.find((i) => i.id === m.insumoId)
                return (
                  <tr key={m.id}>
                    <td className="suave">{formatoFechaHora(m.fecha, new Date())}</td>
                    <td>{nombre(m.insumoId)}</td>
                    <td className="suave">{m.detalle}</td>
                    <td className={`num ${m.cambio < 0 ? 'cambio-sale' : 'cambio-entra'}`}>{m.cambio > 0 ? '+' : '−'}{conUnidad(Math.abs(m.cambio), ins?.unidad ?? '')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {dialogo?.tipo === 'insumo' && (
        <FormInsumo insumo={dialogo.insumo} usos={dialogo.insumo ? productos.filter((p) => p.receta?.consumo?.some((c) => c.insumoId === dialogo.insumo!.id)).map((p) => p.nombre) : []} onCerrar={() => setDialogo(null)} />
      )}
      {(dialogo?.tipo === 'compra' || dialogo?.tipo === 'conteo') && (
        <FormMovimiento modo={dialogo.tipo} insumo={dialogo.insumo} onCerrar={() => setDialogo(null)} />
      )}
    </div>
  )
}

const UNIDADES = ['caja', 'lata', 'barra', 'bolsa', 'paquete', 'unidad', 'bote', 'lb', 'kg', 'g', 'oz', 'litro', 'ml']

function FormInsumo({ insumo, usos, onCerrar }: { insumo: Insumo | null; usos: string[]; onCerrar: () => void }) {
  const [nombre, setNombre] = useState(insumo?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoInsumo>(insumo?.tipo ?? 'contable')
  const [unidad, setUnidad] = useState(insumo?.unidad ?? '')
  const [cantidad, setCantidad] = useState(insumo ? '' : '')
  const [referencia, setReferencia] = useState(insumo ? String(insumo.referencia) : '')
  const [alerta, setAlerta] = useState(String(insumo?.alerta ?? ALERTA_CONTABLE))
  const [error, setError] = useState('')

  const cambiarTipo = (t: TipoInsumo) => {
    setTipo(t)
    // Al cambiar de tipo se sugiere la alerta por defecto de ese tipo.
    if (!insumo) setAlerta(String(t === 'contable' ? ALERTA_CONTABLE : ALERTA_PESADO))
  }
  const num = (s: string) => Number(s.replace(',', '.'))

  const guardar = async () => {
    if (!nombre.trim()) return setError('Escribe el nombre del insumo.')
    if (!unidad.trim()) return setError(tipo === 'contable' ? 'Escribe en qué se cuenta: caja, lata, barra…' : 'Escribe la unidad: lb, kg, litro…')
    const a = num(alerta)
    if (!(a >= 0) || (tipo === 'pesado' && a > 100)) return setError(tipo === 'pesado' ? 'El porcentaje de aviso debe estar entre 0 y 100.' : 'Escribe con cuántas unidades avisar.')
    const inicial = insumo ? insumo.cantidad : cantidad.trim() ? num(cantidad) : 0
    if (!(inicial >= 0)) return setError('Escribe una cantidad válida.')
    let ref = insumo ? num(referencia) : inicial
    if (tipo === 'pesado' && !(ref > 0)) {
      if (insumo) return setError('Escribe cuánto es el 100 % (por ejemplo, lo que trae un costal).')
      ref = inicial
    }
    if (tipo === 'pesado' && !insumo && !(inicial > 0)) return setError('Escribe cuánto hay ahora: será el 100 %.')
    const ok = await accion(() => store.guardarInsumo({
      id: insumo?.id, nombre: nombre.trim(), tipo, unidad: unidad.trim(), cantidad: inicial, referencia: tipo === 'pesado' ? ref : 0, alerta: a,
    }))
    if (ok) onCerrar()
  }
  const eliminar = async () => {
    if (!insumo) return
    const aviso = usos.length ? `\n\nSe usa en: ${usos.join(', ')}. Esas recetas dejarán de descontarlo.` : ''
    if (!confirm(`¿Eliminar "${insumo.nombre}" del inventario?${aviso}`)) return
    if (await accion(() => store.eliminarInsumo(insumo.id))) onCerrar()
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal modal-chico" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="titulo-insumo">
        <header className="modal-cabeza">
          <h2 id="titulo-insumo">{insumo ? 'Editar insumo' : 'Nuevo insumo'}</h2>
          <button className="btn btn-icono" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>
        <div className="modal-cuerpo" onKeyDown={avanzarConEnter(guardar)}>
          <label className="campo"><span>Nombre</span><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Queso crema" autoFocus {...SIGUIENTE} /></label>
          <div className="segmentado">
            <button className={tipo === 'contable' ? 'activo' : ''} onClick={() => cambiarTipo('contable')}>Se cuenta</button>
            <button className={tipo === 'pesado' ? 'activo' : ''} onClick={() => cambiarTipo('pesado')}>Se pesa o mide</button>
          </div>
          <p className="ayuda">{tipo === 'contable'
            ? 'Cajas, latas, barras, bolsas de leche, fruta por unidad… Avisa cuando queden pocas.'
            : 'Libras de harina, azúcar, polvo de hornear, litros de aceite… Avisa cuando baja de un porcentaje.'}</p>
          <div className="fila">
            <label className="campo"><span>{tipo === 'contable' ? 'Se cuenta en' : 'Unidad'}</span>
              <input value={unidad} onChange={(e) => setUnidad(e.target.value)} list="unidades" placeholder={tipo === 'contable' ? 'caja, lata, barra…' : 'lb, kg, litro…'} {...SIGUIENTE} /></label>
            {!insumo && (
              <label className="campo"><span>Cantidad que hay ahora</span>
                <input value={cantidad} onChange={(e) => setCantidad(e.target.value)} inputMode="decimal" placeholder="0" {...SIGUIENTE} /></label>
            )}
          </div>
          <datalist id="unidades">{UNIDADES.map((u) => <option key={u} value={u} />)}</datalist>
          {tipo === 'pesado' && insumo && (
            <label className="campo"><span>Cantidad completa, el 100 % ({unidad || 'unidad'})</span>
              <input value={referencia} onChange={(e) => setReferencia(e.target.value)} inputMode="decimal" {...SIGUIENTE} /></label>
          )}
          {tipo === 'pesado' && !insumo && <p className="ayuda">Lo que hay ahora cuenta como 100 %. Cada compra vuelve a fijar el 100 %.</p>}
          <label className="campo campo-alerta"><span>{tipo === 'contable' ? 'Avisar cuando queden' : 'Avisar al bajar de'}</span>
            <span className="cantidad">
              <input value={alerta} onChange={(e) => setAlerta(e.target.value)} inputMode="decimal" enterKeyHint="go" />
              <span>{tipo === 'contable' ? (unidad || 'unidades') + ' o menos' : '%'}</span>
            </span>
          </label>
          {insumo && <p className="ayuda">Para cambiar cuánto hay, usa Compra o Contar en la lista. Así queda en el historial.</p>}
        </div>
        <footer className="modal-pie">
          {error && <div className="error">{error}</div>}
          {insumo && <button className="btn btn-peligro" onClick={eliminar}>Eliminar</button>}
          <span className="espacio" />
          <button className="btn" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-primario" onClick={guardar}>Guardar</button>
        </footer>
      </div>
    </div>
  )
}

function FormMovimiento({ modo, insumo: i, onCerrar }: { modo: 'compra' | 'conteo'; insumo: Insumo; onCerrar: () => void }) {
  const [valor, setValor] = useState('')
  const [error, setError] = useState('')
  const n = Number(valor.replace(',', '.'))

  const guardar = async () => {
    if (!valor.trim() || !(n >= 0) || (modo === 'compra' && n === 0)) return setError('Escribe una cantidad válida.')
    const cambio = modo === 'compra' ? n : n - i.cantidad
    if (modo === 'conteo' && cambio === 0) return onCerrar()
    const ok = await accion(() => store.registrarMovimientos([{
      insumoId: i.id, cambio, motivo: modo === 'compra' ? 'compra' : 'ajuste',
      detalle: modo === 'compra' ? 'Compra' : `Conteo: había ${conUnidad(i.cantidad, i.unidad)}, hay ${conUnidad(n, i.unidad)}`, ref: null,
    }]))
    if (ok) onCerrar()
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal modal-chico" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); guardar() }} role="dialog" aria-labelledby="titulo-mov">
        <header className="modal-cabeza">
          <h2 id="titulo-mov">{modo === 'compra' ? `Compra de ${i.nombre.toLowerCase()}` : `Contar ${i.nombre.toLowerCase()}`}</h2>
          <button type="button" className="btn btn-icono" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>
        <div className="modal-cuerpo">
          <p className="ayuda">Ahora hay {conUnidad(i.cantidad, i.unidad)}.</p>
          <label className="campo"><span>{modo === 'compra' ? `¿Cuánto compraste? (${i.unidad})` : `¿Cuánto hay en realidad? (${i.unidad})`}</span>
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" enterKeyHint="go" autoFocus /></label>
          {modo === 'compra' && n > 0 && (
            <p className="ayuda">Quedarán {conUnidad(Math.round((i.cantidad + n) * 1000) / 1000, i.unidad)}.{i.tipo === 'pesado' ? ' Esa cantidad pasa a ser el 100 %.' : ''}</p>
          )}
        </div>
        <footer className="modal-pie">
          {error && <div className="error">{error}</div>}
          <span className="espacio" />
          <button type="button" className="btn" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-primario">{modo === 'compra' ? 'Registrar compra' : 'Guardar conteo'}</button>
        </footer>
      </form>
    </div>
  )
}
