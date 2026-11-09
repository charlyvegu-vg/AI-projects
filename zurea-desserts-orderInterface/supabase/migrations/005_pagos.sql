-- Forma de pago del pedido y con cuánto paga el cliente (para el cambio).
-- Ejecutar una sola vez en Supabase → SQL Editor (después de 004).
alter table public.pedidos
  add column if not exists pago text check (pago in ('efectivo', 'transferencia')),
  add column if not exists paga_con numeric(10,2) check (paga_con is null or paga_con >= 0);
