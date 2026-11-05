/** Todo se maneja en hora de Guatemala (UTC-6, sin horario de verano). */
export const ZONA = 'America/Guatemala'
const OFFSET = '-06:00'

const fmtClave = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
})
const fmtHora24 = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false,
})
const fmtHora = new Intl.DateTimeFormat('es-GT', {
  timeZone: ZONA, hour: 'numeric', minute: '2-digit', hour12: true,
})
const fmtDiaCorto = new Intl.DateTimeFormat('es-GT', {
  timeZone: ZONA, weekday: 'short', day: 'numeric', month: 'short',
})
const fmtDiaLargo = new Intl.DateTimeFormat('es-GT', {
  timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long',
})

/** "2026-11-04" en hora de Guatemala. */
export function claveDia(fecha: Date | string): string {
  return fmtClave.format(new Date(fecha))
}

/** "14:30" en hora de Guatemala. */
export function hora24(fecha: Date | string): string {
  return fmtHora24.format(new Date(fecha)).replace(/^24/, '00')
}

/** Convierte un día y hora de Guatemala a Date. */
export function fechaLocal(clave: string, hhmm: string): Date {
  return new Date(`${clave}T${hhmm}:00${OFFSET}`)
}

export function sumarDias(clave: string, dias: number): string {
  const d = new Date(`${clave}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export function formatoHora(fecha: Date | string): string {
  return fmtHora.format(new Date(fecha)).replace(/\s?a\.\s?m\./i, ' am').replace(/\s?p\.\s?m\./i, ' pm')
}

/** "Hoy", "Mañana", "Ayer" o "mié 5 nov". */
export function nombreDia(clave: string, hoy: string, largo = false): string {
  if (clave === hoy) return 'Hoy'
  if (clave === sumarDias(hoy, 1)) return 'Mañana'
  if (clave === sumarDias(hoy, -1)) return 'Ayer'
  const f = (largo ? fmtDiaLargo : fmtDiaCorto).format(fechaLocal(clave, '12:00'))
  return f.replace(/\./g, '')
}

/** "hoy 9:00 pm", "mañana 3:00 pm", "vie 7 nov 3:00 pm". */
export function formatoFechaHora(fecha: Date | string, ahora: Date): string {
  const nd = nombreDia(claveDia(fecha), claveDia(ahora))
  const dia = nd === 'Hoy' || nd === 'Mañana' || nd === 'Ayer' ? nd.toLowerCase() : nd
  return `${dia} ${formatoHora(fecha)}`
}

export function formatoDuracion(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatoQ(monto: number): string {
  return `Q${monto.toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}
