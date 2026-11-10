import type { Cliente, Config, Equipo } from '../db'
import { proximoServicio } from './calc'
import { diasEntre, fecha, hoyISO, linkWhatsApp } from './format'

function saludo(c: Cliente, cfg: Config) {
  const quien = c.contacto ? `, ${c.contacto}` : ''
  const yo = cfg.nombreTecnico ? ` Le saluda ${cfg.nombreTecnico}, técnico de equipo médico.` : ''
  return `Buen día${quien}.${yo}`
}

/** Mensaje para recordar mantenimiento preventivo de uno o varios equipos. */
export function mensajeMantenimiento(c: Cliente, equipos: Equipo[], cfg: Config): string {
  const hoy = hoyISO()
  const linea = (e: Equipo) => {
    const p = proximoServicio(e)
    const cuando = diasEntre(hoy, p) < 0 ? `venció el ${fecha(p)}` : `le corresponde el ${fecha(p)}`
    return `${e.tipo} ${e.marca} ${e.modelo}`.trim() + (e.ubicacion ? ` (${e.ubicacion})` : '') + ` — ${cuando}`
  }
  if (equipos.length === 1) {
    const e = equipos[0]
    const p = proximoServicio(e)
    const nombre = `${e.tipo} ${e.marca} ${e.modelo}`.trim() + (e.ubicacion ? ` (${e.ubicacion})` : '')
    const cuando =
      diasEntre(hoy, p) < 0
        ? `ya se le venció el mantenimiento preventivo (tocaba el ${fecha(p)})`
        : `le corresponde mantenimiento preventivo el ${fecha(p)}`
    return `${saludo(c, cfg)} Le escribo porque al equipo ${nombre} ${cuando}. ¿Qué día le queda bien para programar la visita?`
  }
  return `${saludo(c, cfg)} Le escribo porque a los siguientes equipos les corresponde mantenimiento preventivo:\n${equipos
    .map((e) => `• ${linea(e)}`)
    .join('\n')}\n¿Qué día le queda bien para programar la visita?`
}

export function whatsMantenimiento(c: Cliente, equipos: Equipo[], cfg: Config) {
  return linkWhatsApp(c.telefono, mensajeMantenimiento(c, equipos, cfg))
}

export function whatsLibre(c: Cliente, cfg: Config) {
  return linkWhatsApp(c.telefono, `${saludo(c, cfg)} `)
}
