# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Ecosistema de Salud Animal" — a pnpm-workspace monorepo for a veterinary/animal-management platform (product line: **HCE Animal** clinical records + turnero, and a future **Tropera** livestock module). All code, identifiers, comments and commit messages are in **Spanish** — keep new code consistent with that.

Workspaces (`pnpm-workspace.yaml`): `apps/*` (`backend`, `web`, `mobile`) and `packages/*` (not created yet).

## Commands

Run from repo root unless noted.

```bash
pnpm install                          # installs all workspaces

# Dev (backend :3000 + web :5173 together)
./dev.sh
# or individually:
pnpm --filter backend start:dev
pnpm --filter web dev

# Backend build / prod
pnpm --filter backend build
pnpm --filter backend start:prod      # runs dist/main.js

# Backend tests
pnpm --filter backend test            # jest (unit specs, e.g. codigo-legible.util.spec.ts)
pnpm --filter backend test:auth-demo      # tsx test/auth-flow.demo.ts
pnpm --filter backend test:animales-demo
pnpm --filter backend test:personas-demo
pnpm --filter backend test:hce-demo
pnpm --filter backend test:vacunas-demo
pnpm --filter backend test:turnos-demo
pnpm --filter backend test:sync-demo
pnpm --filter backend test:plataforma-demo
pnpm --filter backend test:roles-demo
pnpm --filter backend test:macros-demo
pnpm --filter backend test:indicaciones-demo
pnpm --filter backend test:tropera-demo   # covers all of Tropera: F1.1-F1.6 core + Fase E (E.1-E.6) individual tracking
pnpm --filter backend test:caja-demo
# each *-demo script runs a self-contained flow against an in-memory PGlite instance
# (creates its own schema/tables) — no running server or DB needed

# DB (Drizzle)
pnpm --filter backend db:generate     # generates db/migrations/ from src/database/schema/*
pnpm --filter backend db:migrate      # applies migrations to a real Postgres (DATABASE_URL) — does NOT seed
pnpm --filter backend db:seed         # seeds core.especies; works for either driver (DATABASE_DRIVER)
pnpm --filter backend db:local-init   # creates ./pgdata (PGlite), applies migrations, calls db:seed's function

# Web build
pnpm --filter web build
```

`apps/mobile` is a bare Expo Router scaffold (not yet wired to the backend/sync). It has its own `apps/mobile/CLAUDE.md` (redirects to `AGENTS.md`, which says to read the versioned Expo v57 docs before writing mobile code) — treat that app's conventions independently.

⚠️ If you start a backend against a **different** `DATABASE_PATH` than the user's (e.g. a throwaway PGlite dir for isolated testing), kill it by exact PID (`lsof -t -i :3000 | xargs kill -9`) when done — `pkill -f "nest start --watch"` **does not match** the process once `nest build` has run and something later starts it as `node dist/src/main`, so a stray test backend can silently keep holding the port (pointed at the wrong database) while the user's own backend fails to start or a later one binds to a different port instead. This has actually happened and cost real debugging time — always verify with `lsof -i :3000 -sTCP:LISTEN` and check the listening PID's `DATABASE_PATH` (`/proc/<pid>/environ`) before assuming which backend is live. Never run two processes against the same PGlite directory concurrently — it's single-process, not designed for concurrent access; stop the running server before applying any direct DDL/data fix to `apps/backend/pgdata`.

## Backend architecture (`apps/backend`)

Single NestJS API serving the whole ecosystem — not split per product. Modules are grouped by **database schema**, mirrored in `src/database/schema/*.ts`:

- `core/` → schema `core`: `auth` (login/register + `POST /auth/refresh`, stateless refresh token — same `JWT_SECRET`, payload `{ sub, tipo: 'refresh' }`, `JwtAuthGuard` rejects it if used as an access token), `especies`, `personas` (dueños), `animales` (pacientes), `usuarios` (miembros de la organización — `GET /usuarios` lists them, `PATCH /usuarios/:id/password` resets a member's password, org-scoped `propietario`/`admin` only, not the platform `SuperAdminGuard`)
- `hce/` → schema `hce`: `consultas` (create/read/update/soft-delete), `vacunaciones` (registrar/historial/recordatorios), `turnos`, `carnet` (PDF, `@react-pdf/renderer`, queries real data via Drizzle), and `hce/portal/` — the **public** dueño surface: `GET /portal/c/:codigo` (no guards, código legible from the QR is the credential)
- `admin/` — platform-level: crear organizaciones, gestionar membresías (super-admin only)
- `solicitudes/` — public sign-up requests (crear cuenta/organización) that an admin later approves/rejects; this is what the web's `LoginPage` actually calls now, not `AuthService.register` (still present, unused by the web)
- `portal/` (top-level, distinct from `hce/portal/`) — the **magic-link** dueño surface: staff issues access (`PortalTokenService`, `POST /portal/acceso/:personaId`, from a button in `PersonasPage.tsx`), the dueño then reads `/portal/resumen` and requests turnos via `/portal/turnos` — both authenticated by the `X-Portal-Token` header (`PortalGuard`), **not** `Authorization: Bearer` and not a query param, even though the link itself carries the token as `?token=` in the URL
- `sync/` (`sync.core.ts` + `sync.service.ts`) — offline pull/push sync engine, WatermelonDB-compatible contract, fully implemented and tested (`test:sync-demo`); no consumer yet since `apps/mobile` isn't wired to it. Does not cover `tropera.*` yet.
- `tropera/` → schema `tropera`: `establecimientos` (CRUD) + `existencias` (headcount by category — `vaca`/`toro`/`ternero`/`ternera`/`vaquillona`/`novillo`, **aggregate counts, not one row per animal**; `ExistenciasController` at `tropera/establecimientos/:id/existencias` like `carnet` nests under `animales/:id`, plus a second controller `ExistenciasResumenController` at the unrelated `GET tropera/existencias` — org-wide, all establecimientos, for the panel consolidado; the two share a service but live at deliberately non-overlapping routes) + `movimientos` (`nacimiento`/`compra`/`muerte`/`venta`/`traslado` — `POST` adjusts `existencias` **in the same transaction** it inserts the ledger row; a baja that would leave `cantidad` negative throws instead of partially applying) + `eventos` (`vacunacion`/`desparasitacion`/`tratamiento`/`servicio`/`diagnostico_prenez`/`destete` — **does not touch `existencias`**, pure log; `categoria`/`cantidad` optional, roles include `veterinario` unlike the other three tropera modules). No `parto` event type — a birth is a `nacimiento` movimiento, modeling it twice would be redundant while hacienda stays aggregate-only.
- `farmacia/` → schema `farmacia`: `productos` (vademécum CRUD, `categoria` free text — a real vademécum is too varied for a closed enum, unlike Tropera's 6 fixed categories) + `stock` (one row per producto; `GET /farmacia/stock` returns **all** active productos for the org with their cantidad via `LEFT JOIN` + `coalesce`, in one call — simpler than Tropera's equivalent since there's no establecimiento layer here; `PATCH .../stock/:productoId` is the direct correction) + `movimientos` (`compra` alta / `uso`, `vencimiento`, `merma` baja — same transactional-ledger shape as `tropera/movimientos`, rejects a baja that would go negative). Write roles: `propietario`/`admin`/`veterinario` (no `capataz`/`recepcion` — clinical, not field or front-desk). `movimientos_stock` has an optional `consulta_id` FK (F4.3, 2026-08-28): a dispensa is **not** a separate entity, it's a `tipo: 'uso'` movimiento with `consultaId` set — `MovimientosService.crear()` validates the consulta belongs to the org before inserting, and `listar()`/`GET .../movimientos` accepts an optional `consultaId` filter alongside `productoId`. Still deliberately out of scope: a real FK from `hce.vacunaciones.vademecum_id` to `farmacia.productos.id` (still just a logical reference, no constraint) — dispensing stays tied to the consulta, not to a specific vacunación.

`portal/` and `hce/portal/` each define a class literally named `PortalController`/`PortalService`/`PortalModule` — same names, two unrelated features (public code-based read-only vs. staff-issued magic-link with turno requests). Don't assume "the" `PortalService` — check which directory you're in.

**Request guard chain** (order matters, later guards depend on state set by earlier ones):

1. `JwtAuthGuard` — validates the Bearer token, sets `req.user` (`{ sub, email }`)
2. `TenantGuard` — reads header `X-Organizacion-Id` (organization is **always** in the header, never the body), checks the caller has an active `membresia` there and the org is active, sets `req.organizacionId` and `req.rol`
3. `RolesGuard` + `@Roles(...)` — compares `req.rol` against the roles allowed on the handler

Access these via param decorators instead of `@Req()`: `@CurrentUser()`, `@CurrentOrg()`, `@CurrentRol()` (`src/common/decorators/current-context.decorator.ts`). Any module using these guards needs `JwtService`, so import `AuthModule` into it (see `usuarios`, `animales`, `turnos`).

Roles: `propietario`, `admin`, `capataz`, `veterinario`, `recepcion`. Separately, `SuperAdminGuard` gates the `admin/` module using `SUPERADMIN_EMAILS`.

**Database access** — Drizzle ORM, SQL-first, injected via the `DRIZZLE` token (`src/database/drizzle.provider.ts`):
- Driver picked at runtime by `DATABASE_DRIVER` env var: `pglite` (default for local dev — Postgres embedded in-process, no install needed, persisted at `DATABASE_PATH`) or `node-postgres` (real Postgres, prod).
- All schema files import from `src/database/schema/index.ts`.
- Tables use soft delete (`deleted_at`) and `updated_at` throughout — this is what the `sync/` engine relies on.
- Species-specific animal data (`animales.datos_especificos`, JSONB) has no fixed backend schema; the field catalog lives in the frontend (see below).

**Migrations**: hand-authored Drizzle schema → `drizzle-kit generate` writes SQL into `db/migrations/` (versioned, committed) → `drizzle-kit migrate` applies to real Postgres (does not seed), or `scripts/init-local-db.mjs` applies + seeds `especies` for local PGlite dev (this one ignores `meta/_journal.json` — reads the directory and applies `.sql` files in alphabetical order).

`db/migrations/` is a **single squashed migration** (`0000_ecosistema_base.sql`, 3 schemas / 8 enums / 13 tables) as of 2026-08-28 — two earlier migrations had been hand-added without ever going through `drizzle-kit generate`, which left `meta/_journal.json` out of sync (`drizzle-kit migrate` against real Postgres would have silently skipped them). Fixed by squashing rather than hand-reconstructing the missing journal entries, since no real-Postgres deploy exists yet, so there was no applied history to preserve. Full account in `docs/CHANGELOG.md`. Going forward `db:generate` should behave normally — if it ever asks for a manual rename/journal-tag fix again, something broke and it's worth finding out why before repeating the old workaround.

The migration **has** since been run against a real Postgres (locally, v12, 2026-08-28 — see `CHANGELOG.md`), which caught two things PGlite never would:
1. `gen_random_uuid()` (what every `.defaultRandom()` uuid column compiles to) is only native from **Postgres 13 on**; older versions need the `pgcrypto` extension — but PGlite's WASM build doesn't have that extension available at all (the function is already native there, so it never needed it). The migration now opens with a `DO $$ ... EXECUTE 'CREATE EXTENSION IF NOT EXISTS "pgcrypto"' ... EXCEPTION WHEN OTHERS THEN NULL END $$` — best-effort, so it's silently skipped wherever it's unavailable-but-unneeded instead of aborting the whole migration (that's exactly what an unguarded `CREATE EXTENSION` did to PGlite the first time this was "fixed").
2. `core.especies` comes back empty after `drizzle-kit migrate` — seeding was PGlite-only. Fixed with `scripts/seed-especies.mjs` (`pnpm db:seed`), which picks pglite/node-postgres the same way `drizzle.provider.ts` does and is idempotent; `init-local-db.mjs` now imports its `sembrarEspecies()` instead of duplicating the `INSERT`. If you ever write another Node script meant to be run both directly and imported, don't gate the `main()`-style entry check with `import.meta.url === 'file://' + process.argv[1]` — `import.meta.url` percent-encodes characters like spaces, `process.argv[1]` doesn't, so the comparison silently fails on any path containing one (this repo's does). Use `fileURLToPath(import.meta.url) === process.argv[1]` instead.

⚠️ **A new schema/table never reaches the user's real `apps/backend/pgdata` on its own.** `nest start --watch` reloads *code* on save, not *DDL* — this has bitten Tropera and Farmacia both, same failure mode each time (500s, `relation "..." does not exist`) until the new migration's DDL was applied by hand. If you add a schema/table, either walk the user through `db:local-init`-equivalent steps, or (what's been done twice now) stop their real backend by exact PID, apply just the new migration file's statements directly against `./pgdata` with a one-off PGlite script (verify row counts on a couple of existing tables before **and** after, to catch corruption from any accidental concurrent access), then restart. Don't skip the before/after integrity check — PGlite is single-process, not safe for two processes touching the same directory at once.

## Web architecture (`apps/web`)

React + Vite, plain CSS (`src/styles.css`, no UI framework). Structured by **pages**, not features.

- Session (`{ token, refreshToken, organizacionId, rol }`) is owned by `useSesion` (localStorage-persisted) and instantiated once in `App.tsx`, which is the single source of truth. Other modules don't read session storage directly — `App.tsx` pushes it down explicitly (e.g. `configurarSesionTurnos(sesion)` for `api/turnos.ts`). Follow this pattern for any new API client instead of reaching into `localStorage` directly.
- `api/client.ts` sends the token as `Authorization: Bearer` and org as `X-Organizacion-Id` on every call; talks to `VITE_API_URL` (default `http://localhost:3000`).
- Refresh is silent: `api/client.ts` and `api/turnos.ts` each implement their own 401-triggers-`POST /auth/refresh`-then-retry-once logic (duplicated on purpose, matching how these two files already duplicate session handling), and each calls back into `App.tsx` (`configurarRefrescoSesion`/`configurarRefrescoSesionTurnos`) so `useSesion.actualizarTokens()` persists the new pair. A new API client that needs auth should follow the same shape rather than assuming `client.ts`'s session store is shared.
- Home screen depends on role: `propietario`/`admin`/`recepcion`/`veterinario` land on the turnero (`ROLES_TURNERO` in `App.tsx`); others land on Animales.
- Per-species form fields (`config/especieDatos.ts` + `components/CamposEspecie.tsx`) are a frontend-only catalog rendered dynamically and persisted into `animales.datosEspecificos` — add/remove a species field there and it flows through alta/edición/ficha automatically.
- `main.tsx` does its own URL-based routing (no router lib): `/admin` → `AdminPage` (separate super-admin login), `?token=` → `PortalAccesoPage` (magic-link, all of a dueño's animales), `/c/:codigo` or `?c=` → `PortalDuenoPage` (public, one animal), everything else → `App.tsx`. `?token=` and `?c=` are distinct params and don't collide.
- Quick-create pattern for a missing related record: when a form needs a `personaId` that might not exist yet (alta de animal in `PacientesPage.tsx`, alta de paciente in `TurnosPage.tsx`), the `<select>` gets a `'__nuevo__'` sentinel option that reveals inline nombre/apellido/celular/DNI fields; on submit, `POST /personas` runs first and its id feeds the main create call. Reuse this pattern rather than inventing a modal/redirect when the same need comes up elsewhere (e.g. a future alta de turno without existing paciente).
- `TroperaPage.tsx` follows the same list→detail shape as `PacientesPage.tsx`/`PacienteDetallePage.tsx` (a "seleccionado" establecimiento swaps the whole view rather than nested routing). Its existencias table is per-category rows, each with its own input + save button hitting `PATCH tropera/establecimientos/:id/existencias` individually — there's no batch-save. Two ways to change a count and they mean different things: that direct `PATCH` is an unaudited correction (no ledger row), while the movimientos form (`POST tropera/movimientos`) is the tracked path with history — don't blur them when extending this page. The list view (not the detail) also renders `ResumenConsolidado`, a matrix built client-side from `api.existenciasConsolidadas()` (org-wide, `GET tropera/existencias`) crossed with the already-loaded establecimientos list — only shown with 2+ establecimientos.
- `UsuariosPage.tsx` (nav tab "Usuarios", `propietario`/`admin` only) is the UI for `PATCH /usuarios/:id/password` — the endpoint existed since early on with no caller anywhere in the web until 2026-08-28. Leave a specific password blank to have the backend generate and return a temporary one (shown exactly once — there's no way to retrieve it again after the response).
- `FarmaciaPage.tsx` (nav tab "Farmacia", `propietario`/`admin`/`veterinario`) mirrors `TroperaPage.tsx`'s list→detail shape but simpler, since there's no establecimiento layer: a producto's detail has the same "direct correction vs. tracked movimiento" duality as Tropera's existencias/movimientos.
- `PacienteDetallePage.tsx`'s consultas table has a "Dispensar" action per row (F4.3) that opens an inline `DispensaPanel`: lists what's already been dispensed for that consulta (`GET /farmacia/movimientos?consultaId=...`) and a small form to add one (product + cantidad + observaciones), posting through the same `crearMovimientoStock` client method `FarmaciaPage.tsx` uses, just with `consultaId` set.
- **Don't wrap a `Field`/label-style helper component in a real `<label>` element if its children can contain other clickable elements** (a suggestions dropdown, buttons). A `<label>` intercepts clicks on any descendant to refocus its first associated form control, which can swallow clicks meant for those other elements before React's handler runs. `TurnosPage.tsx`'s `Field` was a `<label>` wrapping both a search `<input>` and, conditionally, an unrelated suggestions list — switched to `<div>` (the CSS only ever targeted the `.hu-field` class, not the tag). If you add a new `Field`-like helper, default to `<div>` unless every one of its children is guaranteed to be exactly one form control.

## Docs worth reading before larger changes

- `docs/Roadmap_Ecosistema.md` — phase-by-phase status/source of truth for what's done vs. planned. Fase 1 (Tropera) has a scope note explaining the aggregate-count-per-category decision (not individual animal tracking) and why that breaks the "one animal, shared across Tropera and HCE" principle described earlier in the doc — read it before extending Tropera. Fase 4 (Farmacia) has a similar scope note: catálogo + stock + movimientos + consulta-linked dispensa (F4.3) are done; no SENASA import (F4.1), no alerts (F4.4). `facturacion` (Fase 5) is still explicitly deferred — ARCA/WSFE integration is real regulatory complexity, don't start it without a dedicated conversation. Last audited against the real code on 2026-08-28.
- `docs/Estructura_Proyecto.md` — folder-structure map, also audited 2026-08-27 to match current code.
- `docs/Protocolo_Pruebas.md` — manual browser-driven test checklist covering everything built so far; update it when you add a user-facing feature rather than letting it drift.
- `docs/CHANGELOG.md` — iteration-by-iteration log; the 2026-08-27→28 entries cover (oldest to newest) the doc/code drift found in an audit, the HC gaps closed right after (vacunaciones UI, recordatorios routing, consulta edit/delete, quick-create dueño), the refresh token, the Tropera MVP, Tropera movimientos (F1.3), the migration-journal squash, Tropera eventos (F1.4), a fix pass after the user's first real run of `Protocolo_Pruebas.md` (tropera schema missing from the real dev DB, the `Field`-as-`<label>` click bug, missing datos-por-especie on animal creation, `UsuariosPage.tsx` password-reset UI), the portal magic-link UI (`PortalAccesoPage.tsx` + the "Generar acceso" button), the first real-Postgres migration test (`pgcrypto` fix, `especies` seed gap found), `db:seed` (closes that gap, plus fixes the `pgcrypto` fix itself breaking PGlite and an `import.meta.url` footgun — see above), Tropera's consolidated stock panel (F1.6), the Farmacia MVP (productos/stock/movimientos, mirroring Tropera's shape), and the Farmacia→HCE dispensa integration (F4.3: optional `consulta_id` on `movimientos_stock`, `DispensaPanel` in `PacienteDetallePage.tsx`). Clinical-records MVP, session robustness, Tropera F1.1–F1.4/F1.6, Farmacia's full basic slice including dispensa, the migration journal, both portal paths, and the full migrate+seed path against real Postgres are all closed/verified. Next up per the Roadmap: Tropera F1.5 (offline — mechanically simple but untestable end-to-end without a real mobile consumer), mobile/offline more broadly, or actually provisioning the VM (F0.1) — nothing code-side is blocking that anymore.
