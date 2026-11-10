import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Icono, { type NombreIcono } from './Icono'

function Pestaña({ to, icono, texto, end }: { to: string; icono: NombreIcono; texto: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.8rem] font-bold ${isActive ? 'text-primario' : 'text-gris'}`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`flex h-8 w-14 items-center justify-center rounded-full ${isActive ? 'bg-primario-suave' : ''}`}>
            <Icono nombre={icono} />
          </span>
          {texto}
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  // En los formularios se oculta la barra para que haya más espacio y menos distracción.
  const enFormulario = /\/(nuevo|editar)$/.test(pathname)
  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <main className={`px-5 ${enFormulario ? 'pb-10' : 'pb-32'}`}>
        <Outlet />
      </main>
      {!enFormulario && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-hoja pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-lg items-stretch px-1">
            <Pestaña to="/" end icono="inicio" texto="Inicio" />
            <Pestaña to="/trabajos" icono="agenda" texto="Trabajos" />
            <div className="flex flex-1 items-center justify-center py-1.5">
              <button
                onClick={() => nav('/trabajos/nuevo')}
                className="flex h-full w-full max-w-20 flex-col items-center justify-center gap-0.5 rounded-2xl bg-primario text-[0.8rem] font-bold text-white active:bg-primario-oscuro"
              >
                <Icono nombre="mas" className="h-7 w-7" />
                Nuevo
              </button>
            </div>
            <Pestaña to="/clientes" icono="clientes" texto="Clientes" />
            <Pestaña to="/reportes" icono="reporte" texto="Reportes" />
          </div>
        </nav>
      )}
    </div>
  )
}
