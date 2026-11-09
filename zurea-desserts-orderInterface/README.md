# Zuréa Desserts · Order Interface

Installable web app (PWA) for managing Zuréa Desserts' orders from Android tablets.

The app's interface is in Spanish; on-screen labels are quoted in *italics* below so you can find them.

- Board with 4 stages: **Pending → In preparation → Ready for delivery → Delivered**
  (*Pendiente → En preparación → Listo para entrega → Entregado*)
- Tabs per day (Today, Tomorrow and any other day with orders)
- Orders identified by **house number** or **name**
- Timer to start preparation (15 min by default, adjustable per order):
  at 50 % it turns yellow, animates and beeps; at 70 % it turns red and alerts every 20 s; alerts can be muted per order
- Scheduled orders: the timer starts 15 min (its duration) before delivery time
- Reminder email 5 h before orders for another day (if that falls between 9 pm and 7 am, it is sent at 9 pm the day before)
- Editable catalog
- Recipe book: one recipe per product (general and per-variety ingredients, steps and notes). With **Prepare** (*Preparar*)
  the ingredients become a checklist. Each order has a **Go to recipe book** (*Ir al recetario*) button; if the order has
  several products, it asks which one
- Supply inventory. **Countable** items (boxes, cans, bars…) alert at 3 or fewer; **weighed** items (lb, kg, liters…) alert
  when they drop below 25 % of the last purchase (both thresholds are adjustable per item). Alerts appear on the Orders page.
  Each recipe states how much it uses per batch; when preparation is finished, that amount is deducted from inventory
  (only once per order)
- Payment method (cash or bank transfer, optional). For cash: the amount paid and the change to give back, shown on the
  order card. Reports split cash and transfers
- Sales reports by day, week (Monday to Sunday), month or date range: total sold, by day, by product and the order list;
  they can be printed or downloaded as CSV for Excel. Only **delivered** orders count as sales, by delivery date

## Run it on this computer

```bash
npm install
npm run dev
```

Open http://localhost:5173. Without Supabase configured, it runs in **local mode** (data stays in that browser only).

### Beta version on the tablet (local network)

```bash
npm run beta
```

Builds the app and serves it on the local network. On the tablet (same Wi-Fi), open the *Network* address it prints,
for example `http://<computer-IP>:5173`. The computer must stay on with this command running.
In local mode the data lives **in the tablet's browser**: don't clear Chrome's browsing data, and always open the same
address (if the computer's IP changes, the app shows up empty at the new address).

**Backup:** in Settings → *Data backup* (*Ajustes → Respaldo de datos*), **Save backup** (*Guardar respaldo*) creates a
`zurea-respaldo-YYYY-MM-DD-HHMM.json` file in the tablet's Downloads folder; **Restore a backup** (*Restaurar un respaldo*)
loads it back (first saving a copy of the current data to Downloads). Saving one at the end of each day is a good habit.
Chrome's protection against data deletion only works over https.

The sample data used for testing is in the `Zuréa_6` checkpoint (`git checkout Zuréa_6` and open with `?demo`).

```bash
npm test       # tests for the timer and email rules
```

## Setup (shared between tablets)

### 1. Supabase (database)
1. Create an account and a project at https://supabase.com (suggested region: the closest one, e.g. *East US*).
2. **SQL Editor** → paste and run `supabase/migrations/001_inicial.sql`, then, in order, `003_recetas.sql`, `004_inventario.sql` and `005_pagos.sql`.
3. **Authentication → Users → Add user**: create a user (email and password) for each person.
   In **Authentication → Sign In / Providers**, turn off *Allow new users to sign up* so nobody else can register.
4. **Project Settings → API**: copy the *Project URL* and the *anon public key*.
5. Create a `.env.local` file (you can copy `.env.example`) with those two values.

### 2. Reminder emails (Resend)
1. Create an account at https://resend.com and generate an **API key**.
   - Without your own domain, Resend only lets you send **to the email address you signed up with**.
     To send to other addresses, verify a domain in Resend and set `AVISO_REMITENTE`, e.g. `Pedidos <avisos@yourdomain.com>`.
2. In Supabase, **Edge Functions → Deploy a new function → Via Editor**, name it `enviar-avisos`,
   paste `supabase/functions/enviar-avisos/index.ts` and deploy.
3. **Edge Functions → Secrets**: add `RESEND_API_KEY` (and `AVISO_REMITENTE` if you have a domain).
4. **SQL Editor**: edit `supabase/migrations/002_cron_avisos.sql` with your URL and anon key, and run it.

### 3. Deploy (Vercel)
1. Push this folder to a GitHub repository.
2. At https://vercel.com → *Add New Project* → pick the repository (Vercel detects Vite).
3. Under *Environment Variables*, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Vercel gives you an https address (e.g. `reposteria-pedidos.vercel.app`).

### 4. Install on each tablet
1. Open the address in **Chrome**.
2. Menu ⋮ → **Install app** (or *Add to Home screen*).
3. Open the app from its icon, sign in, and tap the screen once to enable sound.

For alerts to sound, the app must be **open on screen**. The app keeps the screen on while it is open;
it's best to leave the tablets plugged into their chargers.

## Structure

```
src/lib/reglas.ts          timer, alert levels and email scheduling
src/lib/reportes.ts        periods, sales totals and CSV export
src/lib/preparacion.ts     per-variety ingredients and checklist
src/lib/inventario.ts      alert levels, per-batch usage and stock movements
src/lib/useAlertas.ts      alert engine (animation + sound)
src/data/                  local mode and Supabase mode (real time)
src/components/            board, order card, form, catalog, settings
supabase/                  tables, email function and scheduled job
```

## Design

Taken from Zuréa's ads: navy background (`#0b1530` / `#0d1a36`) throughout the app, gold `#c79a5b` for rules and
accents, copper `#b5652a` for prices, ivory `#f7f0e3` and chocolate `#4e3020`. Each order is an ivory "label" with
clipped corners and an inner gold rule, like the price box in the ads; the catalog is a dessert menu with a dotted
line leading to the price. Headings in *Cormorant Garamond*, logo and subtitles in *Allura*, body text in
*Josefin Sans* (bundled with the project, so they work offline). The alert colors (yellow and red) are intentionally
different from the gold: when an order is in alert, the label's rule turns yellow or red and gets thicker.

To regenerate the icons after changing `scripts/icono.html`: `npm run iconos` (requires Google Chrome).
