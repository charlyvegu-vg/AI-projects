-- Inventario: insumos, movimientos (entradas y salidas) y función para registrarlos de forma segura.
-- Ejecutar una sola vez en Supabase → SQL Editor (después de 003).

create table public.insumos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('contable', 'pesado')),
  unidad text not null default '',
  cantidad numeric(12,3) not null default 0 check (cantidad >= 0),
  referencia numeric(12,3) not null default 0 check (referencia >= 0),
  alerta numeric(12,3) not null check (alerta >= 0),
  creado_en timestamptz not null default now()
);

create table public.movimientos (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references public.insumos (id) on delete cascade,
  cambio numeric(12,3) not null,
  motivo text not null check (motivo in ('receta', 'compra', 'ajuste')),
  detalle text not null default '',
  ref text,
  fecha timestamptz not null default now()
);
create index movimientos_fecha_idx on public.movimientos (fecha desc);
-- Una misma preparación (ref) no puede descontar dos veces el mismo insumo.
create unique index movimientos_ref_idx on public.movimientos (ref, insumo_id) where ref is not null;

-- Registra varios movimientos en una sola transacción: si uno falla, no se aplica ninguno.
-- El inventario no baja de cero; una compra deja la cantidad resultante como nuevo 100 %.
create or replace function public.registrar_movimientos(movs jsonb) returns void
language plpgsql security invoker as $$
declare m jsonb;
begin
  for m in select * from jsonb_array_elements(movs) loop
    insert into public.movimientos (insumo_id, cambio, motivo, detalle, ref)
    values ((m->>'insumoId')::uuid, (m->>'cambio')::numeric, m->>'motivo', coalesce(m->>'detalle', ''), m->>'ref');
    update public.insumos
       set cantidad = greatest(0, cantidad + (m->>'cambio')::numeric),
           referencia = case when m->>'motivo' = 'compra' then greatest(0, cantidad + (m->>'cambio')::numeric) else referencia end
     where id = (m->>'insumoId')::uuid;
  end loop;
end $$;

alter table public.insumos enable row level security;
alter table public.movimientos enable row level security;
create policy "equipo" on public.insumos for all to authenticated using (true) with check (true);
create policy "equipo" on public.movimientos for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.insumos, public.movimientos;
