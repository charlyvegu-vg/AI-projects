import { describe, expect, it } from 'vitest'
import { crearRespaldo, leerRespaldo, nombreArchivo, resumenRespaldo } from './respaldo'

const datos = { pedidos: [], productos: [{ receta: { rinde: '' } }, { receta: null }], ajustes: { timerMin: 15, correos: [] }, insumos: [{}], movimientos: [] } as never

describe('respaldo', () => {
  it('ida y vuelta', () => {
    const r = crearRespaldo(datos, new Date('2026-11-05T20:30:00Z'))
    const leido = leerRespaldo(JSON.stringify(r))
    expect(leido.fecha).toBe('2026-11-05T20:30:00.000Z')
    expect(resumenRespaldo(leido)).toBe('0 pedidos, 2 productos, 1 receta, 1 insumo')
  })
  it('nombre con fecha y hora de Guatemala', () => {
    expect(nombreArchivo(new Date('2026-11-05T20:30:00Z'))).toBe('zurea-respaldo-2026-11-05-1430.json')
  })
  it('rechaza archivos que no son respaldos', () => {
    expect(() => leerRespaldo('hola')).toThrow('no es un respaldo')
    expect(() => leerRespaldo('{"app":"otra"}')).toThrow('no es un respaldo')
    expect(() => leerRespaldo('{"app":"zurea","version":1,"pedidos":[]}')).toThrow('incompleto')
  })
})
