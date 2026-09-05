# El build de Vite queda horneado adentro de la imagen — no hay ningún paso
# de build separado en el host. VITE_API_URL es un ARG de build, no una
# variable de runtime: cambiarlo implica reconstruir esta imagen, no alcanza
# con reiniciar el contenedor (ver docs/Plan_Despliegue.md).
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter web build

FROM caddy:2-alpine
COPY --from=builder /app/apps/web/dist /srv
COPY apps/web/Caddyfile.prod /etc/caddy/Caddyfile
