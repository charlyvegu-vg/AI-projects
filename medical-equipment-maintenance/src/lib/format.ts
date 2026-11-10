// Formatos para Guatemala: quetzales, dd/mm/aaaa y zona horaria America/Guatemala.

const fmtQ = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
})

export const q = (n: number) => fmtQ.format(Number.isFinite(n) ? n : 0)

/** Fecha de hoy en Guatemala como 'aaaa-mm-dd'. */
export function hoyISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** 'aaaa-mm-dd' → 'dd/mm/aaaa' */
export function fecha(iso: string): string {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

/** 'aaaa-mm-dd' → 'lun 10/11/2026' */
export function fechaConDia(iso: string): string {
  if (!iso) return '—'
  return `${DIAS[parseISO(iso).getUTCDay()]} ${fecha(iso)}`
}

function parseISO(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function sumarDias(iso: string, dias: number): string {
  const d = parseISO(iso)
  d.setUTCDate(d.getUTCDate() + dias)
  return toISO(d)
}

/** Suma meses respetando fin de mes (31/01 + 1 mes = 28/02). */
export function sumarMeses(iso: string, meses: number): string {
  const d = parseISO(iso)
  const dia = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + meses)
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(dia, ultimo))
  return toISO(d)
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((parseISO(hasta).getTime() - parseISO(desde).getTime()) / 86400000)
}

/** Texto amigable: "hoy", "en 3 días", "hace 5 días". */
export function relativo(iso: string, hoy = hoyISO()): string {
  const n = diasEntre(hoy, iso)
  if (n === 0) return 'hoy'
  if (n === 1) return 'mañana'
  if (n === -1) return 'ayer'
  return n > 0 ? `en ${n} días` : `hace ${-n} días`
}

/** Deja solo dígitos y agrega 502 si es un número local de 8 dígitos. */
export function telefonoWhatsApp(tel: string): string {
  const d = tel.replace(/\D/g, '')
  return d.length === 8 ? `502${d}` : d
}

export function linkWhatsApp(tel: string, mensaje: string): string {
  return `https://wa.me/${telefonoWhatsApp(tel)}?text=${encodeURIComponent(mensaje)}`
}

export function num(v: string): number {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** 'aaaa-mm-dd' → { dia: '15', mes: 'nov' } para mostrar fechas grandes. */
export function fechaCorta(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return { dia: String(d), mes: MESES[m - 1] }
}

/** 'aaaa-mm-dd' → 'lunes 9 de noviembre' */
export function fechaLarga(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${DIAS_LARGO[parseISO(iso).getUTCDay()]} ${d} de ${MESES_LARGO[m - 1]}`
}

export function saludoHora(): string {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Guatemala', hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

/** 'HH:mm' → '2:00 p. m.' */
export function hora12(h: string): string {
  if (!h) return ''
  const [hh, mm] = h.split(':').map(Number)
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'a. m.' : 'p. m.'}`
}

/** Lunes de la semana de una fecha. */
export function inicioSemana(iso: string): string {
  const dia = parseISO(iso).getUTCDay() // 0 = domingo
  return sumarDias(iso, dia === 0 ? -6 : 1 - dia)
}

export function nombreMes(iso: string): string {
  const [a, m] = iso.split('-').map(Number)
  return `${MESES_LARGO[m - 1]} ${a}`
}

export function finDeMes(iso: string): string {
  return sumarDias(sumarMeses(iso.slice(0, 8) + '01', 1), -1)
}
