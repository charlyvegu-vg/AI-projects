# Medical Equipment Maintenance

A mobile-first, offline-capable web app (PWA) for independent technicians who service medical equipment at clinics and hospitals. It keeps track of clients, equipment, preventive-maintenance due dates, jobs, payments, expenses and the real profit of every job, and it exports weekly and monthly reports to Excel and PDF.

The interface is in Spanish and designed for people who are not comfortable with technology: large buttons, plain-language questions, one "next step" button per job and details hidden until needed.

> **Status:** working prototype (phase 1 of 4). Data is stored only on the device; cloud sync is planned.

## Features

- **Clients and equipment**: each piece of equipment shows its next preventive-maintenance date as a color-coded service tag (overdue / due soon / up to date). The date is recalculated automatically every time a job is completed.
- **Clients to call**: equipment due within *N* days (configurable, 15 by default), grouped by client, with a one-tap pre-filled WhatsApp message.
- **Jobs**: preventive or corrective, normal or urgent, with the status flow *requested → scheduled → done → paid*. You can log a job in under a minute.
- **Payments**: cash, bank transfer or check (pending / cashed / bounced), with partial payments, references and invoice numbers.
- **Expenses and profit**: travel costs, materials, unexpected costs and labor (hours × configurable hourly rate). Each job shows a traffic light: profit, low margin or loss.
- **Reports**: weekly or monthly summaries of completed jobs, downloadable as **Excel (.xlsx)** and **PDF**.
- **Offline first**: after the first visit the app works without internet, including report generation.
- **Backup and restore**: the full database can be exported to and imported from a JSON file.
- **Demo data**: one tap loads fictional clinics, so you can explore the app.

## Tech stack

| Area | Choice |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS 4 |
| Build | Vite |
| Offline / install | `vite-plugin-pwa` (Workbox service worker, web manifest) |
| Local database | Dexie (IndexedDB) |
| Excel export | `write-excel-file` (write-only, no file parsing) |
| PDF export | `jspdf` + `jspdf-autotable` |
| Font | Atkinson Hyperlegible, bundled locally |

## Getting started

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev        # development server at http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build at http://localhost:4173
```

To try it on a phone on the same network, run `npm run dev` (or `npm run preview`) and open the `Network:` URL that Vite prints.

### Offline install on a phone

Service workers only run in a secure context (HTTPS or `localhost`). To install the app on a phone:

- **Recommended:** deploy `dist/` to any static host with HTTPS (for example Vercel or Netlify), open it on the phone and choose *Install app* / *Add to Home screen*.
- **Local network only (Android, for testing):** in Chrome, open `chrome://flags`, enable *Insecure origins treated as secure* for your computer's `http://<LAN-IP>:4173` address, relaunch Chrome, open that address and install the app.

## Project structure

```
src/
  db.ts                 Data model and IndexedDB schema (Dexie)
  lib/
    calc.ts             Next service date, profit, margin and traffic light
    consultas.ts        Clients to call, amounts receivable
    reporte.ts          Weekly / monthly report data
    exportar.ts         Excel and PDF generation
    whatsapp.ts         Pre-filled WhatsApp messages
    demo.ts             Fictional demo data
    format.ts           Quetzal currency, dd/mm/yyyy dates, America/Guatemala time zone
  components/           UI building blocks (service tag, job row, bottom sheet, icons…)
  pages/                One file per screen
```

## Privacy and security

- **No server, no tracking:** all data is stored in the browser's IndexedDB on the user's device. The app makes no network requests to third parties, and it has no analytics, ads or external fonts or scripts.
- **Content Security Policy:** production builds include a strict CSP that only allows the app's own scripts and resources. `vercel.json` adds equivalent HTTP headers (CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS).
- **Safe dependencies:** `npm audit --omit=dev` reports no known vulnerabilities in the shipped code. Excel files are only written, never parsed.
- **Validated imports:** backup files are size-limited and checked against the known table names before anything is written.
- **No secrets in the repo:** `.env` files and exported backups or reports are git-ignored.
- **Demo data is fictional:** all clinic names, people, phone numbers (`1000 00xx`) and emails (`@ejemplo.com`) are made up.

The data stays on the device, so clear the browser's site data on shared devices, and keep exported backups somewhere safe: they contain client and financial information.

## Roadmap

1. ~~Clients, equipment, jobs, payments, expenses, profit per job, clients to call~~ ✅
2. Cloud sync (Supabase) across phone and computer, calendar view, overlap warnings, grouping visits by region, shared travel costs across jobs, historical jobs and CSV import, `.ics` export
3. More reports (by client, by region, preventive vs. corrective, clients at risk) and daily push reminders
4. Receipt photos and full offline sync polish
