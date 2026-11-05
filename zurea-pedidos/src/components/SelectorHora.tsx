import { useState } from 'react'

/**
 * Reloj táctil: mañana/tarde, hora (12, 1 … 11) y minutos en botones grandes.
 * Reemplaza al selector nativo, que en algunas tablets no deja elegir la tarde.
 * El valor es "HH:MM" en 24 h, o '' si aún no se elige.
 */
interface Props {
  valor: string
  onCambiar: (hhmm: string) => void
  /** Hora mínima permitida "HH:MM" (para hoy, la hora actual). */
  minimo?: string
}

const HORAS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const MINUTOS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

const dos = (n: number) => String(n).padStart(2, '0')
export const a24 = (h12: number, pm: boolean) => (h12 % 12) + (pm ? 12 : 0)

export function partesHora(hhmm: string): { h12: number; m: number; pm: boolean } | null {
  const r = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!r) return null
  const h = Number(r[1])
  return { h12: h % 12 === 0 ? 12 : h % 12, m: Number(r[2]), pm: h >= 12 }
}

/** "16:30" → "4:30 pm". */
export function horaTexto(hhmm: string): string {
  const p = partesHora(hhmm)
  return p ? `${p.h12}:${dos(p.m)} ${p.pm ? 'pm' : 'am'}` : ''
}

export function SelectorHora({ valor, onCambiar, minimo }: Props) {
  const actual = partesHora(valor)
  // Sin hora elegida se muestra la tarde: las entregas suelen ser por la tarde.
  const [turnoLibre, setTurnoLibre] = useState(true)
  const pm = actual ? actual.pm : turnoLibre

  const min = minimo ? partesHora(minimo) : null
  const minMinutos = min ? a24(min.h12, min.pm) * 60 + min.m : -1
  const pasado = (h24: number, m: number) => h24 * 60 + m < minMinutos
  const elegir = (h12: number, m: number, esPm: boolean) => onCambiar(`${dos(a24(h12, esPm))}:${dos(m)}`)
  const primerLibre = (h12: number, esPm: boolean, desde = 0) =>
    MINUTOS.find((x) => x >= desde && !pasado(a24(h12, esPm), x)) ?? MINUTOS.find((x) => !pasado(a24(h12, esPm), x))

  const cambiarTurno = (esPm: boolean) => {
    setTurnoLibre(esPm)
    if (!actual) return
    const m = primerLibre(actual.h12, esPm, actual.m)
    if (m === undefined) onCambiar('')
    else elegir(actual.h12, m, esPm)
  }
  const elegirHora = (h12: number) => {
    const m = primerLibre(h12, pm, actual?.m ?? 0)
    if (m !== undefined) elegir(h12, m, pm)
  }
  const mananaPasada = MINUTOS.every((m) => pasado(11, m))

  return (
    <div className="reloj">
      <div className="reloj-turno" role="group" aria-label="AM o PM">
        <button type="button" className={!pm ? 'activo' : ''} aria-pressed={!pm} onClick={() => cambiarTurno(false)} disabled={mananaPasada}>
          <b>AM</b><small>de la mañana</small>
        </button>
        <button type="button" className={pm ? 'activo' : ''} aria-pressed={pm} onClick={() => cambiarTurno(true)}>
          <b>PM</b><small>tarde y noche</small>
        </button>
      </div>

      <div className="reloj-grupo">
        <span className="reloj-etiqueta" id="etq-hora">Hora</span>
        <div className="reloj-horas" role="group" aria-labelledby="etq-hora">
          {HORAS.map((h) => (
            <button
              type="button" key={h}
              className={actual && actual.h12 === h ? 'activo' : ''} aria-pressed={!!actual && actual.h12 === h}
              disabled={primerLibre(h, pm) === undefined}
              onClick={() => elegirHora(h)}
            >{h}</button>
          ))}
        </div>
      </div>

      <div className="reloj-grupo">
        <span className="reloj-etiqueta" id="etq-min">Minutos</span>
        <div className="reloj-minutos" role="group" aria-labelledby="etq-min">
          {MINUTOS.map((m) => (
            <button
              type="button" key={m}
              className={actual && actual.m === m ? 'activo' : ''} aria-pressed={!!actual && actual.m === m}
              disabled={!actual || pasado(a24(actual.h12, actual.pm), m)}
              onClick={() => actual && elegir(actual.h12, m, actual.pm)}
            >:{dos(m)}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
