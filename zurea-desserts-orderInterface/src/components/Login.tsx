import { useState } from 'react'
import { store } from '../data'
import { desbloquearSonido } from '../lib/sonido'
import { Marca, Ornamento } from './Marca'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    desbloquearSonido()
    setEntrando(true)
    setError('')
    try {
      await store.iniciarSesion(email.trim(), password)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="login">
      <form className="panel login-panel" onSubmit={entrar}>
        <Marca grande />
        <Ornamento>♡</Ornamento>
        <p className="login-lema">Sabor que encanta</p>
        <label className="campo"><span>Correo</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
        <label className="campo"><span>Contraseña</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primario btn-grande" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}
