import { useEffect, useState } from 'react'

export type Proteccion = 'activa' | 'pendiente' | 'no-disponible'

/**
 * Pide a Chrome que no borre los datos de la app cuando falte espacio.
 * Solo existe en direcciones seguras (https o localhost); en la red local por http no está disponible.
 */
export async function protegerDatos(): Promise<Proteccion> {
  const s = typeof navigator !== 'undefined' ? navigator.storage : undefined
  if (!s?.persist || !s.persisted) return 'no-disponible'
  try {
    if (await s.persisted()) return 'activa'
    return (await s.persist()) ? 'activa' : 'pendiente'
  } catch {
    return 'no-disponible'
  }
}

export function useProteccion(): Proteccion | null {
  const [p, setP] = useState<Proteccion | null>(null)
  useEffect(() => { protegerDatos().then(setP) }, [])
  return p
}

const CLAVE_ULTIMO = 'zurea-ultimo-respaldo'
export const ultimoRespaldo = (): string | null => localStorage.getItem(CLAVE_ULTIMO)
export const marcarRespaldo = (fecha: string) => localStorage.setItem(CLAVE_ULTIMO, fecha)
