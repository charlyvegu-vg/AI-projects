import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import Icono, { type NombreIcono } from './Icono'

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')

type Variante = 'primario' | 'secundario' | 'peligro' | 'whatsapp' | 'texto'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primario text-white active:bg-primario-oscuro',
  secundario: 'bg-hoja text-tinta border-2 border-linea active:bg-papel',
  peligro: 'bg-transparent text-rojo active:bg-rojo-suave',
  whatsapp: 'bg-[#1f9d55] text-white active:bg-[#18804a]',
  texto: 'bg-transparent text-primario active:bg-primario-suave',
}

const BASE_BOTON = 'inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-[1.05rem] font-bold transition-colors disabled:opacity-50'

export function Boton({
  variante = 'primario',
  icono,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; icono?: NombreIcono }) {
  return (
    <button {...props} className={cx(BASE_BOTON, VARIANTES[variante], className)}>
      {icono && <Icono nombre={icono} />}
      {children}
    </button>
  )
}

export function BotonLink({
  href,
  variante = 'secundario',
  icono,
  className,
  children,
}: {
  href: string
  variante?: Variante
  icono?: NombreIcono
  className?: string
  children: ReactNode
}) {
  const externo = href.startsWith('http')
  return (
    <a href={href} target={externo ? '_blank' : undefined} rel="noreferrer" className={cx(BASE_BOTON, VARIANTES[variante], className)}>
      {icono && <Icono nombre={icono} />}
      {children}
    </a>
  )
}

export function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-bold text-tinta">{etiqueta}</span>
      {children}
      {ayuda && <span className="mt-1.5 block text-sm text-gris">{ayuda}</span>}
    </label>
  )
}

const entrada =
  'block w-full min-w-0 min-h-14 rounded-2xl border-2 border-linea bg-hoja px-4 text-[1.05rem] text-tinta placeholder:text-gris/70 focus:border-primario focus:outline-none'

export function Entrada(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(entrada, props.className)} />
}

export function Selector(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(entrada, 'appearance-auto', props.className)} />
}

export function Texto(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cx(entrada, 'py-3', props.className)} />
}

/** Opciones grandes para tocar (más fácil que una lista desplegable). */
export function Opciones<T extends string>({
  valor,
  opciones,
  onChange,
  columnas,
}: {
  valor: T
  opciones: { valor: T; texto: string; activo?: string }[]
  onChange: (v: T) => void
  columnas?: number
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columnas ?? opciones.length}, minmax(0, 1fr))` }}>
      {opciones.map((o) => {
        const sel = valor === o.valor
        return (
          <button
            type="button"
            key={o.valor}
            onClick={() => onChange(o.valor)}
            aria-pressed={sel}
            className={cx(
              'flex min-h-14 items-center justify-center gap-1.5 rounded-2xl border-2 px-2 font-bold',
              sel ? (o.activo ?? 'border-primario bg-primario text-white') : 'border-linea bg-hoja text-tinta',
            )}
          >
            {sel && <Icono nombre="check" className="h-5 w-5 shrink-0" />}
            <span className="truncate">{o.texto}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Grupo de filas, como una lista de ajustes del teléfono. */
export function Grupo({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('divide-y divide-linea overflow-hidden rounded-3xl bg-hoja', className)}>{children}</div>
}

/** Fila tocable con título, detalle y flecha. */
export function FilaLink({
  onClick,
  titulo,
  detalle,
  izquierda,
  derecha,
}: {
  onClick: () => void
  titulo: ReactNode
  detalle?: ReactNode
  izquierda?: ReactNode
  derecha?: ReactNode
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-papel">
      {izquierda}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[1.05rem] font-bold">{titulo}</span>
        {detalle && <span className="block truncate text-gris">{detalle}</span>}
      </span>
      {derecha}
      <Icono nombre="derecha" className="h-5 w-5 shrink-0 text-gris" />
    </button>
  )
}

export function Encabezado({ titulo, atras, accion }: { titulo: string; atras?: boolean; accion?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="sticky top-0 z-20 -mx-5 mb-5 flex min-h-16 items-center gap-1 bg-papel/95 px-5 pt-[env(safe-area-inset-top)] backdrop-blur">
      {atras && (
        <button
          onClick={() => nav(-1)}
          className="-ml-3 flex h-12 items-center gap-0.5 rounded-full pr-3 pl-1 font-bold text-primario active:bg-primario-suave"
        >
          <Icono nombre="atras" />
          Volver
        </button>
      )}
      <h1 className={cx('min-w-0 flex-1 truncate font-bold', atras ? 'text-center text-lg' : 'text-[1.75rem] leading-tight')}>{titulo}</h1>
      {accion ?? (atras && <span className="w-20" />)}
    </header>
  )
}

export function Titulo({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-2 flex min-h-11 items-center justify-between px-1">
      <h2 className="text-lg font-bold">{children}</h2>
      {accion}
    </div>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="rounded-3xl bg-hoja px-5 py-6 text-center text-gris">{children}</p>
}

/** Sección que se abre al tocarla, para no mostrar todo a la vez. */
export function Desplegable({ titulo, resumen, children, abierto: inicial = false }: { titulo: string; resumen?: ReactNode; children: ReactNode; abierto?: boolean }) {
  const [abierto, setAbierto] = useState(inicial)
  return (
    <div className="rounded-3xl bg-hoja">
      <button onClick={() => setAbierto(!abierto)} aria-expanded={abierto} className="flex w-full items-center gap-3 px-4 py-4 text-left">
        <span className="flex-1 text-[1.05rem] font-bold">{titulo}</span>
        {resumen && <span className="text-gris">{resumen}</span>}
        <Icono nombre="abajo" className={cx('h-5 w-5 text-gris transition-transform', abierto && 'rotate-180')} />
      </button>
      {abierto && <div className="border-t border-linea px-4 py-3">{children}</div>}
    </div>
  )
}

/** Panel que sube desde abajo (para pagos y gastos sin cambiar de pantalla). */
export function Hoja({ abierta, titulo, onCerrar, children }: { abierta: boolean; titulo: string; onCerrar: () => void; children: ReactNode }) {
  if (!abierta) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/50" onClick={onCerrar}>
      <div
        role="dialog"
        aria-label={titulo}
        className="animar-subir max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-papel px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-linea" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{titulo}</h2>
          <button onClick={onCerrar} className="flex h-12 w-12 items-center justify-center rounded-full bg-hoja text-gris" aria-label="Cerrar">
            <Icono nombre="cerrar" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Fila({ etiqueta, valor, fuerte }: { etiqueta: string; valor: ReactNode; fuerte?: boolean }) {
  return (
    <div className={cx('flex justify-between gap-4 py-1.5', fuerte && 'mt-1 border-t-2 border-linea pt-2.5 text-lg font-bold')}>
      <span className={fuerte ? '' : 'text-gris'}>{etiqueta}</span>
      <span className="tabular text-right">{valor}</span>
    </div>
  )
}

/** Punto de color + texto para estados (nunca solo color). */
export function Estado({ color, children }: { color: 'rojo' | 'amarillo' | 'verde' | 'primario' | 'gris'; children: ReactNode }) {
  const c = {
    rojo: 'bg-rojo-suave text-rojo',
    amarillo: 'bg-etiqueta-suave text-[#7a5a00]',
    verde: 'bg-verde-suave text-verde',
    primario: 'bg-primario-suave text-primario',
    gris: 'bg-papel text-gris',
  }[color]
  const p = { rojo: 'bg-rojo', amarillo: 'bg-etiqueta', verde: 'bg-verde', primario: 'bg-primario', gris: 'bg-gris' }[color]
  return (
    <span className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold', c)}>
      <span className={cx('h-2 w-2 rounded-full', p)} />
      {children}
    </span>
  )
}

export function Tarjeta({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-3xl bg-hoja p-4', className)}>{children}</div>
}

export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <Titulo>{titulo}</Titulo>
      {children}
    </section>
  )
}
