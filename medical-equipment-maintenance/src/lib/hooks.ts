import { useLiveQuery } from 'dexie-react-hooks'
import { CATEGORIAS_INICIALES, CONFIG_INICIAL, db } from '../db'

export function useConfig() {
  return useLiveQuery(() => db.config.get('config'), []) ?? CONFIG_INICIAL
}

export function useCategorias() {
  return useLiveQuery(() => db.categorias.toArray(), []) ?? CATEGORIAS_INICIALES
}

/** Crea configuración y categorías la primera vez que se abre la app. */
export async function inicializar() {
  if (!(await db.config.get('config'))) await db.config.put(CONFIG_INICIAL)
  if ((await db.categorias.count()) === 0) await db.categorias.bulkPut(CATEGORIAS_INICIALES)
}
