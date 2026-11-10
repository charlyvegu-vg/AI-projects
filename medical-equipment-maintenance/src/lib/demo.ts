// Datos de prueba: clínicas, personas, teléfonos y correos 100% ficticios. Las fechas se calculan a partir de hoy
// para que siempre haya trabajos próximos y clientes por contactar.
import { db, nuevo, type Cliente, type Equipo, type Gasto, type Pago, type Trabajo } from '../db'
import { hoyISO, sumarDias, sumarMeses } from './format'

type C = Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>

const CLIENTES: C[] = [
  { nombre: 'Clínica Médica San Rafael', departamento: 'Guatemala', municipio: 'Guatemala (zona 10)', direccion: '6a. avenida 12-45, zona 10', contacto: 'Dra. Lucía Morales', telefono: '1000 0001', correo: 'contacto@ejemplo.com', notas: 'Atienden de 7:00 a 15:00. Pedir pase en garita.' },
  { nombre: 'Sanatorio Santa Clara', departamento: 'Guatemala', municipio: 'Mixco', direccion: 'Calzada San Juan 15-20, zona 4 de Mixco', contacto: 'Lic. Héctor Ramírez (compras)', telefono: '1000 0002', correo: 'contacto@ejemplo.com', notas: 'Pagan con cheque a 15 días.' },
  { nombre: 'Centro Odontológico Sonrisa Total', departamento: 'Guatemala', municipio: 'Villa Nueva', direccion: 'Centro Comercial Las Américas, local 14', contacto: 'Dr. Andrés Pineda', telefono: '1000 0003', correo: '', notas: '' },
  { nombre: 'Clínica Familiar Santa Lucía', departamento: 'Sacatepéquez', municipio: 'Antigua Guatemala', direccion: '4a. calle oriente #23', contacto: 'Dra. María José Cifuentes', telefono: '1000 0004', correo: 'contacto@ejemplo.com', notas: 'Estacionamiento en la parte de atrás.' },
  { nombre: 'Hospital Privado Valle de Panchoy', departamento: 'Sacatepéquez', municipio: 'Jocotenango', direccion: 'Km 46 carretera a Chimaltenango', contacto: 'Ing. Ricardo Solís (mantenimiento)', telefono: '1000 0005', correo: 'contacto@ejemplo.com', notas: 'Piden factura antes de pagar.' },
  { nombre: 'Laboratorio Clínico Vida Sana', departamento: 'Chimaltenango', municipio: 'Chimaltenango', direccion: '2a. avenida 3-15, zona 1', contacto: 'Licda. Karla Xicará', telefono: '1000 0006', correo: 'contacto@ejemplo.com', notas: '' },
  { nombre: 'Clínica Médica Kaqchikel', departamento: 'Chimaltenango', municipio: 'Tecpán Guatemala', direccion: 'Barrio Asunción, frente al parque', contacto: 'Dr. Juan Carlos Batz', telefono: '1000 0007', correo: '', notas: 'Pagan en efectivo.' },
  { nombre: 'Sanatorio Los Cuchumatanes', departamento: 'Huehuetenango', municipio: 'Huehuetenango', direccion: '5a. calle 6-30, zona 1', contacto: 'Dra. Rosa Herrera', telefono: '1000 0008', correo: 'contacto@ejemplo.com', notas: 'Salir de madrugada; son 5 horas de viaje.' },
  { nombre: 'Centro de Salud Integral Chiantla', departamento: 'Huehuetenango', municipio: 'Chiantla', direccion: 'Calle principal, barrio El Centro', contacto: 'Enf. Marta López', telefono: '1000 0009', correo: '', notas: '' },
  { nombre: 'Hospital Privado Montaña Verde', departamento: 'Alta Verapaz', municipio: 'Cobán', direccion: '1a. calle 4-50, zona 2', contacto: 'Lic. Edgar Caal (administrador)', telefono: '1000 0010', correo: 'contacto@ejemplo.com', notas: 'Transferencia a BI.' },
  { nombre: 'Clínica Dental Imperial', departamento: 'Alta Verapaz', municipio: 'Cobán', direccion: '3a. avenida 2-18, zona 1', contacto: 'Dra. Ana Lucía Tot', telefono: '1000 0011', correo: '', notas: '' },
  { nombre: 'Clínica Pediátrica Mis Primeros Pasos', departamento: 'Alta Verapaz', municipio: 'San Pedro Carchá', direccion: 'Barrio San Sebastián 8-12', contacto: 'Dr. Mario Coc', telefono: '1000 0012', correo: '', notas: '' },
]

// [índice cliente, tipo, marca, modelo, frecuencia, meses desde último servicio, días extra]
type E = [number, string, string, string, number, number, number]
const EQUIPOS: E[] = [
  [0, 'Monitor de signos vitales', 'Mindray', 'uMEC 12', 6, 6, 5],
  [0, 'Electrocardiógrafo', 'Contec', 'ECG1200G', 12, 4, 0],
  [0, 'Autoclave', 'Tuttnauer', '2540M', 6, 2, 0],
  [1, 'Máquina de anestesia', 'Dräger', 'Fabius Plus', 6, 5, -20],
  [1, 'Desfibrilador', 'Zoll', 'R Series', 6, 6, -3],
  [1, 'Lámpara quirúrgica', 'Mindray', 'HyLED 7', 12, 8, 0],
  [1, 'Electrobisturí', 'Valleylab', 'Force FX', 12, 11, -10],
  [2, 'Unidad dental', 'Gnatus', 'G8', 6, 6, -2],
  [2, 'Compresor dental', 'Schulz', 'MSV 6', 6, 1, 0],
  [3, 'Ultrasonido', 'Mindray', 'DC-30', 12, 11, -18],
  [3, 'Autoclave', 'Midmark', 'M11', 6, 5, -25],
  [4, 'Rayos X', 'Siemens', 'Multix Select', 12, 7, 0],
  [4, 'Incubadora neonatal', 'Atom', 'V-2100G', 6, 6, -8],
  [4, 'Bomba de infusión', 'B. Braun', 'Infusomat Space', 12, 3, 0],
  [5, 'Centrífuga', 'Hettich', 'EBA 200', 6, 6, -12],
  [5, 'Analizador de química', 'Mindray', 'BS-240', 3, 3, 15],
  [6, 'Concentrador de oxígeno', 'Philips', 'EverFlo', 6, 4, 0],
  [7, 'Monitor de signos vitales', 'Edan', 'iM50', 6, 6, -6],
  [7, 'Autoclave', 'Tuttnauer', '3870EA', 6, 7, 0],
  [7, 'Rayos X', 'GE', 'AMX 4', 12, 11, -12],
  [8, 'Concentrador de oxígeno', 'DeVilbiss', '525DS', 6, 5, -28],
  [9, 'Ultrasonido', 'GE', 'Logiq P9', 12, 2, 0],
  [9, 'Máquina de anestesia', 'Mindray', 'WATO EX-35', 6, 6, -9],
  [10, 'Unidad dental', 'Kavo', 'Unik', 6, 5, -21],
  [11, 'Incubadora neonatal', 'Drager', 'Isolette 8000', 6, 3, 0],
]

export async function cargarDemo() {
  const hoy = hoyISO()
  const clientes = CLIENTES.map((c) => nuevo(c))
  const equipos: Equipo[] = EQUIPOS.map(([ci, tipo, marca, modelo, frec, hace, extra], i) =>
    nuevo({
      clienteId: clientes[ci].id,
      tipo,
      marca,
      modelo,
      serie: `${marca.slice(0, 2).toUpperCase()}${(240000 + i * 1379).toString()}`,
      ubicacion: ['Emergencia', 'Sala de operaciones', 'Laboratorio', 'Consultorio 1', 'Encamamiento'][i % 5],
      frecuenciaMeses: frec,
      ultimoServicio: sumarDias(sumarMeses(hoy, -hace), -extra),
    }),
  )

  const trabajos: Trabajo[] = []
  const pagos: Pago[] = []
  const gastos: Gasto[] = []

  const trabajo = (
    ei: number,
    dias: number,
    estado: Trabajo['estado'],
    precio: number,
    extra: Partial<Trabajo> = {},
  ) => {
    const eq = equipos[ei]
    const t = nuevo<Omit<Trabajo, 'id' | 'createdAt' | 'updatedAt'>>({
      clienteId: eq.clienteId,
      equipoId: eq.id,
      tipo: 'preventivo',
      prioridad: 'normal',
      estado,
      fecha: sumarDias(hoy, dias),
      hora: '08:00',
      duracionHoras: 2,
      horasTrabajo: 2,
      horasViaje: 1,
      precio,
      descripcion: '',
      viajeId: '',
      historico: false,
      ...extra,
    })
    trabajos.push(t)
    return t
  }
  const pago = (t: Trabajo, monto: number, metodo: Pago['metodo'], extra: Partial<Pago> = {}) =>
    pagos.push(
      nuevo({ trabajoId: t.id, monto, metodo, fecha: t.fecha, referencia: '', factura: '', estadoCheque: 'cobrado' as const, ...extra }),
    )
  const gasto = (t: Trabajo, categoria: string, monto: number, descripcion = '') =>
    gastos.push(nuevo({ trabajoId: t.id, viajeId: '', categoria, monto, fecha: t.fecha, descripcion }))

  // Trabajos pasados, ya cobrados
  let t = trabajo(2, -60, 'cobrado', 650, { descripcion: 'Limpieza, cambio de empaque y prueba de esterilización.' })
  pago(t, 650, 'transferencia', { referencia: 'BI 884512', factura: 'A-1021' })
  gasto(t, 'combustible', 60)
  gasto(t, 'materiales', 120, 'Empaque de puerta')

  t = trabajo(21, -55, 'cobrado', 2200, { horasTrabajo: 4, horasViaje: 9, hora: '10:00' })
  pago(t, 2200, 'transferencia', { referencia: 'BI 902233', factura: 'A-1022' })
  gasto(t, 'combustible', 520)
  gasto(t, 'hospedaje', 300)
  gasto(t, 'alimentacion', 150)

  t = trabajo(13, -40, 'cobrado', 500, { horasTrabajo: 2, horasViaje: 2 })
  pago(t, 500, 'efectivo', { factura: 'A-1025' })
  gasto(t, 'combustible', 90)

  t = trabajo(16, -30, 'cobrado', 400, { horasTrabajo: 2, horasViaje: 4, descripcion: 'Cambio de filtros.' })
  pago(t, 400, 'efectivo')
  gasto(t, 'combustible', 180)
  gasto(t, 'materiales', 85, 'Filtros')
  gasto(t, 'alimentacion', 45)

  t = trabajo(8, -25, 'cobrado', 300, { horasTrabajo: 1.5, horasViaje: 1 })
  pago(t, 300, 'efectivo')
  gasto(t, 'combustible', 40)

  // Correctivo con pérdida (para ver el semáforo rojo)
  t = trabajo(24, -20, 'realizado', 600, {
    tipo: 'correctivo',
    prioridad: 'urgente',
    horasTrabajo: 3,
    horasViaje: 8,
    descripcion: 'No calentaba. Se cambió resistencia.',
  })
  pago(t, 300, 'efectivo')
  gasto(t, 'combustible', 480)
  gasto(t, 'materiales', 350, 'Resistencia')
  gasto(t, 'alimentacion', 80)

  // Cobrado con cheque pendiente
  t = trabajo(5, -15, 'realizado', 900, { horasTrabajo: 3, horasViaje: 1 })
  pago(t, 900, 'cheque', { referencia: 'Cheque 000452 – Banrural', estadoCheque: 'pendiente', factura: 'A-1030' })
  gasto(t, 'combustible', 70)

  t = trabajo(11, -10, 'realizado', 1500, { horasTrabajo: 4, horasViaje: 2, tipo: 'correctivo', descripcion: 'Falla en colimador.' })
  gasto(t, 'combustible', 100)
  gasto(t, 'materiales', 420, 'Lámpara de colimador')

  // Trabajos recientes (para que los reportes de la semana y del mes tengan datos)
  t = trabajo(3, -6, 'cobrado', 850, { horasTrabajo: 3, horasViaje: 1.5, descripcion: 'Mantenimiento general y calibración.' })
  pago(t, 850, 'transferencia', { referencia: 'BI 915540', factura: 'A-1033' })
  gasto(t, 'combustible', 75)
  gasto(t, 'alimentacion', 40)

  t = trabajo(9, -3, 'realizado', 1200, { horasTrabajo: 3, horasViaje: 1.5 })
  pago(t, 600, 'efectivo')
  gasto(t, 'combustible', 75)
  gasto(t, 'materiales', 180, 'Gel conductor y cable')

  t = trabajo(14, 0, 'cobrado', 450, { hora: '07:00', horasTrabajo: 1.5, horasViaje: 2 })
  pago(t, 450, 'efectivo')
  gasto(t, 'combustible', 110)

  // Próximos
  trabajo(0, 0, 'agendado', 550, { hora: '09:00' })
  trabajo(4, 1, 'agendado', 700, { hora: '10:30' })
  trabajo(1, 3, 'agendado', 450, { hora: '14:00' })
  trabajo(17, 6, 'agendado', 800, { hora: '11:00', horasViaje: 10 })
  trabajo(19, 6, 'solicitado', 1800, { hora: '14:00', horasViaje: 0, tipo: 'correctivo', prioridad: 'urgente', descripcion: 'No dispara. Revisar generador.' })

  // Marcar último servicio de los equipos con trabajos realizados
  for (const tr of trabajos) {
    if (tr.estado === 'realizado' || tr.estado === 'cobrado') {
      const eq = equipos.find((e) => e.id === tr.equipoId)
      if (eq && tr.fecha > eq.ultimoServicio) eq.ultimoServicio = tr.fecha
    }
  }

  await db.transaction('rw', [db.clientes, db.equipos, db.trabajos, db.pagos, db.gastos], async () => {
    await db.clientes.bulkAdd(clientes)
    await db.equipos.bulkAdd(equipos)
    await db.trabajos.bulkAdd(trabajos)
    await db.pagos.bulkAdd(pagos)
    await db.gastos.bulkAdd(gastos)
  })
}

export async function borrarTodo() {
  await db.transaction('rw', [db.clientes, db.equipos, db.trabajos, db.pagos, db.gastos, db.viajes], async () => {
    await Promise.all([db.clientes.clear(), db.equipos.clear(), db.trabajos.clear(), db.pagos.clear(), db.gastos.clear(), db.viajes.clear()])
  })
}
