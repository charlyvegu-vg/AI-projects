#!/bin/sh
# Genera los íconos PNG a partir de scripts/icono.html usando Chrome sin pantalla.
set -e
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"
captura() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$TMP" --default-background-color=00000000 \
  --window-size=512,512 --virtual-time-budget=2000 --screenshot="$1" "file://$PWD/scripts/icono.html$2" 2>/dev/null; }
captura public/icono-512.png ''
captura public/icono-maskable-512.png '#maskable'
sips -z 192 192 public/icono-512.png --out public/icono-192.png >/dev/null
rm -rf "$TMP"
echo "Íconos generados"
