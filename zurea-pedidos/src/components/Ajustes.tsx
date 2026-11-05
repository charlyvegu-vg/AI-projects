import { useState } from 'react'
import { store, useEstado } from '../data'
import { accion } from '../lib/accion'
import { avanzarConEnter } from '../lib/teclado'
import { bipBip, desbloquearSonido } from '../lib/sonido'
import { Respaldo } from './Respaldo'

export function Ajustes() {
  const { ajustes, usuario } = useEstado()
  const [timer, setTimer] = useState(String(ajustes.timerMin))
  const [correo, setCorreo] = useState('')
  const [guardado, setGuardado] = useState(false)

  const guardarTimer = async () => {
    const n = Math.round(Number(timer))
    if (!(n >= 1)) return alert('El temporizador debe ser de al menos 1 minuto.')
    if (await accion(() => store.guardarAjustes({ ...ajustes, timerMin: n }))) {
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2000)
    }
  }
  const agregarCorreo = async () => {
    const c = correo.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return alert('Escribe un correo válido.')
    if (ajustes.correos.includes(c)) return setCorreo('')
    if (await accion(() => store.guardarAjustes({ ...ajustes, correos: [...ajustes.correos, c] }))) setCorreo('')
  }
  const quitarCorreo = (c: string) => {
    if (confirm(`¿Dejar de enviar avisos a ${c}?`))
      accion(() => store.guardarAjustes({ ...ajustes, correos: ajustes.correos.filter((x) => x !== c) }))
  }

  return (
    <div className="pagina pagina-angosta">
      <div><h1>Ajustes</h1><div className="subtitulo">a tu medida</div></div>

      <Respaldo />

      <section className="panel">
        <h2>Temporizador</h2>
        <p className="ayuda">Tiempo máximo para iniciar la preparación. Se usa por defecto en los pedidos nuevos y se puede cambiar en cada pedido. Los pedidos que ya existen no cambian.</p>
        <div className="fila">
          <input className="input-num" type="number" inputMode="numeric" min={1} value={timer} onChange={(e) => setTimer(e.target.value)} enterKeyHint="done" onKeyDown={avanzarConEnter(guardarTimer)} />
          <span>minutos</span>
          <button className="btn btn-primario" onClick={guardarTimer}>{guardado ? '✓ Guardado' : 'Guardar'}</button>
        </div>
      </section>

      <section className="panel">
        <h2>Correos de aviso</h2>
        <p className="ayuda">Para pedidos de otro día se envía un aviso 5 horas antes de la entrega (si cae de noche, a las 9:00 pm del día anterior).</p>
        <ul className="lista-correos">
          {ajustes.correos.map((c) => (
            <li key={c}><span>{c}</span><button className="btn btn-mini" onClick={() => quitarCorreo(c)}>Quitar</button></li>
          ))}
          {!ajustes.correos.length && <li className="vacio">Sin correos: no se enviarán avisos.</li>}
        </ul>
        <div className="fila">
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" onKeyDown={(e) => e.key === 'Enter' && agregarCorreo()} />
          <button className="btn" onClick={agregarCorreo}>Agregar</button>
        </div>
        {store.modo === 'local' && <p className="aviso-modo">En modo local los correos no se envían. Se activan al conectar Supabase.</p>}
      </section>

      <section className="panel">
        <h2>Sonido</h2>
        <button className="btn" onClick={() => { desbloquearSonido(); setTimeout(bipBip, 50) }}>🔊 Probar "bip bip"</button>
      </section>

      <section className="panel">
        <h2>Sesión</h2>
        {store.modo === 'local'
          ? <p className="ayuda">Modo local: los datos se guardan solo en este dispositivo.</p>
          : <div className="fila"><span>Conectado como <b>{usuario}</b></span><button className="btn" onClick={() => store.cerrarSesion()}>Cerrar sesión</button></div>}
      </section>
    </div>
  )
}
