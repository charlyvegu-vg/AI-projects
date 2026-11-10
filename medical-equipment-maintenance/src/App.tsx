import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { inicializar } from './lib/hooks'
import ClienteDetalle from './pages/ClienteDetalle'
import ClienteForm from './pages/ClienteForm'
import Clientes from './pages/Clientes'
import Configuracion from './pages/Configuracion'
import Contactar from './pages/Contactar'
import EquipoForm from './pages/EquipoForm'
import Inicio from './pages/Inicio'
import Reportes from './pages/Reportes'
import TrabajoDetalle from './pages/TrabajoDetalle'
import TrabajoForm from './pages/TrabajoForm'
import Trabajos from './pages/Trabajos'

function ScrollArriba() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  useEffect(() => {
    inicializar()
    // Pide al navegador que no borre los datos guardados en el dispositivo.
    navigator.storage?.persist?.()
  }, [])

  return (
    <BrowserRouter>
      <ScrollArriba />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="trabajos" element={<Trabajos />} />
          <Route path="trabajos/nuevo" element={<TrabajoForm />} />
          <Route path="trabajos/:id" element={<TrabajoDetalle />} />
          <Route path="trabajos/:id/editar" element={<TrabajoForm />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="clientes/nuevo" element={<ClienteForm />} />
          <Route path="clientes/:id" element={<ClienteDetalle />} />
          <Route path="clientes/:id/editar" element={<ClienteForm />} />
          <Route path="clientes/:clienteId/equipos/nuevo" element={<EquipoForm />} />
          <Route path="equipos/:id/editar" element={<EquipoForm />} />
          <Route path="config" element={<Configuracion />} />
          <Route path="contactar" element={<Contactar />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="*" element={<Inicio />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
