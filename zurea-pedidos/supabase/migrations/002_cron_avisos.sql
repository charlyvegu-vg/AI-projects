-- Revisa cada 5 minutos si hay correos de aviso por enviar.
-- Antes de ejecutar, reemplaza TU-PROYECTO y TU_ANON_KEY (Project Settings → API).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'enviar-avisos',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://TU-PROYECTO.supabase.co/functions/v1/enviar-avisos',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer TU_ANON_KEY'),
    body := '{}'::jsonb
  );
  $$
);
