import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icono from '../components/Icono'
import { Boton, Encabezado, Entrada, Estado, FilaLink, Grupo, Titulo, Vacio } from '../components/ui'
import { db } from '../db'
import { estadoEquipo } from '../lib/calc'
import { useConfig } from '../lib/hooks'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

export default function Clientes() {
  const nav = useNavigate()
  const cfg = useConfig()
  const [busca, setBusca] = useState('')
  const datos = useLiveQuery(async () => ({ clientes: await db.clientes.orderBy('nombre').toArray(), equipos: await db.equipos.toArray() }), [])
  if (!datos) return null

  const b = norm(busca)
  const lista = datos.clientes.filter((c) => !b || norm(`${c.nombre} ${c.municipio} ${c.contacto} ${c.departamento}`).includes(b))
  // Agrupados por departamento: así se ve qué clientes quedan cerca entre sí.
  const deptos = [...new Set(lista.map((c) => c.departamento))].sort()

  return (
    <>
      <Encabezado
        titulo="Clientes"
        accion={
          <Boton variante="texto" icono="mas" className="min-h-12 px-3" onClick={() => nav('/clientes/nuevo')}>
            Agregar
          </Boton>
        }
      />
      <div className="relative mb-6">
        <Icono nombre="buscar" className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gris" />
        <Entrada type="search" placeholder="Buscar por nombre o lugar" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-12" />
      </div>
      {lista.length === 0 && <Vacio>{busca ? `No hay clientes que coincidan con "${busca}".` : 'Aún no tiene clientes. Toque "Agregar".'}</Vacio>}
      <div className="space-y-6">
        {deptos.map((d) => (
          <section key={d}>
            <Titulo>{d}</Titulo>
            <Grupo>
              {lista
                .filter((c) => c.departamento === d)
                .map((c) => {
                  const eqs = datos.equipos.filter((e) => e.clienteId === c.id)
                  const vencidos = eqs.filter((e) => estadoEquipo(e, cfg.diasAviso) === 'vencido').length
                  const pronto = eqs.filter((e) => estadoEquipo(e, cfg.diasAviso) === 'pronto').length
                  return (
                    <FilaLink
                      key={c.id}
                      onClick={() => nav(`/clientes/${c.id}`)}
                      titulo={c.nombre}
                      detalle={c.municipio || `${eqs.length} equipos`}
                      derecha={vencidos > 0 ? <Estado color="rojo">Vencido</Estado> : pronto > 0 ? <Estado color="amarillo">Pronto</Estado> : undefined}
                    />
                  )
                })}
            </Grupo>
          </section>
        ))}
      </div>
    </>
  )
}
