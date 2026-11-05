# Zuréa Desserts · Pedidos

App web instalable (PWA) para manejar los pedidos de Zuréa Desserts desde tablets Android.

- Tablero con 4 fases: **Pendiente → En preparación → Listo para entrega → Entregado**
- Pestañas por día (Hoy, Mañana y otros días con pedidos)
- Pedidos por **número de casa** o **nombre**
- Temporizador para iniciar la preparación (15 min por defecto, ajustable por pedido):
  50 % amarillo + animación + "bip bip"; 70 % rojo + alerta cada 20 s; botón para silenciar por pedido
- Pedidos programados: el temporizador arranca 15 min (su duración) antes de la entrega
- Correo de aviso 5 h antes para pedidos de otro día (si cae entre 9 pm y 7 am, se envía a las 9 pm del día anterior)
- Catálogo editable
- Recetario: una receta por producto (ingredientes generales y por variedad, pasos y notas). Con **Preparar** los
  ingredientes se vuelven una lista para tachar. Cada pedido tiene **Ir al recetario**; si tiene varios productos,
  pregunta cuál
- Inventario de insumos. **Contables** (cajas, latas, barras…) avisan con 3 o menos; **pesados** (lb, kg, litros…) avisan
  al bajar del 25 % de la última compra (los dos se ajustan por insumo). Las alertas salen en la página de Pedidos.
  Cada receta indica cuánto gasta por tanda; al terminar de preparar se descuenta del inventario (una sola vez por pedido)
- Forma de pago (efectivo o transferencia, opcional). En efectivo: con cuánto paga y el cambio a dar; se ve en la tarjeta
  del pedido. Los reportes separan efectivo y transferencia
- Reportes de ventas por día, semana (lunes a domingo), mes o rango de fechas: total vendido, por día, por producto y
  lista de pedidos; se puede imprimir o descargar en CSV para Excel. Cuentan como venta los pedidos **entregados**,
  según su fecha de entrega

## Probar en esta computadora

```bash
npm install
npm run dev
```

Abre http://localhost:5173. Sin Supabase configurado funciona en **modo local** (datos solo en ese navegador).
### Versión beta en la tablet (red local)

```bash
npm run beta
```

Compila la app y la sirve en la red del local. En la tablet (mismo wifi) abre la dirección *Network* que aparece,
por ejemplo `http://<IP-de-la-computadora>:5173`. La computadora debe quedar encendida y con este comando corriendo.
En modo local los datos viven **en el navegador de la tablet**: no borres los datos de navegación de Chrome y abre
siempre la misma dirección (si la IP de la computadora cambia, la app aparece vacía en la dirección nueva).

**Respaldo:** en Ajustes → *Respaldo de datos*, **Guardar respaldo** crea un archivo `zurea-respaldo-AAAA-MM-DD-HHMM.json`
en Descargas de la tablet; **Restaurar un respaldo** lo vuelve a cargar (antes guarda en Descargas una copia de lo que había).
Conviene guardar uno al final de cada día. La protección de Chrome contra borrado de datos solo funciona con https.

Los datos de ejemplo de las pruebas están en el checkpoint `Zuréa_6` (`git checkout Zuréa_6` y abrir con `?demo`).

```bash
npm test       # pruebas de las reglas del temporizador y del correo
```

## Puesta en marcha (compartida entre tablets)

### 1. Supabase (base de datos)
1. Crea una cuenta y un proyecto en https://supabase.com (región sugerida: la más cercana, p. ej. *East US*).
2. **SQL Editor** → pega y ejecuta `supabase/migrations/001_inicial.sql` y luego, en orden, `003_recetas.sql`, `004_inventario.sql` y `005_pagos.sql`.
3. **Authentication → Users → Add user**: crea un usuario (correo y contraseña) para cada persona.
   En **Authentication → Sign In / Providers** desactiva *Allow new users to sign up* para que nadie más pueda registrarse.
4. **Project Settings → API**: copia la *Project URL* y la *anon public key*.
5. Crea el archivo `.env.local` (puedes copiar `.env.example`) con esos dos valores.

### 2. Correos de aviso (Resend)
1. Crea una cuenta en https://resend.com y genera una **API key**.
   - Sin dominio propio, Resend solo permite enviar **al correo con el que creaste la cuenta**.
     Para enviar a otros correos, verifica un dominio en Resend y define `AVISO_REMITENTE`, p. ej. `Pedidos <avisos@tudominio.com>`.
2. En Supabase, **Edge Functions → Deploy a new function → Via Editor**, nombre `enviar-avisos`,
   pega `supabase/functions/enviar-avisos/index.ts` y despliega.
3. **Edge Functions → Secrets**: agrega `RESEND_API_KEY` (y `AVISO_REMITENTE` si tienes dominio).
4. **SQL Editor**: edita `supabase/migrations/002_cron_avisos.sql` con tu URL y anon key, y ejecútalo.

### 3. Publicar (Vercel)
1. Sube esta carpeta a un repositorio de GitHub.
2. En https://vercel.com → *Add New Project* → elige el repositorio (Vercel detecta Vite).
3. En *Environment Variables* agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Vercel te da una dirección https (p. ej. `reposteria-pedidos.vercel.app`).

### 4. Instalar en cada tablet
1. Abre la dirección en **Chrome**.
2. Menú ⋮ → **Instalar app** (o *Agregar a pantalla de inicio*).
3. Abre la app desde el ícono, inicia sesión y toca la pantalla una vez para activar el sonido.

Para que suenen las alertas, la app debe estar **abierta en pantalla**. La app mantiene la pantalla encendida
mientras está abierta; conviene dejar las tablets conectadas al cargador.

## Estructura

```
src/lib/reglas.ts          temporizador, niveles de alerta y cálculo del correo
src/lib/reportes.ts        periodos, totales de ventas y exportación CSV
src/lib/preparacion.ts     ingredientes por variedad y lista para tachar
src/lib/inventario.ts      niveles de alerta, consumo por tanda y movimientos
src/lib/useAlertas.ts      motor de alertas (animación + sonido)
src/data/                  modo local y modo Supabase (tiempo real)
src/components/            tablero, tarjeta, formulario, catálogo, ajustes
supabase/                  tablas, función de correo y tarea programada
```

## Diseño

Tomado de los anuncios de Zuréa: fondo azul marino (`#0b1530` / `#0d1a36`) en toda la app, dorado `#c79a5b` para filetes
y acentos, cobre `#b5652a` para los precios, marfil `#f7f0e3` y chocolate `#4e3020`. Cada pedido es una "etiqueta" marfil
con esquinas recortadas y filete dorado interior, como el recuadro de precio de los anuncios; el catálogo es una carta de
postres con línea punteada hasta el precio. Títulos en *Cormorant Garamond*, logotipo y subtítulos en *Allura*, texto en
*Josefin Sans* (incluidas en el proyecto, funcionan sin internet). Los colores de alerta (amarillo y rojo) son distintos
del dorado a propósito: en alerta, el filete de la etiqueta se vuelve amarillo o rojo y más grueso.

Para regenerar los íconos después de cambiar `scripts/icono.html`: `npm run iconos` (requiere Google Chrome).
