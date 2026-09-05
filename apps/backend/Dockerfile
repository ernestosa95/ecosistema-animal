# Build multi-stage: compila con pnpm en la etapa "builder", la imagen final
# sólo copia lo necesario para correr (dist + node_modules del monorepo).
# Ver docs/Plan_Despliegue.md para el porqué de copiar el node_modules
# entero (hoisted) en vez de un subset "sólo backend en prod".
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter backend build

FROM node:20-alpine
WORKDIR /app
# corepack necesita el package.json de la raíz (con el campo
# "packageManager") presente para resolver la MISMA versión de pnpm pineada
# en vez de intentar bajar la última — sin esto, `docker compose exec
# backend pnpm --filter backend db:migrate` (sección 5 del plan de
# despliegue) rompe al no encontrar ningún pin y salir a buscar la última
# versión de pnpm, que ya no corre en Node 20.
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
RUN corepack enable
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend ./apps/backend
COPY --from=builder /app/db ./db
WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
