-- Recetario: una receta por producto (ingredientes, pasos, rendimiento y notas).
-- Ejecutar una sola vez en Supabase → SQL Editor (después de 001 y 002).
alter table public.productos add column if not exists receta jsonb;
