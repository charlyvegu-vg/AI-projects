// Genera los archivos de Excel y PDF del reporte. Las librerías se cargan solo
// al tocar el botón, para que la app abra rápido.
import { fecha, hoyISO, q } from './format'
import type { Reporte } from './reporte'

const r2 = (n: number) => Math.round(n * 100) / 100

function nombreArchivo(r: Reporte, ext: string) {
  return `reporte-${r.periodo.archivo}.${ext}`
}

export async function descargarExcel(r: Reporte) {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const t = r.totales
  const DINERO = '#,##0.00'
  type Celda = { value: string | number | null; type?: StringConstructor | NumberConstructor; format?: string; fontWeight?: 'bold'; backgroundColor?: string; color?: string } | null
  const txt = (v: string, extra: Partial<NonNullable<Celda>> = {}): Celda => ({ value: v, type: String, ...extra })
  const num = (v: number, extra: Partial<NonNullable<Celda>> = {}): Celda => ({ value: r2(v), type: Number, format: DINERO, ...extra })
  const cab = (v: string): Celda => txt(v, { fontWeight: 'bold', backgroundColor: '#0B7285', color: '#FFFFFF' })

  const encabezados = [
    'Fecha', 'Cliente', 'Departamento', 'Equipo', 'Tipo', 'Estado', 'Forma de pago', 'Factura',
    'Precio (Q)', 'Cobrado (Q)', 'Pendiente (Q)', 'Viáticos (Q)', 'Materiales (Q)', 'Imprevistos (Q)',
    'Mano de obra (Q)', 'Ganancia (Q)', 'Margen (%)',
  ].map(cab)
  const filas: Celda[][] = r.filas.map((f) => [
    txt(fecha(f.fecha)), txt(f.cliente), txt(f.departamento), txt(f.equipo), txt(f.tipo), txt(f.estado), txt(f.metodos), txt(f.factura),
    num(f.precio), num(f.cobrado), num(f.pendiente), num(f.viaticos), num(f.materiales), num(f.imprevistos),
    num(f.manoObra), num(f.utilidad, f.utilidad < 0 ? { color: '#C2453A' } : {}), num(f.margen),
  ])
  const sum = (k: 'precio' | 'cobrado' | 'pendiente' | 'viaticos' | 'materiales' | 'imprevistos' | 'manoObra' | 'utilidad') =>
    num(r.filas.reduce((s, f) => s + f[k], 0), { fontWeight: 'bold' })
  const total: Celda[] = [
    txt('TOTAL', { fontWeight: 'bold' }), null, null, null, null, null, null, null,
    sum('precio'), sum('cobrado'), sum('pendiente'), sum('viaticos'), sum('materiales'), sum('imprevistos'),
    sum('manoObra'), sum('utilidad'), num(t.margen, { fontWeight: 'bold' }),
  ]

  const trabajos: Celda[][] = [
    [txt(`Reporte de trabajos realizados: ${r.periodo.titulo}`, { fontWeight: 'bold' })],
    [txt(r.tecnico.nombreTecnico ? `Técnico: ${r.tecnico.nombreTecnico}` : '')],
    [null],
    encabezados,
    ...filas,
    filas.length ? total : [txt('No hubo trabajos realizados en este período.')],
  ]

  const fila = (etiqueta: string, valor: Celda): Celda[] => [txt(etiqueta), valor]
  const resumen: Celda[][] = [
    [txt('Resumen', { fontWeight: 'bold' }), txt(r.periodo.titulo, { fontWeight: 'bold' })],
    fila('Desde', txt(fecha(r.periodo.desde))),
    fila('Hasta', txt(fecha(r.periodo.hasta))),
    [null],
    fila('Trabajos realizados', { value: t.trabajos, type: Number }),
    fila('Mantenimientos', { value: t.preventivos, type: Number }),
    fila('Reparaciones', { value: t.correctivos, type: Number }),
    [null],
    fila('Ingresos (Q)', num(t.ingreso)),
    fila('Cobrado (Q)', num(t.cobrado)),
    fila('Pendiente de cobro (Q)', num(t.pendiente)),
    fila('Gastos: viáticos, materiales e imprevistos (Q)', num(t.gastos)),
    fila('Mano de obra (Q)', num(t.manoObra)),
    fila('Ganancia (Q)', num(t.utilidad, { fontWeight: 'bold' })),
    fila('Margen (%)', num(t.margen)),
  ]

  const anchos = (w: number[]) => w.map((width) => ({ width }))
  const blob = await writeExcelFile([
    { data: resumen as never, sheet: 'Resumen', columns: anchos([44, 30]) },
    { data: trabajos as never, sheet: 'Trabajos', columns: anchos([12, 34, 16, 34, 15, 13, 16, 12, 12, 12, 13, 12, 14, 14, 16, 13, 11]) },
  ]).toBlob()
  guardar(blob, nombreArchivo(r, 'xlsx'))
}

export async function descargarPDF(r: Reporte) {
  const [{ jsPDF }, modTabla] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  // La librería de tablas se exporta distinto según el empaquetador; se toma la función que exista.
  const m = modTabla as unknown as { autoTable?: unknown; default?: unknown }
  const autoTable = (m.autoTable ?? (typeof m.default === 'function' ? m.default : (m.default as { default: unknown }).default)) as typeof import('jspdf-autotable').default
  const t = r.totales
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const ancho = doc.internal.pageSize.getWidth()
  const CIAN: [number, number, number] = [11, 114, 133]

  // Encabezado
  doc.setFillColor(...CIAN)
  doc.rect(0, 0, ancho, 64, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Reporte de trabajos realizados', 36, 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(r.periodo.titulo, 36, 48)
  const quien = [r.tecnico.nombreTecnico, r.tecnico.telefonoTecnico, r.tecnico.nit && `NIT ${r.tecnico.nit}`].filter(Boolean).join('   ')
  if (quien) doc.text(quien, ancho - 36, 48, { align: 'right' })

  // Resumen en cuadros
  const cuadros: [string, string][] = [
    ['Trabajos', `${t.trabajos}  (${t.preventivos} mant. / ${t.correctivos} rep.)`],
    ['Ingresos', q(t.ingreso)],
    ['Cobrado', q(t.cobrado)],
    ['Pendiente', q(t.pendiente)],
    ['Gastos + mano de obra', q(t.gastos + t.manoObra)],
    ['Ganancia', `${q(t.utilidad)}  (${t.margen.toFixed(0)} %)`],
  ]
  const w = (ancho - 72 - 5 * 8) / 6
  cuadros.forEach(([et, val], i) => {
    const x = 36 + i * (w + 8)
    doc.setFillColor(239, 245, 246)
    doc.roundedRect(x, 80, w, 46, 6, 6, 'F')
    doc.setTextColor(85, 104, 109)
    doc.setFontSize(9)
    doc.text(et, x + 8, 96)
    doc.setTextColor(18, 40, 46)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(i === 0 ? 9.5 : 11.5)
    doc.text(val, x + 8, 115)
    doc.setFont('helvetica', 'normal')
  })

  const n = (v: number) => v.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const dinero = { halign: 'right' as const, cellWidth: 52 }
  autoTable(doc, {
    startY: 142,
    margin: { left: 36, right: 36 },
    head: [['Fecha', 'Cliente y equipo', 'Tipo', 'Pago', 'Precio Q', 'Cobrado Q', 'Pendiente Q', 'Gastos Q', 'Su tiempo Q', 'Ganancia Q', '%']],
    body: r.filas.map((f) => [
      fecha(f.fecha),
      `${f.cliente} (${f.departamento})\n${f.equipo || 'Sin equipo'}`,
      f.tipo,
      f.metodos || '—',
      n(f.precio),
      n(f.cobrado),
      n(f.pendiente),
      n(f.viaticos + f.materiales + f.imprevistos),
      n(f.manoObra),
      n(f.utilidad),
      f.margen.toFixed(0),
    ]),
    foot: r.filas.length
      ? [['Total', `${t.trabajos} trabajos`, '', '', n(t.ingreso), n(t.cobrado), n(t.pendiente), n(t.gastos), n(t.manoObra), n(t.utilidad), t.margen.toFixed(0)]]
      : undefined,
    styles: { fontSize: 8.5, cellPadding: 4, textColor: [18, 40, 46], lineColor: [210, 225, 228], lineWidth: 0.5, valign: 'middle' },
    headStyles: { fillColor: CIAN, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [221, 241, 244], textColor: [18, 40, 46], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 251, 251] },
    columnStyles: {
      0: { cellWidth: 56 },
      2: { cellWidth: 76 },
      3: { cellWidth: 74 },
      4: dinero, 5: dinero, 6: dinero, 7: dinero, 8: dinero, 9: dinero,
      10: { halign: 'right', cellWidth: 26 },
    },
    didParseCell: (d) => {
      // Ganancia en rojo cuando hubo pérdida
      if (d.section === 'body' && d.column.index === 9 && r.filas[d.row.index]?.utilidad < 0) d.cell.styles.textColor = [194, 69, 58]
      if ((d.section === 'head' || d.section === 'foot') && d.column.index >= 4) d.cell.styles.halign = 'right'
    },
  })

  if (!r.filas.length) {
    doc.setTextColor(85, 104, 109)
    doc.setFontSize(12)
    doc.text('No hubo trabajos realizados en este período.', 36, 180)
  }

  // Pie de página
  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(85, 104, 109)
    const alto = doc.internal.pageSize.getHeight()
    doc.text(`Generado con Agenda Técnica el ${fecha(hoyISO())}`, 36, alto - 20)
    doc.text(`Página ${i} de ${paginas}`, ancho - 36, alto - 20, { align: 'right' })
  }

  guardar(doc.output('blob'), nombreArchivo(r, 'pdf'))
}

function guardar(blob: Blob, nombre: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
