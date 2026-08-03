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
│   └── Estructura_Proyecto.md
│
├── package.json            # ✅ raíz del monorepo
└── pnpm-workspace.yaml      # ✅
```

---

## 🧩 `apps/backend` — API NestJS ✅

Cada **módulo de NestJS = una carpeta**, agrupados por el **schema de base** al que pertenecen. Las tablas Drizzle viven en `database/schema/` (espejo del `.sql`) y los módulos las importan.

**ORM:** Drizzle (SQL-first, multi-schema). Migraciones con `drizzle-kit`.

```
apps/backend/
├── src/
│   ├── main.ts                       # ✅ Bootstrap (ValidationPipe, CORS)
│   ├── app.module.ts                 # ✅ Módulo raíz
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
│   │   ├── database.module.ts        # ✅ Módulo global
│   │   ├── drizzle.provider.ts        # ✅ Driver configurable: pglite (dev) | node-postgres (prod)
│   │   └── schema/
│   │       ├── core.ts               # ✅
│   │       ├── hce.ts                # ✅ (consultas, vacunaciones, turnos)
│   │       ├── index.ts              # ✅ re-exporta los schemas
│   │       ├── tropera.ts            # ⏳
│   │       ├── farmacia.ts           # ⏳
│   │       ├── stock.ts              # ⏳
│   │       └── facturacion.ts        # ⏳
│   │
│   ├── core/                         # === SCHEMA core ===
│   │   ├── auth/                     # ✅ registro, login, JWT (+ crea org y membresía)
│   │   ├── especies/                # ✅ catálogo (GET /especies)
│   │   ├── personas/                # ✅ dueños (CRUD: crear, listar, obtener, actualizar, /animales)
│   │   └── animales/                # ✅ pacientes + codigo-legible.util (CRUD)
│   │       # (usuarios/organizaciones/membresías son tablas del core,
│   │       #  gestionadas vía auth; no tienen módulo propio todavía)
│   │
│   ├── hce/                          # === SCHEMA hce ===
│   │   ├── hce.module.ts             # ✅
│   │   ├── consultas/                # ✅
│   │   ├── vacunaciones/             # ✅ (+ recordatorios)
│   │   └── turnos/                   # ✅
│   │
│   ├── tropera/                      # ⏳ === SCHEMA tropera ===
│   ├── farmacia/                     # ⏳
│   ├── stock/                        # ⏳
│   ├── facturacion/                  # ⏳
│   └── sync/                         # ⏳ endpoints pull/push (offline)
│
├── scripts/
│   └── init-local-db.mjs             # ✅ crea la base PGlite local, aplica migración y siembra especies
├── test/                             # ✅ demos de flujo (auth, animales, personas, hce, vacunas, turnos)
├── drizzle.config.ts                 # ✅
├── nest-cli.json                     # ✅
├── tsconfig.json                     # ✅
├── .env / .env.example               # ✅
├── README.md                         # ✅ cómo levantar (dev con PGlite / prod con Postgres)
└── package.json                      # ✅
```

### Anatomía de un módulo (ejemplo real: `core/animales`) ✅

```
core/animales/
├── animales.module.ts
├── animales.controller.ts      # Rutas HTTP (GET/POST/PATCH)
├── animales.service.ts         # Lógica (incl. generación de codigo_legible)
├── codigo-legible.util.ts      # Algoritmo de ID (Luhn) + microchip ISO
├── codigo-legible.util.spec.ts # Tests del algoritmo
└── dto/
    ├── create-animal.dto.ts
    └── update-animal.dto.ts
```

---

## 💻 `apps/web` — React + Vite ✅

Panel de gestión. **CSS propio** (sin framework de estilos). El estado real hoy es por páginas (`pages/`), no por features.

```
apps/web/
├── src/
│   ├── main.tsx                      # ✅ punto de entrada
│   ├── App.tsx                       # ✅ navegación (Pacientes / Dueños) + sesión
│   ├── styles.css                    # ✅ estilos propios
│   ├── api/
│   │   ├── client.ts                 # ✅ cliente HTTP (token + X-Organizacion-Id)
│   │   └── types.ts                  # ✅ tipos (Sesion, Animal, Persona, Especie, Consulta)
│   ├── auth/
│   │   └── useSesion.ts              # ✅ sesión persistente (localStorage)
│   └── pages/
│       ├── LoginPage.tsx             # ✅ login + registro
│       ├── PacientesPage.tsx         # ✅ lista + alta (con dueño)
│       ├── PacienteDetallePage.tsx   # ✅ ficha + historia clínica + edición
│       └── PersonasPage.tsx          # ✅ dueños: lista, alta, edición, ver mascotas
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
2. **Web** (`apps/web`, puerto 5173): consume la API con el token y el header `X-Organizacion-Id`.
3. **Offline (planeado):** las tablas ya tienen `updated_at`/`deleted_at`; falta el módulo `sync` y la app móvil.
