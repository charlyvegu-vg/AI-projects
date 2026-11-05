/** Logotipo tipográfico de Zuréa Desserts. */
export function Marca({ grande = false }: { grande?: boolean }) {
  return (
    <div className={`marca ${grande ? 'marca-grande' : ''}`}>
      <span className="marca-nombre">Zuréa</span>
      <span className="marca-sub">Desserts</span>
    </div>
  )
}

/** Línea dorada con rombo al centro, como en los anuncios. */
export function Ornamento({ children }: { children?: React.ReactNode }) {
  return (
    <div className="ornamento">
      <span className="ornamento-linea" />
      <span className="ornamento-centro">{children ?? '◆'}</span>
      <span className="ornamento-linea" />
    </div>
  )
}
