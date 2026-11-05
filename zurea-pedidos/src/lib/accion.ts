/** Ejecuta una acción y muestra el error si falla (por ejemplo, sin internet). */
export async function accion(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn()
    return true
  } catch (e) {
    alert('No se pudo completar: ' + ((e as Error).message || 'error desconocido'))
    return false
  }
}
