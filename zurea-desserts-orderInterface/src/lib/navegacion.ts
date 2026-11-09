import { useEffect, useState } from 'react'

/**
 * La sección actual vive en la dirección (#inventario), para que recargar la página
 * la conserve y el botón "atrás" de la tablet regrese a la anterior.
 */
export function usePaginaEnDireccion<T extends string>(validas: readonly T[], inicial: T): [T, (p: T) => void] {
  const leer = (): T => {
    const h = decodeURIComponent(location.hash.slice(1)) as T
    return validas.includes(h) ? h : inicial
  }
  const [pagina, setPagina] = useState<T>(leer)
  useEffect(() => {
    const alCambiar = () => setPagina(leer())
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const ir = (p: T) => {
    if (p === pagina) return
    location.hash = p
  }
  return [pagina, ir]
}

/**
 * useState que se recuerda al recargar la página (solo en esta pestaña del navegador).
 * `valido` descarta lo guardado si ya no sirve (por ejemplo, un producto eliminado).
 */
export function useRecordado<T>(clave: string, inicial: T | (() => T), valido: (v: T) => boolean = () => true): [T, (v: T | ((a: T) => T)) => void] {
  const k = 'zurea-vista:' + clave
  const [v, setV] = useState<T>(() => {
    try {
      const g = sessionStorage.getItem(k)
      if (g !== null) {
        const x = JSON.parse(g) as T
        if (valido(x)) return x
      }
    } catch { /* se ignora lo guardado si está dañado */ }
    return typeof inicial === 'function' ? (inicial as () => T)() : inicial
  })
  useEffect(() => { sessionStorage.setItem(k, JSON.stringify(v)) }, [k, v])
  return [v, setV]
}
