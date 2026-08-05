# Estructura del Proyecto — Ecosistema de Salud Animal

Monorepo **pnpm** con dos apps (backend + web) y la base de datos versionada.
Vertical activa: **Huella** (Historia Clínica Electrónica animal). Próxima vertical: **Tropera** (ganadería).

```
ecosistema/
├── package.json                 # scripts raíz: dev (concurrently), backend:dev, web:dev, db:*
├── pnpm-workspace.yaml          # packages: apps/*, packages/*
├── dev.sh                       # alternativa sin deps para levantar back+front juntos
├── apps/
│   ├── backend/                 # NestJS + Drizzle (name: "backend")
│   └── web/                     # React + Vite, CSS propio (name: "web")
└── db/
    ├── schema/esquema_ecosistema.sql   # esquema maestro (referencia)
    └── migrations/                     # 0000_stormy_domino, 0001_solicitudes, 0002_org_activo
```

## Backend (`apps/backend/src`)

```
main.ts                          # bootstrap + ValidationPipe + CORS + DbErrorFilter (uuid→404)
app.module.ts                    # registra todos los módulos
config/configuration.ts          # port, jwt, database
database/
  drizzle.provider.ts            # token DRIZZLE (inyección global)
  database.module.ts             # @Global
  schema/{core,hce}.ts + index.ts
common/
  guards/{jwt-auth, tenant, roles, super-admin, portal}.guard.ts
  decorators/{current-context, roles}.ts
  filters/db-error.filter.ts     # traduce uuid inválido en 404
core/
  auth/         # register (auto-registro real: ver solicitudes), login, JWT { sub, email }
  especies/     # datos de referencia (seed en init-local-db)
  personas/     # dueños. dedup por DNI dentro de la organización
  animales/     # dedup por microchip. listar/obtener/crear/actualizar
hce/
  consultas/    # clínico (rol veterinario+)
  vacunaciones/ # clínico (rol veterinario+)
  turnos/       # agenda con join (paciente/especie/dueño); estados con máquina
  carnet/       # PDF con @react-pdf/renderer (endpoint protegido)
portal/         # portal del dueño: acceso por magic-link (token), resumen, solicitar turno
admin/          # super-admin de plataforma: veterinarias + miembros + ciclo de vida
solicitudes/    # auto-registro con aprobación (público + bandeja admin)
```

### Modelo de acceso (guards)
- **JwtAuthGuard** → token válido (`{ sub, email }`).
- **TenantGuard** → membresía activa en la organización (`X-Organizacion-Id`) **y** organización activa. Setea `req.rol`.
- **RolesGuard** + `@Roles(...)` → matriz de permisos por rol (escrituras).
- **SuperAdminGuard** → email en `SUPERADMIN_EMAILS` (panel `/admin`).
- **PortalGuard** → token de dueño en header `X-Portal-Token`.

### Roles (`core.rol_membresia`)
`propietario`, `admin`, `veterinario`, `recepcion` (administrativa), `capataz` (campo/Tropera).

## Web (`apps/web/src`)

```
main.tsx                # ruteo por URL: /admin → AdminPage · ?token → PortalDuenoPage · resto → App
App.tsx                 # nav por estado: Animales / Agenda / Dueños
auth/
  useSesion.ts          # sesión en localStorage 'ecosistema.sesion' { token, organizacionId, rol }
  permisos.ts           # puede(rol, accion) — espejo de la matriz para ocultar botones
api/
  client.ts, types.ts   # cliente base (token + X-Organizacion-Id)
  turnos.ts, portal.ts  # clientes de vertical (USAR_MOCK=false = datos reales)
  admin.ts, solicitudes.ts
pages/
  LoginPage             # login + "Solicitar acceso" (auto-registro)
  PacientesPage/AnimalesPage, PacienteDetallePage
  PersonasPage (Dueños), TurnosPage (Agenda)
  AdminPage (panel de plataforma), PortalDuenoPage (portal del dueño)
```

## Base de datos
- Local: **PGlite** (sin instalar Postgres). Init: `pnpm db:local-init` aplica migraciones + siembra especies.
- Cambios de esquema incrementales: script `apply-*.mjs` (idempotente) para no perder datos en dev.
- Producción futura: Postgres real en VM Oracle Always Free (`DATABASE_DRIVER=node-postgres`).

## Cómo correr
```bash
pnpm install
cd apps/backend && node scripts/apply-*.mjs   # aplicar migraciones incrementales si hiciste pull
pnpm dev                                        # backend (3000) + web (5173) juntos
```
