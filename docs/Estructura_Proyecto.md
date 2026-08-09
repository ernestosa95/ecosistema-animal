# 📁 Estructura del proyecto — Ecosistema de Salud Animal

Organización en **monorepo**: una sola raíz con las aplicaciones (`apps/`) y, a futuro, código compartido (`packages/`). El tronco común (`core`) se escribe una vez y lo reutilizan todas las soluciones.

Gestor de workspaces: **pnpm workspaces** (también funciona con npm workspaces).

**Última actualización:** agosto 2026. Leyenda: ✅ existe · ⏳ planeado.

---

## 🌳 Vista general (estado actual)

```
ecosistema/
├── apps/
│   ├── backend/            # ✅ API NestJS — todo el ecosistema (un solo backend)
│   ├── web/                # ✅ React + Vite (panel de gestión)
│   └── mobile/             # ⏳ React Native + Expo (offline-first)
│
├── packages/               # ⏳ código compartido (shared-types, validation) — aún no creado
│
├── db/
│   ├── schema/
│   │   └── esquema_ecosistema.sql   # ✅ DDL de referencia (todos los schemas)
│   └── migrations/         # ✅ generadas con drizzle-kit (0000_*.sql + meta/)
│
├── docs/                   # ✅ Documentación (.md)
│   ├── Roadmap_Ecosistema.md
│   ├── Tropera_Alcace.md
│   ├── Estructura_Proyecto.md
│   └── CHANGELOG.md
│
├── package.json            # ✅ raíz del monorepo
└── pnpm-workspace.yaml     # ✅
```

---

## 🧩 `apps/backend` — API NestJS ✅

Cada **módulo de NestJS = una carpeta**, agrupados por el **schema de base** al que pertenecen. Las tablas Drizzle viven en `database/schema/` (espejo del `.sql`) y los módulos las importan.

**ORM:** Drizzle (SQL-first, multi-schema). Migraciones con `drizzle-kit`.

```
apps/backend/
├── src/
│   ├── main.ts                       # ✅ Bootstrap (ValidationPipe, CORS)
│   ├── app.module.ts                 # ✅ Módulo raíz (registra todos los módulos)
│   │
│   ├── common/
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts      # ✅ Autenticación (Bearer)
│   │   │   ├── tenant.guard.ts        # ✅ Aísla por organizacion_id (multi-tenant)
│   │   │   └── roles.guard.ts         # ✅ Autorización por rol de membresía
│   │   └── decorators/
│   │       ├── current-context.decorator.ts  # ✅ @CurrentUser / @CurrentOrg
│   │       └── roles.decorator.ts             # ✅ @Roles(...)
│   │
│   ├── config/
│   │   └── configuration.ts          # ✅ Carga de entorno (driver de base, jwt, etc.)
│   │
│   ├── database/
│   │   ├── drizzle.provider.ts        # ✅ Provider DRIZZLE (dev PGlite / prod Postgres)
│   │   └── schema/
│   │       ├── core.ts                # ✅ organizaciones, usuarios, membresías, personas, especies, animales
│   │       ├── hce.ts                 # ✅ consultas, vacunaciones, turnos
│   │       └── index.ts               # ✅ punto único de import de schemas
│   │
│   ├── core/                          # === SCHEMA core ===
│   │   ├── auth/                      # ✅ registro, login, JWT (exporta JwtService)
│   │   ├── especies/                  # ✅ catálogo (GET /especies)
│   │   ├── personas/                  # ✅ dueños (CRUD: crear, listar, obtener, actualizar, /animales)
│   │   ├── animales/                  # ✅ pacientes + codigo-legible.util (CRUD, datosEspecificos JSONB)
│   │   │   └── dto/                   # ✅ create-animal.dto.ts, update-animal.dto.ts
│   │   └── usuarios/                  # ✅ miembros de la org (GET /usuarios) — para asignar turnos
│   │
│   └── hce/                           # === SCHEMA hce ===
│       ├── consultas/                 # ✅ historia clínica (CRUD por animal)
│       ├── vacunaciones/              # ✅ registro + recordatorios
│       ├── turnos/                    # ✅ turnero (agenda, estados, veterinarioId)
│       └── carnet/                    # 🟡 PDF del paciente (@react-pdf/renderer) — hoy con datos mock
│
├── scripts/
│   └── init-local-db.mjs             # ✅ crea/siembra la base local (PGlite): especies, etc.
├── test/                             # ✅ demos de flujo contra PGlite real
├── drizzle.config.ts                 # ✅
├── .env.example                      # ✅
└── package.json                      # ✅
```

> Los módulos que usan guards (`JwtAuthGuard`) deben importar `AuthModule` (que exporta `JwtService`). Ej.: `usuarios`, `animales`, `turnos`.

---

## 💻 `apps/web` — React + Vite ✅

Panel de gestión. **CSS propio** (sin framework de estilos). El estado real hoy es por páginas (`pages/`), no por features. La sesión se registra desde `App.tsx` y alimenta a los clientes de API.

```
apps/web/
├── src/
│   ├── main.tsx                      # ✅ punto de entrada
│   ├── App.tsx                       # ✅ navegación (Turnos / Animales / Dueños) + sesión + home según rol
│   ├── styles.css                    # ✅ estilos propios
│   ├── api/
│   │   ├── client.ts                 # ✅ cliente HTTP (token + X-Organizacion-Id)
│   │   ├── turnos.ts                 # ✅ cliente de turnos + alta rápida de paciente + profesionales + resumen mensual
│   │   └── types.ts                  # ✅ tipos (Sesion, Animal, Persona, Especie, Consulta)
│   ├── auth/
│   │   └── useSesion.ts              # ✅ sesión persistente (localStorage)
│   ├── config/
│   │   └── especieDatos.ts           # ✅ catálogo editable de campos por especie (datosEspecificos)
│   ├── components/
│   │   └── CamposEspecie.tsx         # ✅ inputs dinámicos según la especie
│   └── pages/
│       ├── LoginPage.tsx             # ✅ login + registro
│       ├── TurnosPage.tsx            # ✅ agenda diaria + calendario del mes + alta desde mostrador (con alta de paciente inline)
│       ├── PacientesPage.tsx         # ✅ sección "Animales": lista + alta (con dueño)
│       ├── PacienteDetallePage.tsx   # ✅ ficha + historia clínica + edición + datos por especie + carnet
│       └── PersonasPage.tsx          # ✅ dueños: lista, alta, edición, ver animales
├── index.html                        # ✅
├── vite.config.ts                    # ✅
├── tsconfig.json                     # ✅
├── .env.example                      # ✅ VITE_API_URL
└── package.json                      # ✅
```

> La app le pega al backend vía `VITE_API_URL` (por defecto `http://localhost:3000`). El backend tiene CORS habilitado.

---

## 📱 `apps/mobile` — React Native + Expo ⏳

Aún no creada. Cuando se construya, el corazón será `model/` (base local) y `db/sync.ts` (pull/push contra el backend). La decisión WatermelonDB vs Expo SQLite se tomará en ese momento.

---

## 📦 `packages/` — código compartido ⏳

Aún no creado. La idea: `shared-types` (tipos/DTOs backend↔frontends) y `validation` (esquemas reutilizables). Hoy los tipos de la web viven en `apps/web/src/api/types.ts`.

---

## 🗄️ `db/` — base de datos ✅

* **schema/**: `esquema_ecosistema.sql`, DDL de referencia con todos los schemas del ecosistema.
* **migrations/**: generadas con `drizzle-kit generate` a partir de los schemas Drizzle (`0000_*.sql` + carpeta `meta/`). Se aplican con `drizzle-kit migrate` (prod) o con el script `init-local-db.mjs` (dev/PGlite).
* **seeds**: hoy las especies base se siembran desde `apps/backend/scripts/init-local-db.mjs`.

---

## 🔗 Cómo se conecta todo (hoy)

1. **Backend** (`apps/backend`, puerto 3000): API + base. En dev usa PGlite (sin instalar Postgres); en prod, Postgres real vía `DATABASE_URL`.
2. **Web** (`apps/web`, puerto 5173): consume la API con el token y el header `X-Organizacion-Id`. La sesión (`{ token, organizacionId, rol }`) se registra en `App.tsx` y de ahí la toman `api/client.ts` y `api/turnos.ts`.
3. **Offline (planeado):** las tablas ya tienen `updated_at`/`deleted_at`; falta el módulo `sync` y la app móvil.

---

## 🧭 Convenciones

* **Un módulo NestJS por carpeta**, agrupado por schema (`core/`, `hce/`, …).
* **Datos por especie:** se definen en `apps/web/src/config/especieDatos.ts` (frontend) y se guardan en `animales.datos_especificos` (JSONB). Agregar/quitar campos ahí alcanza para que aparezcan en alta, edición y ficha.
* **Roles:** `propietario`, `admin`, `capataz`, `veterinario`, `recepcion`. La organización viaja siempre en el header, nunca en el body.
