// Envía el correo de aviso de los pedidos programados cuya hora de aviso ya llegó.
// Se ejecuta cada 5 minutos (ver supabase/migrations/002_cron_avisos.sql).
// Variables necesarias: RESEND_API_KEY y, opcional, AVISO_REMITENTE.
import { createClient } from 'npm:@supabase/supabase-js@2'

const ZONA = 'America/Guatemala'
const fmt = new Intl.DateTimeFormat('es-GT', {
  timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true,
})
const q = (n: number) => `Q${Number(n).toLocaleString('es-GT')}`
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

interface Linea { nombre: string; variedad: string | null; cantidad: number; precio: number }

Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const remitente = Deno.env.get('AVISO_REMITENTE') ?? 'Pedidos Repostería <onboarding@resend.dev>'
  if (!resendKey) return Response.json({ error: 'Falta RESEND_API_KEY' }, { status: 500 })

  const { data: ajustes } = await sb.from('ajustes').select('correos').eq('id', 1).maybeSingle()
  const correos: string[] = ajustes?.correos ?? []
  if (!correos.length) return Response.json({ enviados: 0, motivo: 'sin correos' })

  const { data: pedidos, error } = await sb.from('pedidos').select('*')
    .eq('aviso_enviado', false).not('aviso_en', 'is', null)
    .lte('aviso_en', new Date().toISOString()).neq('fase', 'entregado')
  if (error) return Response.json({ error: error.message }, { status: 500 })

  let enviados = 0
  for (const p of pedidos ?? []) {
    // Se marca antes de enviar para no mandar dos veces si el cron se traslapa.
    const { data: tomado } = await sb.from('pedidos').update({ aviso_enviado: true })
      .eq('id', p.id).eq('aviso_enviado', false).select('id')
    if (!tomado?.length) continue

    const cliente = [p.casa && `Casa ${p.casa}`, p.cliente].filter(Boolean).join(' · ')
    const entrega = fmt.format(new Date(p.entrega_en))
    const lineas = (p.lineas as Linea[]).map((l) =>
      `<li><b>${l.cantidad}×</b> ${esc(l.nombre)}${l.variedad ? ` (${esc(l.variedad.toLowerCase())})` : ''}</li>`).join('')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: remitente,
        to: correos,
        subject: `Recordatorio: pedido #${p.numero} – ${cliente} – ${entrega}`,
        html: `
          <h2 style="color:#8e3c51">Pedido #${p.numero} – ${esc(cliente)}</h2>
          <p><b>Entrega:</b> ${entrega}</p>
          <ul>${lineas}</ul>
          ${p.notas ? `<p><b>Notas:</b> ${esc(p.notas)}</p>` : ''}
          <p><b>Total:</b> ${q(p.total)}</p>`,
      }),
    })
    if (res.ok) enviados++
    else {
      console.error('Resend', p.id, res.status, await res.text())
      await sb.from('pedidos').update({ aviso_enviado: false }).eq('id', p.id) // se reintenta en 5 min
    }
  }
  return Response.json({ enviados })
})
