# 📁 Estructura del proyecto — Ecosistema de Salud Animal

Organización en **monorepo**: una sola raíz con las aplicaciones (`apps/`) y, a futuro, código compartido (`packages/`). El tronco común (`core`) se escribe una vez y lo reutilizan todas las soluciones.

Gestor de workspaces: **pnpm workspaces** (también funciona con npm workspaces).

**Última actualización:** 2026-08-27. Leyenda: ✅ existe · ⏳ planeado.

> Este documento se auditó contra el código real (no al revés). Antes de esta fecha describía una versión más chica del backend/web que ya quedó atrás — ver `CHANGELOG.md` (entrada "Auditoría de estado real vs. documentado") para el detalle de lo que cambió.

> ⚠️ **Drift conocido, sin auditar todavía**: el árbol de `apps/web/src/` de acá abajo quedó desactualizado a partir del rediseño del shell (nav rail por solución, 2026-08-30) y no refleja lo agregado después — entre otras cosas: `nav/config.ts` (config del rail), `pages/HuellaHomeSection.tsx` (reemplazó a `DashboardPage.tsx`, ver `CHANGELOG.md` 2026-09-01: centro de operaciones + turnos de hoy), `pages/CajaPage.tsx` (Fase D), `components/Omnibox.tsx`, `components/DrawerTabla.tsx`, `components/TutorialGuiado.tsx`, `components/TerminosModal.tsx`, y de la sesión del 2026-09-01: `components/SelectorBusqueda.tsx` (combobox de lista cerrada), `components/SeleccionarAnimalModal.tsx`, `components/VentaRapidaModal.tsx`, `components/NuevoTurnoRapidoModal.tsx`, `utils/columnasTabla.ts` (reemplazó a `utils/exportar.ts`, que ya no existe — el centro de exportación se removió app-wide). No confiar en el árbol para saber qué existe hoy; usar `find`/`grep` sobre el código real.

---

## 🌳 Vista general (estado actual)

```
ecosistema/
├── apps/
│   ├── backend/            # ✅ API NestJS — todo el ecosistema (un solo backend)
│   ├── web/                # ✅ React + Vite (panel de gestión + admin + portal del dueño)
│   └── mobile/             # 🟡 React Native + Expo — scaffold de Expo Router creado,
│                            #    sin integración con el backend ni con sync/ todavía
│
├── packages/               # ⏳ código compartido (shared-types, validation) — aún no creado
│
├── db/
│   ├── schema/              # ⚠️ VACÍO — esquema_ecosistema.sql no existe pese a que este
│   │                         #    documento (versiones previas) y el Roadmap lo daban por hecho
│   └── migrations/         # ✅ generadas con drizzle-kit (0000_*.sql + meta/)
│
├── docs/                   # ✅ Documentación (.md)
│   ├── Roadmap_Ecosistema.md
│   ├── Estructura_Proyecto.md
│   ├── CHANGELOG.md
│   └── Protocolo_Pruebas.md   # ✅ checklist de pruebas manuales end-to-end desde el navegador
│   # Tropera_Alcace.md tampoco existe — referenciado por el Roadmap como fuente del
│   # alcance funcional de Tropera, pero nunca se creó. Ver corrección 2026-08-27 en el Roadmap.
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
│   │   ├── auth/                      # ✅ registro, login, JWT + refresh token (POST /auth/refresh,
│   │   │                              #    stateless, payload {sub, tipo:'refresh'}). Exporta JwtService.
│   │   ├── especies/                  # ✅ catálogo (GET /especies)
│   │   ├── personas/                  # ✅ dueños (CRUD: crear, listar, obtener, actualizar, /animales)
│   │   ├── animales/                  # ✅ pacientes + codigo-legible.util (CRUD, datosEspecificos JSONB)
│   │   │   └── dto/                   # ✅ create-animal.dto.ts, update-animal.dto.ts
│   │   └── usuarios/                  # ✅ miembros de la org (GET /usuarios) — para asignar turnos y
│   │                                  #    para UsuariosPage.tsx. PATCH /usuarios/:id/password (reset,
│   │                                  #    propietario/admin) — con UI en la web recién desde 2026-08-28.
│   │
│   ├── hce/                            # === SCHEMA hce ===
│   │   ├── consultas/                 # ✅ historia clínica: alta, historial, edición (PATCH) y borrado
│   │   │                              #    (DELETE, soft delete) por animal. anamnesis/examenFisico/
│   │   │                              #    temperaturaC ya expuestos en el formulario web.
│   │   ├── vacunaciones/              # ✅ registro + recordatorios, con UI en la ficha del paciente
│   │   ├── turnos/                    # ✅ turnero (agenda, estados, veterinarioId)
│   │   ├── carnet/                    # ✅ PDF del paciente (@react-pdf/renderer), datos reales vía Drizzle
│   │   └── portal/                    # ✅ portal PÚBLICO por código legible: GET /portal/c/:codigo, sin
│   │                                  #    guards. OJO: se llama PortalController/Service/Module igual que
│   │                                  #    src/portal/ (abajo) — son dos features distintas, mismo nombre.
│   │
│   ├── portal/                        # ✅ portal por MAGIC-LINK: staff emite acceso
│   │   │                              #    (POST /portal/acceso/:personaId, botón en PersonasPage.tsx),
│   │   │                              #    el dueño lo usa para ver su resumen (GET /portal/resumen,
│   │   │                              #    TODAS sus mascotas) y solicitar turno (POST /portal/turnos).
│   │   │                              #    Auth por header X-Portal-Token (PortalGuard) — no Bearer, no
│   │   │                              #    query — aunque el link en sí lleva el token como ?token= en la URL.
│   │   └── (mismo aviso de nombre duplicado que hce/portal/ arriba)
│   │
│   ├── admin/                          # ✅ consola de plataforma: alta/baja de organizaciones y miembros
│   │                                  #    (requiere SuperAdminGuard / SUPERADMIN_EMAILS)
│   │
│   ├── solicitudes/                    # ✅ alta de cuenta/organización con aprobación: reemplaza el registro
│   │                                  #    directo en el flujo de la web (crear solicitud → aprobar desde /admin)
│   │
│   ├── sync/                           # ✅ motor de sync offline pull/push, contrato compatible con
│   │                                  #    WatermelonDB synchronize(). Sincroniza personas/animales/
│   │                                  #    consultas/vacunaciones/turnos (NO existencias de tropera todavía).
│   │                                  #    Falta el consumidor (app móvil).
│   │
│   ├── tropera/                        # === SCHEMA tropera === (F1.1–F1.4, F1.6 del roadmap)
│       ├── establecimientos/          # ✅ CRUD de establecimientos ganaderos. Roles de escritura:
│       │                              #    propietario/admin/capataz.
│       ├── existencias/               # ✅ hacienda por categoría (vaca/toro/ternero/ternera/vaquillona/
│       │                              #    novillo), CONTEO AGREGADO — no hay fila individual por cabeza.
│       │                              #    Dos controllers: ExistenciasController (nested bajo
│       │                              #    tropera/establecimientos/:id, mismo patrón que carnet/ bajo
│       │                              #    animales/:id — GET completa las 6 categorías en 0, PATCH hace
│       │                              #    upsert manual sin historial) y ExistenciasResumenController
│       │                              #    (GET /tropera/existencias, TODA la organización de una,
│       │                              #    para el panel consolidado — ruta separada a propósito, sin
│       │                              #    ambigüedad con el :id de la anidada).
│   │   ├── movimientos/               # ✅ ledger de nacimiento/compra/muerte/venta/traslado. POST ajusta
│   │   │                              #    existencias EN LA MISMA TRANSACCIÓN que inserta el movimiento
│   │   │                              #    (alta = suma en establecimientoId; baja = resta, rechaza si
│   │   │                              #    deja negativo; traslado = resta en establecimientoId + suma en
│   │   │                              #    establecimientoDestinoId). GET ?establecimientoId= filtra por
│   │   │                              #    origen O destino, para que un traslado aparezca en ambos lados.
│   │   └── eventos/                    # ✅ eventos sanitarios (vacunacion/desparasitacion/tratamiento) y
│   │                                  #    reproductivos (servicio/diagnostico_prenez/destete) — sólo
│   │                                  #    registro, NO ajusta existencias. categoria/cantidad opcionales
│   │                                  #    (puede aplicar a toda la hacienda del establecimiento). Roles
│   │                                  #    de escritura: propietario/admin/capataz/veterinario.
│   │
│   └── farmacia/                       # === SCHEMA farmacia === (MVP básico, 2026-08-28, F4.2 parcial)
│       ├── productos/                 # ✅ CRUD del vademécum. `categoria` es texto libre (no enum —
│       │                              #    un vademécum real es demasiado variado para eso, a
│       │                              #    diferencia de las 6 categorías fijas de hacienda en Tropera).
│       ├── stock/                     # ✅ GET /farmacia/stock trae TODOS los productos activos de la
│       │                              #    organización con su cantidad (0 si nunca se cargó, vía
│       │                              #    LEFT JOIN + coalesce) en una sola llamada — más simple que
│       │                              #    el equivalente de Tropera porque acá no hay "por
│       │                              #    establecimiento". PATCH /farmacia/stock/:productoId es la
│       │                              #    corrección directa sin historial.
│       └── movimientos/                # ✅ ledger compra (alta) / uso, vencimiento, merma (baja,
│                                      #    rechaza si deja negativo) — ajusta stock EN LA MISMA
│                                      #    TRANSACCIÓN, mismo patrón que tropera/movimientos/. Roles
│                                      #    de escritura: propietario/admin/veterinario (sin
│                                      #    capataz/recepción — es clínico, no de campo ni mostrador).
│                                      #    `consulta_id` opcional (F4.3, 2026-08-28): un 'uso' con
│                                      #    consultaId ES la dispensa — no hay entidad nueva. Filtro
│                                      #    GET /farmacia/movimientos?consultaId=... además del ya
│                                      #    existente por productoId.
│       # Fuera de alcance a propósito: la FK real de hce.vacunaciones.vademecum_id hacia
│       # farmacia.productos.id (hoy sin constraint) — dispensar queda ligado a la consulta, no a
│       # una vacunación puntual.
│
├── scripts/
│   ├── init-local-db.mjs             # ✅ crea la base local PGlite: aplica migraciones + siembra
│   │                                 #    (delega el seed en seed-especies.mjs, no lo duplica)
│   └── seed-especies.mjs             # ✅ siembra core.especies — funciona contra pglite O
│                                     #    node-postgres (mismo criterio de DATABASE_DRIVER que
│                                     #    drizzle.provider.ts), idempotente. `pnpm db:seed`.
│                                     #    Es el paso que `drizzle-kit migrate` no hace por vos.
├── test/                             # ✅ demos de flujo contra PGlite real
├── drizzle.config.ts                 # ✅
├── .env.example                      # ✅
└── package.json                      # ✅
```

> Los módulos que usan guards (`JwtAuthGuard`) deben importar `AuthModule` (que exporta `JwtService`). Ej.: `usuarios`, `animales`, `turnos`.

---

## 💻 `apps/web` — React + Vite ✅

Panel de gestión. **CSS propio** (sin framework de estilos). El estado real hoy es por páginas (`pages/`), no por features. La sesión se registra desde `App.tsx` y alimenta a los clientes de API. `main.tsx` rutea por URL, sin librería: `/admin` → consola de plataforma, `?token=` → portal del dueño por magic-link (todas sus mascotas), `/c/{codigo}` (o `?c=`) → portal público del dueño (una mascota), resto → app interna (`App.tsx`).

```
apps/web/
├── src/
│   ├── main.tsx                      # ✅ punto de entrada + ruteo por URL (/, /admin, /c/:codigo)
│   ├── App.tsx                       # ✅ navegación interna (Turnos / Animales / Dueños) + sesión + home según rol
│   ├── styles.css                    # ✅ estilos propios
│   ├── api/
│   │   ├── client.ts                 # ✅ cliente HTTP (token + X-Organizacion-Id) — incluye vacunaciones,
│   │   │                            #    edición/borrado de consultas, y refresh silencioso ante un 401
│   │   │                            #    (POST /auth/refresh + reintento único)
│   │   ├── turnos.ts                 # ✅ cliente de turnos + alta rápida de paciente + profesionales +
│   │   │                            #    resumen mensual. Mantiene su PROPIA sesión y su PROPIO refresh
│   │   │                            #    silencioso, duplicados a propósito respecto de client.ts (ver nota)
│   │   ├── admin.ts                  # ✅ cliente de la consola /admin (organizaciones, miembros)
│   │   ├── solicitudes.ts            # ✅ cliente de alta de cuenta con aprobación
│   │   ├── portal.ts                 # ✅ cliente del portal público por código (sin token ni sesión)
│   │   ├── portalAcceso.ts           # ✅ cliente del portal por magic-link (header X-Portal-Token)
│   │   └── types.ts                  # ✅ tipos (Sesion, Animal, Persona, Especie, Consulta)
│   ├── auth/
│   │   └── useSesion.ts              # ✅ sesión persistente (localStorage)
│   ├── config/
│   │   └── especieDatos.ts           # ✅ catálogo editable de campos por especie (datosEspecificos)
│   ├── components/
│   │   └── CamposEspecie.tsx         # ✅ inputs dinámicos según la especie
│   └── pages/
│       ├── LoginPage.tsx             # ✅ login + alta (crea una `solicitud`, no llama al registro directo)
│       ├── TurnosPage.tsx            # ✅ agenda diaria + calendario del mes + alta desde mostrador (con alta de paciente inline)
│       ├── PacientesPage.tsx         # ✅ sección "Animales": lista + alta. Si el dueño no existe, se crea
│       │                            #    inline ("＋ Crear dueño nuevo…": nombre/apellido/celular/DNI)
│       │                            #    sin salir del formulario — mismo patrón que usa TurnosPage.
│       ├── PacienteDetallePage.tsx   # ✅ ficha + historia clínica (alta/edición/borrado, con anamnesis/
│       │                            #    examen físico/temperatura) + vacunaciones (alta) + datos por
│       │                            #    especie + carnet + dispensa de fármacos por consulta (F4.3,
│       │                            #    panel inline `DispensaPanel`: lista lo ya dispensado + alta)
│       ├── PersonasPage.tsx          # ✅ dueños: lista, alta, edición, ver animales, y "Generar acceso
│       │                            #    al portal" (magic-link, ver PortalAccesoPage.tsx)
│       ├── AdminPage.tsx             # ✅ consola de plataforma (ruteada en /admin, login propio de super-admin)
│       ├── PortalDuenoPage.tsx       # ✅ portal público del dueño (ruteada en /c/:codigo, una mascota)
│       ├── PortalAccesoPage.tsx      # ✅ portal del dueño por magic-link (ruteada en ?token=, TODAS
│       │                            #    sus mascotas + solicitar turno por mascota)
│       ├── RecordatoriosPage.tsx     # ✅ pestaña "Recordatorios" en App.tsx: vencimientos de vacunas +
│       │                            #    turnos próximos, con contacto directo (WhatsApp/llamar)
│       ├── TroperaPage.tsx           # ✅ pestaña "Tropera": panel "Stock consolidado" (matriz
│       │                            #    establecimiento × categoría con totales, visible con 2+
│       │                            #    establecimientos) + listado, y por establecimiento: hacienda
│       │                            #    por categoría (conteo agregado) + historial de movimientos
│       │                            #    (nacimiento/compra/muerte/venta/traslado) + historial de
│       │                            #    eventos sanitarios/reproductivos. Visible sólo para
│       │                            #    propietario/admin/capataz.
│       ├── UsuariosPage.tsx          # ✅ pestaña "Usuarios" (sólo propietario/admin): lista el personal
│       │                            #    de la organización (GET /usuarios) y permite resetear la
│       │                            #    contraseña de cada uno (específica o temporal autogenerada,
│       │                            #    mostrada una única vez) vía PATCH /usuarios/:id/password —
│       │                            #    el endpoint ya existía en el backend, no tenía ninguna UI.
│       └── FarmaciaPage.tsx          # ✅ pestaña "Farmacia" (propietario/admin/veterinario): mismo
│                                    #    patrón list→detail que TroperaPage.tsx — listado de productos
│                                    #    con stock a la vista, detalle con corrección directa + alta
│                                    #    de movimiento + historial.
├── index.html                        # ✅
├── vite.config.ts                    # ✅
├── tsconfig.json                     # ✅
├── .env.example                      # ✅ VITE_API_URL
└── package.json                      # ✅
```

> La app le pega al backend vía `VITE_API_URL` (por defecto `http://localhost:3000`). El backend tiene CORS habilitado.

---

## 📱 `apps/mobile` — React Native + Expo 🟡

Ya existe como proyecto (Expo Router, `apps/mobile/src/app`, `components`, `hooks`), pero es **el scaffold por defecto de `create-expo-app`** — sin `model/` ni `db/sync.ts`, sin cliente del backend, sin login. El motor `sync/` del backend ya habla el contrato de WatermelonDB (`pull`/`push`), así que la decisión de base local pendiente es esa: adoptar WatermelonDB o Expo SQLite. Tiene su propio `apps/mobile/CLAUDE.md`/`AGENTS.md`, que remite a leer la documentación versionada de Expo v57 antes de escribir código ahí.

---

## 📦 `packages/` — código compartido ⏳

Aún no creado. La idea: `shared-types` (tipos/DTOs backend↔frontends) y `validation` (esquemas reutilizables). Hoy los tipos de la web viven en `apps/web/src/api/types.ts`.

---

## 🗄️ `db/` — base de datos ✅

* **schema/**: vacío. Se referenciaba un `esquema_ecosistema.sql` como DDL de referencia de todos los schemas, pero nunca se creó — el schema real vive únicamente en `apps/backend/src/database/schema/*.ts` (Drizzle) y las migraciones generadas a partir de ahí.
* **migrations/**: generadas con `drizzle-kit generate` a partir de los schemas Drizzle (`000N_*.sql` + carpeta `meta/`). Se aplican con `drizzle-kit migrate` (prod) o con el script `init-local-db.mjs` (dev/PGlite). El `meta/_journal.json` tuvo que reconstruirse desde cero (squash) el 2026-08-28 en `0000_ecosistema_base.sql` porque dos migraciones viejas (`solicitudes`, `organizaciones.activo`) se habían agregado sin pasar por `drizzle-kit generate` y el journal nunca las tuvo registradas; ver `CHANGELOG.md` para el detalle. Desde el squash van cuatro migraciones seguidas sin fricción: `0001_tropera_eventos.sql`, `0002_farmacia.sql`, `0003_farmacia_dispensa.sql` (sólo hace falta renombrar el archivo generado al número secuencial correcto y ajustar el campo `tag` en `_journal.json` — `drizzle-kit generate` sigue nombrando con un slug random y un `idx` que no siempre coincide con el orden cronológico de archivos).
  El archivo empieza con `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` (agregado a mano, 2026-08-28) — `gen_random_uuid()` (lo que usan todos los `defaultRandom()` de Drizzle) es nativo recién desde Postgres 13; sin la extensión, `drizzle-kit migrate` falla en cualquier Postgres más viejo. PGlite nunca mostró el problema porque la trae disponible de entrada.
* **seeds**: `apps/backend/scripts/seed-especies.mjs` siembra `core.especies`, funciona contra cualquiera de los dos drivers (`DATABASE_DRIVER=pglite` o `node-postgres`), `pnpm --filter backend db:seed`. `drizzle-kit migrate` no siembra nada — hay que correr `db:seed` aparte después de migrar contra un Postgres real. `init-local-db.mjs` lo reusa (no duplica el `INSERT`).

---

## 🔗 Cómo se conecta todo (hoy)

1. **Backend** (`apps/backend`, puerto 3000): API + base. En dev usa PGlite (sin instalar Postgres); en prod, Postgres real vía `DATABASE_URL`.
2. **Web** (`apps/web`, puerto 5173): consume la API con el token y el header `X-Organizacion-Id`. La sesión (`{ token, refreshToken, organizacionId, rol }`) se registra en `App.tsx` y de ahí la toman `api/client.ts` y `api/turnos.ts`. Ante un 401, cada cliente intenta `POST /auth/refresh` una vez y avisa a `App.tsx` (`configurarRefrescoSesion`/`configurarRefrescoSesionTurnos`) para persistir el token nuevo — transparente para quien esté usando la app. El portal del dueño y `/admin` tienen sus propios flujos de acceso (código público / login de super-admin), independientes de `useSesion` y sin refresh (sesiones cortas por diseño).
3. **Offline:** el módulo `sync` (pull/push, contrato WatermelonDB) ya está implementado en el backend y usa `updated_at`/`deleted_at`. Lo único que falta para que el ciclo offline funcione es la app móvil consumiéndolo — hoy es un scaffold de Expo sin cliente propio.

---

## 🧭 Convenciones

* **Un módulo NestJS por carpeta**, agrupado por schema (`core/`, `hce/`, …).
* **Datos por especie:** se definen en `apps/web/src/config/especieDatos.ts` (frontend) y se guardan en `animales.datos_especificos` (JSONB). Agregar/quitar campos ahí alcanza para que aparezcan en alta, edición y ficha.
* **Roles:** `propietario`, `admin`, `capataz`, `veterinario`, `recepcion`. La organización viaja siempre en el header, nunca en el body.
