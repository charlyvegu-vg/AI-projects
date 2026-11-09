import { useRef, useState } from 'react'
import { useRecordado } from '../lib/navegacion'
import { store, useEstado } from '../data'
import { accion } from '../lib/accion'
import { consumoPara, conUnidad, estadoTexto, nivel, tandasSugeridas, yaDescontado } from '../lib/inventario'
import { ingredientesPara, renglones, useChecklist } from '../lib/preparacion'
import { avanzarConEnter } from '../lib/teclado'
import type { Consumo, Producto, Receta } from '../types'

/** A dónde llevar al recetario, por ejemplo desde un pedido. */
export interface DestinoReceta {
  productoId: string
  /** Para encontrarlo si el producto se volvió a crear con otro id. */
  nombre: string
  variedad: string | null
  pedido?: { id: string; numero: number; titulo: string; cantidad: number }
}

interface Props {
  destino: DestinoReceta | null
  onVolverPedidos: () => void
  onVerInventario: () => void
}

export function Recetario({ destino, onVolverPedidos, onVerInventario }: Props) {
  const { productos } = useEstado()
  const lista = [...productos].sort((a, b) => a.orden - b.orden)
  const delDestino = destino && (lista.find((p) => p.id === destino.productoId) ?? lista.find((p) => p.nombre === destino.nombre))
  // La receta abierta se recuerda al recargar; si se llega desde un pedido, manda el pedido.
  const [elegido, setElegido] = useRecordado<string | null>('receta', null, (id) => id === null || lista.some((p) => p.id === id))
  // Al llegar desde un pedido se abre su receta (una sola vez por destino; luego se puede cambiar de receta).
  const destinoVisto = useRef<DestinoReceta | null>(null)
  if (destino !== destinoVisto.current) {
    destinoVisto.current = destino
    if (delDestino && elegido !== delDestino.id) setElegido(delDestino.id)
  }
  const producto = lista.find((p) => p.id === elegido) ?? lista[0]
  const destinoActivo = destino && delDestino && delDestino.id === producto?.id ? destino : null

  return (
    <div className="pagina pagina-recetario">
      <div className="pagina-cabeza">
        <div><h1>Recetario</h1><div className="subtitulo">hecho en casa</div></div>
      </div>
      {destino && !delDestino && (
        <p className="reporte-aviso">"{destino.nombre}" ya no está en el catálogo, así que no tiene receta aquí.</p>
      )}
      {!lista.length ? (
        <p className="ayuda ayuda-oscura">Agrega productos en Catálogo para escribir sus recetas.</p>
      ) : (
        <div className="recetario">
          <nav className="recetario-indice" aria-label="Productos">
            {lista.map((p) => (
              <button key={p.id} className={p.id === producto.id ? 'activo' : ''} onClick={() => setElegido(p.id)}>
                <span>{p.nombre}</span>
                {!p.receta && <small>Sin receta</small>}
              </button>
            ))}
          </nav>
          <HojaReceta
            key={producto.id + (destinoActivo ? `#${destinoActivo.pedido?.numero}:${destinoActivo.variedad}` : '')}
            producto={producto}
            destino={destinoActivo}
            onVolverPedidos={onVolverPedidos}
            onVerInventario={onVerInventario}
          />
        </div>
      )}
    </div>
  )
}

function HojaReceta({ producto: p, destino, onVolverPedidos, onVerInventario }: { producto: Producto; destino: DestinoReceta | null; onVolverPedidos: () => void; onVerInventario: () => void }) {
  const receta = p.receta ?? null
  const [variedad, setVariedad] = useState<string | null>(destino?.variedad ?? p.variedades[0] ?? null)
  const [editando, setEditando] = useState(false)
  // Desde un pedido se abre directamente en modo preparar.
  const [preparando, setPreparando] = useState(!!destino && !!receta)
  const clave = `${destino?.pedido?.numero ?? 'libre'}:${p.id}:${variedad ?? ''}`
  const { marcados, alternar, reiniciar } = useChecklist(clave)

  if (editando) return <EditorReceta producto={p} onCerrar={() => setEditando(false)} />

  const ingredientes = receta ? ingredientesPara(receta, variedad) : []
  const listos = ingredientes.filter((i) => marcados.has(i.texto)).length
  const completo = ingredientes.length > 0 && listos === ingredientes.length

  return (
    <article className="hoja recorte">
      {destino?.pedido && (
        <div className="hoja-pedido">
          <span>
            Pedido #{destino.pedido.numero}, {destino.pedido.titulo}: preparar <b>{destino.pedido.cantidad}</b>
            {destino.variedad ? ` (${destino.variedad.toLowerCase()})` : ''}
          </span>
          <button className="btn btn-mini" onClick={onVolverPedidos}>Volver a pedidos</button>
        </div>
      )}

      <header className="hoja-cabeza">
        <h2>{p.nombre}</h2>
        {receta?.rinde && <div className="hoja-rinde">Rinde {receta.rinde}</div>}
      </header>

      {p.variedades.length > 0 && (
        <div className="hoja-variedades" role="group" aria-label="Variedad">
          {p.variedades.map((v) => (
            <button key={v} className={`btn chip ${v === variedad ? 'activo' : ''}`} onClick={() => setVariedad(v)}>{v}</button>
          ))}
        </div>
      )}

      {!receta ? (
        <div className="hoja-vacia">
          <p>Este producto aún no tiene receta.</p>
          <button className="btn btn-primario" onClick={() => setEditando(true)}>Escribir receta</button>
        </div>
      ) : (
        <>
          <section className="hoja-seccion">
            <div className="hoja-seccion-cabeza">
              <h3>Ingredientes</h3>
              {preparando
                ? <span className={`progreso ${completo ? 'progreso-listo' : ''}`}>{completo ? 'Todo listo' : `${listos} de ${ingredientes.length}`}</span>
                : null}
            </div>
            {!ingredientes.length && <p className="ayuda">No hay ingredientes para esta variedad.</p>}
            {preparando ? (
              <ul className="checklist">
                {ingredientes.map((i) => {
                  const hecho = marcados.has(i.texto)
                  return (
                    <li key={i.texto}>
                      <label className={hecho ? 'hecho' : ''}>
                        <input type="checkbox" checked={hecho} onChange={() => alternar(i.texto)} />
                        <span className="check-caja" aria-hidden />
                        <span className="check-texto">{i.texto}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <ul className="ingredientes">
                {ingredientes.map((i) => <li key={i.texto}>{i.texto}</li>)}
              </ul>
            )}
          </section>

          {receta.pasos.length > 0 && (
            <section className="hoja-seccion">
              <h3>Preparación</h3>
              <ol className="pasos">{receta.pasos.map((s, k) => <li key={k}>{s}</li>)}</ol>
            </section>
          )}
          {receta.notas && (
            <section className="hoja-seccion">
              <h3>Notas</h3>
              <p className="hoja-notas">{receta.notas}</p>
            </section>
          )}

          {preparando && <DescontarInventario key={variedad ?? ''} producto={p} receta={receta} variedad={variedad} destino={destino} onVerInventario={onVerInventario} />}

          <footer className="hoja-pie">
            {preparando ? (
              <>
                <button className="btn" onClick={reiniciar} disabled={!listos}>Desmarcar todo</button>
                <button className="btn" onClick={() => setPreparando(false)}>Terminar</button>
              </>
            ) : (
              <>
                <button className="btn" onClick={() => setEditando(true)}>Editar receta</button>
                <button className="btn btn-primario btn-preparar" onClick={() => setPreparando(true)} disabled={!ingredientes.length}>Preparar</button>
              </>
            )}
          </footer>
        </>
      )}
    </article>
  )
}

function EditorReceta({ producto: p, onCerrar }: { producto: Producto; onCerrar: () => void }) {
  const r = p.receta
  const texto = (variedad: string | null) => (r?.ingredientes ?? []).filter((i) => i.variedad === variedad).map((i) => i.texto).join('\n')
  const [rinde, setRinde] = useState(r?.rinde ?? '')
  const [generales, setGenerales] = useState(texto(null))
  const [porVariedad, setPorVariedad] = useState<Record<string, string>>(
    Object.fromEntries(p.variedades.map((v) => [v, texto(v)])))
  const [pasos, setPasos] = useState((r?.pasos ?? []).join('\n'))
  const [notas, setNotas] = useState(r?.notas ?? '')
  const [porTanda, setPorTanda] = useState(r?.unidadesPorTanda ? String(r.unidadesPorTanda) : '')
  const [consumo, setConsumo] = useState<{ insumoId: string; cantidad: string; variedad: string | null }[]>(
    (r?.consumo ?? []).map((c) => ({ ...c, cantidad: String(c.cantidad) })))
  const { insumos } = useEstado()
  const [error, setError] = useState('')

  const guardar = async () => {
    const ingredientes = [
      ...renglones(generales).map((t) => ({ texto: t, variedad: null })),
      ...p.variedades.flatMap((v) => renglones(porVariedad[v] ?? '').map((t) => ({ texto: t, variedad: v }))),
    ]
    // Dos ingredientes iguales se marcarían juntos en la lista: se avisa.
    const repetido = ingredientes.find((i, k) => ingredientes.some((j, m) => m < k && j.texto === i.texto && (!j.variedad || !i.variedad || j.variedad === i.variedad)))
    if (repetido) return setError(`"${repetido.texto}" está repetido. Escríbelo una sola vez o hazlo distinto (por ejemplo, "1 taza de azúcar para el relleno").`)
    if (!ingredientes.length) return setError('Escribe al menos un ingrediente.')
    const filas = consumo.filter((c) => c.insumoId)
    const malos = filas.filter((c) => !(Number(c.cantidad.replace(',', '.')) > 0))
    if (malos.length) return setError(`Escribe cuánto se usa de ${insumos.find((i) => i.id === malos[0].insumoId)?.nombre ?? 'cada insumo'} por tanda.`)
    const unidades = porTanda.trim() ? Number(porTanda.replace(',', '.')) : null
    if (unidades !== null && !(unidades > 0)) return setError('Las unidades por tanda deben ser un número mayor que cero.')
    const receta: Receta = {
      rinde: rinde.trim(), unidadesPorTanda: unidades, ingredientes, pasos: renglones(pasos), notas: notas.trim(),
      consumo: filas.map((c) => ({ insumoId: c.insumoId, cantidad: Number(c.cantidad.replace(',', '.')), variedad: c.variedad })),
    }
    if (await accion(() => store.guardarReceta(p.id, receta))) onCerrar()
  }
  const eliminar = async () => {
    if (!confirm(`¿Eliminar la receta de "${p.nombre}"?`)) return
    if (await accion(() => store.guardarReceta(p.id, null))) onCerrar()
  }

  return (
    <article className="hoja hoja-editor recorte" onKeyDown={avanzarConEnter()}>
      <header className="hoja-cabeza">
        <h2>{p.nombre}</h2>
        <div className="hoja-rinde">{r ? 'Editar receta' : 'Nueva receta'}</div>
      </header>
      <label className="campo"><span>Rinde (opcional)</span>
        <input value={rinde} onChange={(e) => setRinde(e.target.value)} placeholder="Ej. 12 tartaletas" /></label>
      <label className="campo"><span>{p.variedades.length ? 'Ingredientes para todas las variedades' : 'Ingredientes'}, uno por renglón</span>
        <textarea rows={7} value={generales} onChange={(e) => setGenerales(e.target.value)} placeholder={'2 tazas de harina\n1 taza de azúcar\n3 huevos'} autoFocus /></label>
      {p.variedades.map((v) => (
        <label key={v} className="campo"><span>Solo para {v.toLowerCase()}</span>
          <textarea rows={3} value={porVariedad[v] ?? ''} onChange={(e) => setPorVariedad({ ...porVariedad, [v]: e.target.value })} /></label>
      ))}
      <label className="campo"><span>Preparación, un paso por renglón (opcional)</span>
        <textarea rows={6} value={pasos} onChange={(e) => setPasos(e.target.value)} placeholder={'Precalentar el horno a 180 °C\nMezclar los ingredientes secos'} /></label>
      <label className="campo"><span>Notas (opcional)</span>
        <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Temperatura, tiempos, trucos…" /></label>

      <section className="hoja-seccion editor-consumo">
        <h3>Descuento de inventario</h3>
        <p className="ayuda">Lo que gasta una tanda, en la unidad del inventario. Se descuenta al terminar de preparar.</p>
        <label className="campo campo-tanda"><span>¿Cuántas unidades salen de una tanda? (opcional)</span>
          <span className="cantidad">
            <input value={porTanda} onChange={(e) => setPorTanda(e.target.value)} inputMode="decimal" placeholder="Ej. 12" />
            <span>{p.nombre.toLowerCase()}</span>
          </span>
        </label>
        {!insumos.length ? (
          <p className="ayuda">Primero agrega insumos en Inventario.</p>
        ) : (
          <>
            <ul className="consumo-filas">
              {consumo.map((c, k) => {
                const ins = insumos.find((i) => i.id === c.insumoId)
                const cambiar = (cambio: Partial<typeof c>) => setConsumo(consumo.map((x, j) => (j === k ? { ...x, ...cambio } : x)))
                return (
                  <li key={k}>
                    <select value={c.insumoId} onChange={(e) => cambiar({ insumoId: e.target.value })} aria-label="Insumo">
                      <option value="">Elige un insumo</option>
                      {[...insumos].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                    </select>
                    <span className="cantidad">
                      <input value={c.cantidad} onChange={(e) => cambiar({ cantidad: e.target.value })} inputMode="decimal" aria-label="Cantidad por tanda" />
                      <span className="consumo-unidad">{ins?.unidad ?? ''}</span>
                    </span>
                    {p.variedades.length > 0 && (
                      <select value={c.variedad ?? ''} onChange={(e) => cambiar({ variedad: e.target.value || null })} aria-label="Variedad">
                        <option value="">Todas</option>
                        {p.variedades.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    )}
                    <button className="btn btn-mini" onClick={() => setConsumo(consumo.filter((_, j) => j !== k))} aria-label="Quitar">✕</button>
                  </li>
                )
              })}
            </ul>
            <button className="btn btn-agregar" onClick={() => setConsumo([...consumo, { insumoId: '', cantidad: '', variedad: null }])}>Agregar insumo</button>
          </>
        )}
      </section>

      {error && <div className="error">{error}</div>}
      <footer className="hoja-pie">
        {r && <button className="btn btn-peligro" onClick={eliminar}>Eliminar receta</button>}
        <span className="espacio" />
        <button className="btn" onClick={onCerrar}>Cancelar</button>
        <button className="btn btn-primario" onClick={guardar}>Guardar receta</button>
      </footer>
    </article>
  )
}

/** Al terminar de preparar: descuenta del inventario lo que gastó la receta. */
function DescontarInventario({ producto: p, receta, variedad, destino, onVerInventario }: { producto: Producto; receta: Receta; variedad: string | null; destino: DestinoReceta | null; onVerInventario: () => void }) {
  const { insumos, movimientos } = useEstado()
  const [tandas, setTandas] = useState(() => tandasSugeridas(receta, destino?.pedido?.cantidad))
  const [listo, setListo] = useState<string[] | null>(null)
  const [ocupado, setOcupado] = useState(false)

  if (!receta.consumo?.length) {
    return <p className="ayuda descontar-nada">Esta receta no descuenta del inventario. Indícalo en Editar receta.</p>
  }
  const ref = destino?.pedido ? `pedido:${destino.pedido.id}:${p.id}:${variedad ?? ''}` : null
  const lineas = consumoPara(receta, variedad, tandas)
    .map((c: Consumo) => ({ c, i: insumos.find((x) => x.id === c.insumoId) }))
    .filter((x): x is { c: Consumo; i: NonNullable<typeof x.i> } => !!x.i)

  if (listo) {
    return (
      <section className="hoja-seccion descontar descontar-hecho" aria-live="polite">
        <h3>Inventario</h3>
        <p>Se descontó del inventario.</p>
        {listo.length > 0 && <p className="descontar-alerta">Quedó por acabarse: {listo.join('; ')}.</p>}
        <div className="descontar-pie"><button className="btn" onClick={onVerInventario}>Ver cómo quedó el inventario</button></div>
      </section>
    )
  }
  if (ref && yaDescontado(movimientos, ref)) {
    return (
      <section className="hoja-seccion descontar descontar-hecho">
        <h3>Inventario</h3>
        <p>Ya se descontó del inventario para este pedido.</p>
        <div className="descontar-pie"><button className="btn" onClick={onVerInventario}>Ver inventario</button></div>
      </section>
    )
  }

  const descontar = async () => {
    setOcupado(true)
    const antes = new Map(insumos.map((i) => [i.id, nivel(i)]))
    const nombre = `${p.nombre}${variedad ? ` (${variedad.toLowerCase()})` : ''}, ${tandas} ${tandas === 1 ? 'tanda' : 'tandas'}`
    const ok = await accion(() => store.registrarMovimientos(lineas.map(({ c }) => ({
      insumoId: c.insumoId, cambio: -c.cantidad, motivo: 'receta' as const,
      detalle: destino?.pedido ? `Pedido #${destino.pedido.numero}: ${nombre}` : nombre, ref,
    }))))
    setOcupado(false)
    if (!ok) return
    // Avisa los que cruzaron la alerta con esta preparación.
    const ahora = store.getState().insumos
    setListo(ahora.filter((i) => nivel(i) !== 'ok' && antes.get(i.id) === 'ok' && lineas.some((l) => l.i.id === i.id)).map((i) => `${i.nombre}: ${estadoTexto(i).toLowerCase()}`))
  }

  return (
    <section className="hoja-seccion descontar">
      <div className="hoja-seccion-cabeza">
        <h3>Inventario</h3>
        <span className="cantidad">
          <button className="btn btn-mini" onClick={() => setTandas((t) => Math.max(1, t - 1))} aria-label="Una tanda menos">−</button>
          <b>{tandas}</b>
          <button className="btn btn-mini" onClick={() => setTandas((t) => t + 1)} aria-label="Una tanda más">+</button>
          <span>{tandas === 1 ? 'tanda' : 'tandas'}</span>
        </span>
      </div>
      {destino?.pedido && receta.unidadesPorTanda ? (
        <p className="ayuda">El pedido es de {destino.pedido.cantidad} y cada tanda rinde {receta.unidadesPorTanda}.</p>
      ) : null}
      <table className="tabla-reporte tabla-descuento">
        <thead><tr><th>Insumo</th><th className="num">Se usa</th><th className="num">Quedará</th></tr></thead>
        <tbody>
          {lineas.map(({ c, i }) => {
            const queda = Math.max(0, Math.round((i.cantidad - c.cantidad) * 1000) / 1000)
            const despues = { ...i, cantidad: queda }
            const falta = c.cantidad > i.cantidad
            return (
              <tr key={i.id} className={falta ? 'no-alcanza' : nivel(despues) !== 'ok' ? 'quedara-bajo' : ''}>
                <td>{i.nombre}{falta && <small> No alcanza: hay {conUnidad(i.cantidad, i.unidad)}</small>}</td>
                <td className="num">{conUnidad(c.cantidad, i.unidad)}</td>
                <td className="num">{conUnidad(queda, i.unidad)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="descontar-pie">
        <button className="btn btn-primario" onClick={descontar} disabled={ocupado}>{ocupado ? 'Descontando…' : 'Descontar del inventario'}</button>
      </div>
    </section>
  )
}
