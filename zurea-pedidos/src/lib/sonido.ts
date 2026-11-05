/** "Bip bip" generado con Web Audio (no necesita archivos de sonido). */
let ctx: AudioContext | null = null
const oyentes = new Set<() => void>()

function contexto(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    ctx.onstatechange = () => oyentes.forEach((fn) => fn())
  }
  return ctx
}

/** Android solo permite sonido después de que alguien toca la pantalla. */
export function desbloquearSonido() {
  const c = contexto()
  if (c && c.state !== 'running') c.resume().catch(() => {})
}

export function sonidoActivo(): boolean {
  return contexto()?.state === 'running'
}

export function alCambiarSonido(fn: () => void) {
  oyentes.add(fn)
  return () => { oyentes.delete(fn) }
}

export function bipBip() {
  const c = contexto()
  if (!c || c.state !== 'running') return
  const t = c.currentTime
  for (const inicio of [0, 0.25]) {
    const osc = c.createOscillator()
    const vol = c.createGain()
    osc.type = 'square'
    osc.frequency.value = 1760
    vol.gain.setValueAtTime(0.0001, t + inicio)
    vol.gain.exponentialRampToValueAtTime(0.35, t + inicio + 0.01)
    vol.gain.setValueAtTime(0.35, t + inicio + 0.14)
    vol.gain.exponentialRampToValueAtTime(0.0001, t + inicio + 0.16)
    osc.connect(vol).connect(c.destination)
    osc.start(t + inicio)
    osc.stop(t + inicio + 0.18)
  }
}
