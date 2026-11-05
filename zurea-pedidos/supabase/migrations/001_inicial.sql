-- Pedidos Repostería: tablas, permisos, tiempo real y catálogo inicial.
-- Ejecutar una sola vez en Supabase → SQL Editor.

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  variedades text[] not null default '{}',
  tamano text not null default '',
  precio numeric(10,2) not null check (precio > 0),
  activo boolean not null default true,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  casa text not null default '',
  cliente text not null default '',
  lineas jsonb not null default '[]',
  total numeric(10,2) not null default 0,
  notas text not null default '',
  tipo text not null check (tipo in ('asap', 'programado')),
  entrega_en timestamptz not null,
  timer_min int not null default 15 check (timer_min >= 1),
  timer_inicio timestamptz not null,
  fase text not null default 'pendiente' check (fase in ('pendiente', 'preparacion', 'listo', 'entregado')),
  silenciado boolean not null default false,
  aviso_en timestamptz,
  aviso_enviado boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint pedidos_cliente_requerido check (casa <> '' or cliente <> '')
);
create index pedidos_entrega_idx on public.pedidos (entrega_en);
create index pedidos_aviso_idx on public.pedidos (aviso_en) where aviso_enviado = false;

create table public.ajustes (
  id int primary key default 1 check (id = 1),
  timer_min int not null default 15 check (timer_min >= 1),
  correos text[] not null default '{}'
);

create or replace function public.tocar_actualizado() returns trigger language plpgsql as $$
begin new.actualizado_en = now(); return new; end $$;
create trigger pedidos_actualizado before update on public.pedidos
  for each row execute function public.tocar_actualizado();

-- Permisos: solo usuarios con sesión iniciada pueden ver y modificar.
alter table public.productos enable row level security;
alter table public.pedidos enable row level security;
alter table public.ajustes enable row level security;
create policy "equipo" on public.productos for all to authenticated using (true) with check (true);
create policy "equipo" on public.pedidos for all to authenticated using (true) with check (true);
create policy "equipo" on public.ajustes for all to authenticated using (true) with check (true);

-- Tiempo real entre tablets.
alter publication supabase_realtime add table public.pedidos, public.productos, public.ajustes;

-- Datos iniciales.
-- Los correos de aviso se agregan desde la app (Ajustes → Correos de aviso).
insert into public.ajustes (id, timer_min, correos) values (1, 15, '{}');
insert into public.productos (nombre, variedades, tamano, precio, orden) values
  ('Tartaleta',        '{Manzana,Piña,Manjar}',          'Individual',         15,  1),
  ('Tiramisú en vaso', '{}',                             'Individual',         20,  2),
  ('Pan de banano',    '{}',                             '5 porciones',        25,  3),
  ('Pan de naranja',   '{}',                             '5 porciones',        25,  4),
  ('Pan de zanahoria', '{}',                             'Aprox. 5 porciones', 35,  5),
  ('Pie grande',       '{Manzana,Piña,Higo}',            '6 a 8 porciones',    75,  6),
  ('Cheesecake',       '{"Jalea de mora","Jalea de fresa"}', '',               125, 7);
