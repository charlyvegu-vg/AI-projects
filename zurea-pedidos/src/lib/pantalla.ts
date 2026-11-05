/** Mantiene la pantalla encendida mientras la app está abierta (requiere https). */
export function mantenerPantallaEncendida() {
  type WL = { request(t: 'screen'): Promise<{ released: boolean }> }
  const wl = (navigator as unknown as { wakeLock?: WL }).wakeLock
  if (!wl) return () => {}
  let lock: { released: boolean } | null = null
  const pedir = () => {
    if (document.visibilityState === 'visible' && (!lock || lock.released)) {
      wl.request('screen').then((l) => { lock = l }).catch(() => {})
    }
  }
  pedir()
  document.addEventListener('visibilitychange', pedir)
  document.addEventListener('pointerdown', pedir)
  return () => {
    document.removeEventListener('visibilitychange', pedir)
    document.removeEventListener('pointerdown', pedir)
  }
}
