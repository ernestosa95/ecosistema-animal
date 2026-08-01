# 📁 Estructura del proyecto — Ecosistema de Salud Animal

Organización en **monorepo**: una sola raíz con las aplicaciones (`apps/`) y el código compartido (`packages/`). El tronco común (`core`) y los tipos se escriben una vez y los reutilizan tanto Tropera como la HCE, en backend, móvil y web.

Gestor de workspaces sugerido: **pnpm workspaces** (liviano, $0). Alternativa: npm workspaces.

---

## 🌳 Vista general

```
ecosistema/
├── apps/
│   ├── backend/            # API NestJS — todo el ecosistema (un solo backend)
│   ├── mobile/             # React Native + Expo (offline-first, trabajo de campo)
│   └── web/                # React + Vite (panel web + portal del dueño)
│
├── packages/
│   ├── shared-types/       # Tipos/DTOs/enums compartidos backend <-> frontends
│   ├── validation/         # Esquemas de validación (zod) compartidos
│   └── tsconfig/           # Configs base de TypeScript/ESLint reutilizables
│
├── db/
│   ├── schema/
│   │   └── esquema_ecosistema.sql   # El DDL que ya generamos
│   ├── migrations/         # Migraciones versionadas (drizzle-kit)
│   └── seeds/              # Datos semilla (especies, categorías, vademécum)
│
├── docs/                   # Documentación del proyecto (.md)
│   ├── Roadmap_Ecosistema.md
│   ├── Tropera_Alcace.md
│   └── Estructura_Proyecto.md
│
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 🧩 `apps/backend` — API NestJS

Cada **módulo de NestJS = una carpeta**, y los módulos se agrupan por el **schema de base de datos** al que pertenecen (`core`, `tropera`, `hce`, `farmacia`, `stock`, `facturacion`). Las definiciones de tablas (Drizzle) viven centralizadas en `database/schema/`, espejando el `.sql`, y los módulos las importan.

> ORM sugerido: **Drizzle** (SQL-first, tipado excelente, soporta multi-schema de Postgres y encaja con el DDL que ya tenés). Alternativa más "clásica" con NestJS: TypeORM.

```
apps/backend/
├── src/
│   ├── main.ts                 # Bootstrap
│   ├── app.module.ts           # Módulo raíz (importa todos los módulos)
│   │
│   ├── common/                 # Transversal a todo el backend
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts      # Autenticación
│   │   │   ├── tenant.guard.ts        # Aísla por organizacion_id (multi-tenant)
│   │   │   └── roles.guard.ts         # Autorización por rol de membresía
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── current-org.decorator.ts
│   │   ├── interceptors/
│   │   ├── filters/            # Manejo de errores
│   │   └── pipes/
│   │
│   ├── config/                 # Carga y validación de variables de entorno
│   │
│   ├── database/
│   │   ├── database.module.ts
│   │   ├── drizzle.provider.ts        # Conexión a Postgres
│   │   └── schema/                    # Tablas Drizzle (espejo del .sql)
│   │       ├── core.ts
│   │       ├── tropera.ts
│   │       ├── hce.ts
│   │       ├── farmacia.ts
│   │       ├── stock.ts
│   │       └── facturacion.ts
│   │
│   ├── core/                   # === SCHEMA core ===
│   │   ├── auth/               # login, registro, JWT, refresh (reemplaza Supabase Auth)
│   │   ├── usuarios/
│   │   ├── organizaciones/
│   │   ├── membresias/
│   │   ├── personas/
│   │   ├── especies/
│   │   └── animales/           # ficha del paciente + generación de codigo_legible
│   │
│   ├── tropera/                # === SCHEMA tropera ===
│   │   ├── establecimientos/
│   │   ├── lotes/
│   │   ├── existencias/
│   │   ├── movimientos/
│   │   └── eventos/            # sanitarios + reproductivos
│   │
│   ├── hce/                    # === SCHEMA hce ===
│   │   ├── consultas/
│   │   ├── turnos/
│   │   └── vacunaciones/
│   │
│   ├── farmacia/               # === SCHEMA farmacia ===
│   │   ├── vademecum/          # + tarea de carga desde SENASA
│   │   └── dispensas/
│   │
│   ├── stock/                  # === SCHEMA stock ===
│   │   ├── productos/
│   │   ├── lotes-stock/
│   │   └── movimientos-stock/
│   │
│   ├── facturacion/            # === SCHEMA facturacion ===
│   │   ├── comprobantes/
│   │   └── arca/               # integración WSFE (ex-AFIP) — fase posterior
│   │
│   └── sync/                   # Endpoints pull/push para WatermelonDB
│       ├── sync.controller.ts
│       └── sync.service.ts
│
├── test/
├── drizzle.config.ts
├── nest-cli.json
├── tsconfig.json
└── package.json
```

### Anatomía de un módulo (ejemplo: `core/animales`)

Todos los módulos siguen el mismo patrón:

```
core/animales/
├── animales.module.ts
├── animales.controller.ts      # Rutas HTTP
├── animales.service.ts         # Lógica de negocio (incl. codigo_legible)
├── dto/
│   ├── create-animal.dto.ts
│   └── update-animal.dto.ts
└── animales.service.spec.ts    # Tests
```

---

## 📱 `apps/mobile` — React Native + Expo (offline-first)

El corazón es la carpeta `model/` (WatermelonDB) y `sync/`, que dialoga con el módulo `sync` del backend.

```
apps/mobile/
├── src/
│   ├── model/                  # WatermelonDB
│   │   ├── schema.ts           # Esquema local (espejo de las tablas sincronizables)
│   │   ├── migrations.ts
│   │   ├── Animal.ts           # Modelos
│   │   ├── Persona.ts
│   │   ├── Consulta.ts
│   │   └── ...
│   │
│   ├── db/
│   │   ├── database.ts         # Inicialización de la base local
│   │   └── sync.ts             # Lógica pull/push contra /sync del backend
│   │
│   ├── api/
│   │   ├── client.ts           # Cliente HTTP + manejo de token
│   │   └── auth.ts
│   │
│   ├── features/               # Pantallas agrupadas por dominio
│   │   ├── auth/
│   │   ├── tropera/
│   │   └── hce/
│   │
│   ├── components/             # UI reutilizable
│   ├── navigation/
│   ├── hooks/
│   └── theme/                  # Paleta (Verde Monte #5C8A4E, Marrón Tierra #8B5A2B)
│
├── assets/
├── App.tsx
├── app.json
├── tsconfig.json
└── package.json
```

---

## 💻 `apps/web` — React + Vite

Incluye el panel de gestión y el **portal del dueño** (pedir turnos + ver resumen de la historia clínica).

```
apps/web/
├── src/
│   ├── features/
│   │   ├── auth/
│   │   ├── tropera/
│   │   ├── hce/
│   │   └── portal-dueno/       # Vista pública para el dueño del animal
│   ├── components/
│   ├── pages/                  # (o routes/)
│   ├── api/
│   ├── hooks/
│   ├── lib/
│   └── theme/
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 📦 `packages/` — código compartido

* **shared-types**: interfaces, tipos y enums que viajan entre backend y frontends (ej. `Animal`, `Persona`, roles, estados de turno). Evita duplicar definiciones y mantiene todo en sincronía.
* **validation**: esquemas `zod` de validación reutilizables (mismo esquema valida en el backend y en los formularios de las apps).
* **tsconfig**: configuraciones base de TypeScript/ESLint que heredan todas las apps.

---

## 🗄️ `db/` — base de datos

* **schema/**: el DDL fuente (`esquema_ecosistema.sql`).
* **migrations/**: cambios versionados generados con `drizzle-kit` (nunca editar la base a mano en producción).
* **seeds/**: datos iniciales (especies, categorías de hacienda, carga del vademécum SENASA).

---

## 🔗 Cómo se conecta todo (offline-first)

1. El backend expone `/sync` (pull/push) desde `apps/backend/src/sync`.
2. La app móvil (`apps/mobile/src/db/sync.ts`) descarga los cambios (`pull`) filtrados por organización/usuario, permite trabajar sin conexión sobre WatermelonDB, y sube los cambios (`push`) al reconectar.
3. Las tablas sincronizables del `.sql` (con `updated_at` / `deleted_at`) tienen su espejo en `apps/mobile/src/model/schema.ts`.
4. Los tipos compartidos (`packages/shared-types`) garantizan que backend, móvil y web hablen exactamente el mismo idioma de datos.
