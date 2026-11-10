// Íconos de línea simples, dibujados a mano para no depender de internet.
const RUTAS = {
  inicio: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  agenda: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 12h3v3H8z',
  clientes: 'M4 21V7l8-4 8 4v14M9 21v-5h6v5M10 9h4M12 7v4',
  ajustes: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  mas: 'M12 5v14M5 12h14',
  telefono: 'M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  mensaje: 'M4 20l1.5-4.5A8 8 0 1 1 9 19z',
  lugar: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  derecha: 'M9 5l7 7-7 7',
  atras: 'M15 5l-7 7 7 7',
  llave: 'M14.5 6.5a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.5-1.5zM3 21l6-6',
  check: 'M5 12.5l4.5 4.5L19 7',
  alerta: 'M12 4 2.5 20h19zM12 10v4M12 17v.5',
  dinero: 'M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 10v.01M18 14v.01',
  recibo: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  cerrar: 'M6 6l12 12M18 6 6 18',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  editar: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  abajo: 'M5 9l7 7 7-7',
  reporte: 'M4 20h16M7 16v-4M12 16V8M17 16v-6',
  descargar: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  documento: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
} as const

export type NombreIcono = keyof typeof RUTAS

export default function Icono({ nombre, className = 'h-6 w-6' }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={RUTAS[nombre]} />
    </svg>
  )
}
