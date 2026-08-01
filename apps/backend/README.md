# Backend — Ecosistema de Salud Animal

API NestJS del ecosistema. Un solo backend para todas las soluciones (core, HCE, etc.).

## Requisitos
- Node.js 18+ (probado con 20/22)
- pnpm (o npm)

## Puesta en marcha (desarrollo local, sin instalar Postgres)

Usa **PGlite** (Postgres embebido). No hace falta instalar ni configurar una base.

1. Instalar dependencias (desde la raíz del monorepo):
   ```
   pnpm install
   ```
2. Crear el archivo `.env` en `apps/backend/` (o en la raíz) a partir de `.env.example`, con:
   ```
   DATABASE_DRIVER=pglite
   DATABASE_PATH=./pgdata
   JWT_SECRET=un-secreto-cualquiera-para-dev
   PORT=3000
   ```
3. Generar migraciones (si cambiaste el schema) e inicializar la base local:
   ```
   pnpm --filter backend db:generate     # genera db/migrations desde el schema Drizzle
   pnpm --filter backend db:local-init    # crea ./pgdata, aplica migraciones y siembra especies
   ```
4. Levantar el backend:
   ```
   pnpm --filter backend start:dev
   ```
   Queda en `http://localhost:3000`.

## Puesta en marcha (producción / VM con Postgres real)

En el `.env`:
```
DATABASE_DRIVER=node-postgres
DATABASE_URL=postgresql://usuario:password@host:5432/ecosistema
JWT_SECRET=...
```
Luego aplicar migraciones contra esa base:
```
pnpm --filter backend db:migrate
pnpm --filter backend build && pnpm --filter backend start:prod
```

## Prueba rápida por HTTP (con el server levantado)

```bash
# Registro
curl -X POST http://localhost:3000/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"ana@clinica.com","password":"claveSegura123","nombre":"Ana","apellido":"Vet","nombreOrganizacion":"Clínica del Sur"}'

# Login (guardá accessToken y organizacionId de la respuesta)
curl -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ana@clinica.com","password":"claveSegura123"}'

# Especies (reemplazá TOKEN)
curl http://localhost:3000/especies -H "Authorization: Bearer TOKEN"

# Crear paciente (reemplazá TOKEN, ORG y ESPECIE_ID)
curl -X POST http://localhost:3000/animales \
  -H "Authorization: Bearer TOKEN" -H "X-Organizacion-Id: ORG" -H 'Content-Type: application/json' \
  -d '{"nombre":"Firulais","especieId":"ESPECIE_ID","sexo":"macho"}'
```

## Demos de flujo (contra Postgres embebido, no requieren base)
```
pnpm --filter backend test:auth-demo
pnpm --filter backend test:animales-demo
pnpm --filter backend test:personas-demo
pnpm --filter backend test:hce-demo
pnpm --filter backend test:vacunas-demo
pnpm --filter backend test:turnos-demo
```
