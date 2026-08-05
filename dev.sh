#!/usr/bin/env bash
# Levanta backend + frontend juntos. Ctrl+C corta ambos.
# Uso: ./dev.sh   (desde la raíz del repo)

cd "$(dirname "$0")"

echo "▶ Iniciando backend (puerto 3000) y frontend (puerto 5173)…"
pnpm --filter backend start:dev &
BACK=$!
pnpm --filter web dev &
FRONT=$!

# Al cortar (Ctrl+C) o salir, mata ambos procesos.
trap 'echo; echo "⏹ Cerrando…"; kill "$BACK" "$FRONT" 2>/dev/null' INT TERM EXIT

wait
