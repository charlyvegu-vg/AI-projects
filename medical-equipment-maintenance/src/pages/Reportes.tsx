import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icono from '../components/Icono'
import { Boton, Desplegable, Encabezado, Fila, Opciones, cx } from '../components/ui'
import { descargarExcel, descargarPDF } from '../lib/exportar'
import { fechaCorta, hoyISO, q } from '../lib/format'
import { useConfig } from '../lib/hooks'
import { armarReporte, moverPeriodo, periodo, type Periodo, type TipoPeriodo } from '../lib/reporte'

export default function Reportes() {
  const cfg = useConfig()
  const nav = useNavigate()
  const [p, setP] = useState<Periodo>(() => periodo('semana', hoyISO()))
  const [generando, setGenerando] = useState<'' | 'excel' | 'pdf'>('')
  const [error, setError] = useState('')
  const rep = useLiveQuery(() => armarReporte(p, cfg), [p.desde, p.hasta, cfg])

  const esActual = p.desde <= hoyISO() && hoyISO() <= p.hasta

  async function descargar(tipo: 'excel' | 'pdf') {
    if (!rep) return
    setGenerando(tipo)
    setError('')
    try {
      await (tipo === 'excel' ? descargarExcel(rep) : descargarPDF(rep))
    } catch (e) {
      console.error(e)
      setError('No se pudo crear el archivo. Intente de nuevo.')
    } finally {
      setGenerando('')
    }
  }

  const t = rep?.totales
  const color = !t || t.trabajos === 0 ? 'bg-hoja text-tinta' : t.utilidad < 0 ? 'bg-rojo text-white' : t.margen < cfg.margenMinimo ? 'bg-etiqueta text-tinta' : 'bg-verde text-white'

  return (
    <>
      <Encabezado titulo="Reportes" />

      <div className="mb-4">
        <Opciones<TipoPeriodo>
          valor={p.tipo}
          onChange={(tipo) => setP(periodo(tipo, hoyISO()))}
          opciones={[
            { valor: 'semana', texto: 'Semana' },
            { valor: 'mes', texto: 'Mes' },
          ]}
        />
      </div>

      <div className="mb-5 flex items-center gap-2 rounded-3xl bg-hoja p-2">
        <button onClick={() => setP(moverPeriodo(p, -1))} className="flex h-12 w-12 items-center justify-center rounded-2xl text-primario active:bg-primario-suave" aria-label="Período anterior">
          <Icono nombre="atras" />
        </button>
        <div className="flex-1 text-center">
          <p className="font-bold">{p.tipo === 'mes' ? p.titulo : `${fechaCorta(p.desde).dia} ${fechaCorta(p.desde).mes} al ${fechaCorta(p.hasta).dia} ${fechaCorta(p.hasta).mes}`}</p>
          <p className="text-sm text-gris">{esActual ? (p.tipo === 'semana' ? 'Esta semana' : 'Este mes') : p.tipo === 'semana' ? 'Otra semana' : 'Otro mes'}</p>
        </div>
        <button onClick={() => setP(moverPeriodo(p, 1))} className="flex h-12 w-12 items-center justify-center rounded-2xl text-primario active:bg-primario-suave" aria-label="Período siguiente">
          <Icono nombre="derecha" />
        </button>
      </div>

      {rep && t && (
        <>
          <section className={cx('mb-3 rounded-3xl p-5', color)}>
            <p className="font-bold">{t.trabajos === 0 ? 'Sin trabajos realizados' : t.utilidad < 0 ? 'Perdió dinero' : 'Ganancia'}</p>
            <p className="tabular text-[2.4rem] leading-tight font-bold">{q(t.utilidad)}</p>
            <p className="opacity-90">
              {t.trabajos === 0
                ? 'No hay trabajos marcados como realizados en estas fechas.'
                : `${t.trabajos} ${t.trabajos === 1 ? 'trabajo realizado' : 'trabajos realizados'}: ${t.preventivos} de mantenimiento y ${t.correctivos} de reparación`}
            </p>
          </section>

          <div className="mb-6 rounded-3xl bg-hoja px-4 py-3">
            <Fila etiqueta="Cobró" valor={q(t.cobrado)} />
            <Fila etiqueta="Le deben" valor={<span className={t.pendiente > 0 ? 'font-bold text-[#7a5a00]' : ''}>{q(t.pendiente)}</span>} />
            <Fila etiqueta="Gastos (viáticos y materiales)" valor={q(t.gastos)} />
            <Fila etiqueta="Su tiempo" valor={q(t.manoObra)} />
          </div>

          <p className="mb-2 px-1 font-bold">Descargar el reporte</p>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Boton icono="descargar" disabled={!!generando} onClick={() => descargar('excel')}>
              {generando === 'excel' ? 'Creando…' : 'Excel'}
            </Boton>
            <Boton icono="documento" variante="secundario" disabled={!!generando} onClick={() => descargar('pdf')}>
              {generando === 'pdf' ? 'Creando…' : 'PDF'}
            </Boton>
          </div>
          <p className="mb-6 px-1 text-sm text-gris">
            {error || 'El archivo se guarda en la carpeta Descargas del teléfono. Desde ahí lo puede enviar por WhatsApp o correo.'}
          </p>

          {rep.filas.length > 0 && (
            <Desplegable titulo="Ver los trabajos" resumen={String(rep.filas.length)}>
              <div className="-mx-4 -my-3 divide-y divide-linea">
                {rep.filas.map((f) => (
                  <button key={f.id} onClick={() => nav(`/trabajos/${f.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-papel">
                    <span className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-papel py-1">
                      <span className="leading-tight font-bold">{fechaCorta(f.fecha).dia}</span>
                      <span className="text-xs font-bold">{fechaCorta(f.fecha).mes}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{f.cliente}</span>
                      <span className="block truncate text-sm text-gris">{f.tipo}</span>
                    </span>
                    <span className={cx('tabular font-bold', f.utilidad < 0 && 'text-rojo')}>{q(f.utilidad)}</span>
                  </button>
                ))}
              </div>
            </Desplegable>
          )}
        </>
      )}
    </>
  )
}
