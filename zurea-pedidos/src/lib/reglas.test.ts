import { describe, expect, it } from 'vitest'
import { calcularAviso, calcularTimerInicio, estadoTimer } from './reglas'
import { claveDia, fechaLocal, formatoHora, hora24, sumarDias } from './tiempo'

const gt = (clave: string, hhmm: string) => fechaLocal(clave, hhmm).toISOString()

describe('tiempo', () => {
  it('usa hora de Guatemala', () => {
    const d = gt('2026-11-04', '23:30')
    expect(claveDia(d)).toBe('2026-11-04')
    expect(hora24(d)).toBe('23:30')
    expect(formatoHora(d)).toBe('11:30 pm')
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('temporizador', () => {
  it('lo antes posible arranca al crear', () => {
    const c = gt('2026-11-04', '10:00')
    expect(calcularTimerInicio('asap', c, c, 15)).toBe(c)
  })
  it('programado arranca 15 min antes de la entrega', () => {
    const inicio = calcularTimerInicio('programado', gt('2026-11-04', '10:00'), gt('2026-11-04', '15:00'), 15)
    expect(inicio).toBe(gt('2026-11-04', '14:45'))
  })
  it('niveles 50% / 70% / 100%', () => {
    const p = { fase: 'pendiente' as const, timerInicio: gt('2026-11-04', '14:45'), timerMin: 15 }
    const en = (hhmm: string) => estadoTimer(p, fechaLocal('2026-11-04', hhmm))?.nivel
    expect(en('14:40')).toBe('espera')
    expect(en('14:52')).toBe('normal')
    expect(estadoTimer(p, new Date(fechaLocal('2026-11-04', '14:52').getTime() + 30_000))?.nivel).toBe('amarillo')
    expect(en('14:55')).toBe('amarillo')
    expect(estadoTimer(p, new Date(fechaLocal('2026-11-04', '14:55').getTime() + 30_000))?.nivel).toBe('rojo')
    expect(en('15:00')).toBe('atrasado')
    expect(estadoTimer({ ...p, fase: 'preparacion' }, new Date())).toBeNull()
  })
})

describe('correo de aviso', () => {
  const creado = gt('2026-11-04', '10:00')
  it('no aplica a pedidos del mismo día ni a "lo antes posible"', () => {
    expect(calcularAviso('programado', creado, gt('2026-11-04', '18:00'))).toBeNull()
    expect(calcularAviso('asap', creado, creado)).toBeNull()
  })
  it('5 horas antes de la entrega', () => {
    expect(calcularAviso('programado', creado, gt('2026-11-05', '15:00'))).toBe(gt('2026-11-05', '10:00'))
    expect(calcularAviso('programado', creado, gt('2026-11-07', '12:00'))).toBe(gt('2026-11-07', '07:00'))
  })
  it('si cae de noche, se envía a las 9 pm del día anterior', () => {
    expect(calcularAviso('programado', creado, gt('2026-11-05', '08:00'))).toBe(gt('2026-11-04', '21:00'))
    expect(calcularAviso('programado', creado, gt('2026-11-05', '11:59'))).toBe(gt('2026-11-04', '21:00'))
    expect(calcularAviso('programado', creado, gt('2026-11-05', '01:30'))).toBe(gt('2026-11-04', '20:30'))
  })
})
