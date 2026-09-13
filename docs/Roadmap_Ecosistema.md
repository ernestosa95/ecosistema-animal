# 🗺️ Roadmap del Ecosistema de Salud Animal

> Documento vivo. Consolida la planificación y la reencuadra para reflejar el giro de **producto único** a **ecosistema de soluciones**. Es la fuente de verdad de fases, stack y **estado de avance**. `Tropera_Alcace.md` mantiene el alcance funcional específico de Tropera; `Estructura_Proyecto.md` describe la estructura de carpetas; `CHANGELOG.md` lleva la bitácora por iteración.

**Última actualización:** 2026-09-05 (mobile con HCE completo verificado en un dispositivo físico real, analítica de uso, catálogos de referencia SENASA/vacunas/diagnósticos, landing page pública, recuperación de contraseña, y auditoría de production-readiness con el plan de despliegue revisado a Docker — ver `CHANGELOG.md`; antes, 2026-09-03: Fase 5c).

---

## 📊 Estado de avance

Leyenda: ✅ hecho · 🟡 parcial · ⏳ pendiente

| Área | Estado | Detalle |
|---|---|---|
| Scaffold monorepo + backend NestJS + Drizzle | ✅ | Backend arranca y responde por HTTP. |
| Autenticación (registro/login/JWT) | ✅ | Login y alta operativos; alta pasa por `solicitudes` con aprobación de admin (el registro directo sigue vivo en el backend pero sin uso desde la web). Refresh token: renovación automática y transparente ante un 401, sin cartel ni relogueo. |
| Multi-tenant (guards jwt/tenant/roles) | ✅ | Aislamiento por organización verificado. |
| Core: organizaciones, usuarios, membresías, personas, especies, animales | ✅ | |
| Consola de administración (`/admin`) | ✅ | Alta/baja de organizaciones y miembros, aprobación/rechazo de solicitudes de alta. Login propio de super-admin. **Home de facturación** (2026-09-03): pago por organización (¿pagó este mes?, próximo vencimiento según fecha de activación), ganancias acumuladas por período, planes con flag "disponible para altas nuevas". Ver Fase 5c. |
| Miembros de la organización (GET /usuarios) | ✅ | Lista usuarios/roles de la org para asignar turnos. |
| Identificación unívoca del paciente (código legible + Luhn, microchip ISO) | ✅ | 19 tests + prueba HTTP. |
| HCE — Consultas | ✅ | Alta, lectura, edición y borrado (soft delete). Formulario web expone motivo/anamnesis/examen físico/diagnóstico/tratamiento/peso/temperatura/observaciones. |
| HCE — Vacunaciones + recordatorios | ✅ | Backend + UI: alta de vacuna desde la ficha del paciente, y pestaña "Recordatorios" (antes código muerto, ya ruteada) para ver vencimientos y contactar al dueño. |
| HCE — Turnos (turnero) | ✅ | Backend **+ web**: agenda, calendario del mes, alta desde mostrador, asignación de profesional. |
| Portal del dueño | ✅ | Dos caminos operativos **con UI completa en ambos lados** desde 2026-08-28: público por código legible (`/c/:codigo`, una mascota, sin login) y magic-link emitido por staff desde `PersonasPage.tsx`/`RecordatoriosPage.tsx` (`?token=`, todas las mascotas del dueño, con solicitud de turno). Desde 2026-09-03: estilos unificados con el resto de la app (antes cada portal tenía su propia paleta), envío del link por WhatsApp desde Recordatorios, y foto de perfil de la mascota (sólo en el magic-link, con compresión 100% del lado del cliente). Ver Fase 5c. Ver nota de nombres duplicados en `Estructura_Proyecto.md`. |
| Datos específicos por especie | ✅ | JSONB en backend + conectados en la web (alta/edición/ficha). |
| Edición (PATCH) de pacientes y dueños | ✅ | |
| App web (login, animales, dueños, ficha, alta, edición, turnos, portal, admin) | ✅ | React + Vite, CSS propio. Ruteo por URL (`/`, `/admin`, `/c/:codigo`) + home según rol. |
| Tutorial guiado (tour interactivo por rol) | 🟡 | `react-joyride`. 4 tours (administrativo/veterinario/recepción/capataz), se dispara solo la primera vez que un usuario entra (flag en `localStorage`) y se puede reabrir con "❓ Ayuda" en el topbar. `vite build` limpio y smoke test con el dev server real, pero **sin verificar clic a clic en un navegador** — no hay herramienta de automatización de browser en este entorno; la lógica se trazó a mano paso por paso, pendiente de probar en vivo. |
| Carnet y ficha PDF del paciente | ✅ | Dos documentos, ambos desde datos reales vía Drizzle: `GET /animales/:id/carnet.pdf` (tarjeta CR80, tipo DNI, para llevar encima) y `GET /animales/:id/ficha.pdf` (hoja A4, registro completo con vacunas/desparasitaciones/tratamientos — cubierto por el `producto` de texto libre de `hce.vacunaciones`, sin necesitar un `tipo` nuevo). `personas.domicilio` ya está modelado (texto libre) y la ficha lo imprime. |
| Base local PGlite para desarrollo (sin instalar Postgres) | ✅ | Driver configurable + migraciones + seeds. |
| Motor de sincronización offline (pull/push) | ✅ | `sync/` implementado: contrato compatible con `synchronize()` de WatermelonDB, multi-tenant, última-escritura-gana, soft delete. Cubre `core`/`hce` **y ahora `tropera.*`** (F1.5, 2026-08-28): `establecimientos`/`existencias`/`movimientos`/`eventos` en el registry, con un hook `afterCreate` que aplica el mismo ajuste transaccional de `existencias` que el alta online (`aplicarMovimiento`, compartida con `MovimientosService`). Probado (`test:sync-demo`, incluye rechazo de stock negativo y no-duplicación en reintentos). |
| App móvil (React Native/Expo) | 🟡 | Ya no es el scaffold default, y ya no es sólo Tropera: login + sesión + WatermelonDB conectado a `/sync`, con Home ("centro de operaciones"), Animales/ficha del paciente (consultas, vacunaciones con calendario nativo para "próxima dosis", foto con cámara/galería), Turnos (filtro Hoy/Próximos/Todos + "Atender"), Farmacia (venta rápida/ingreso de stock con alta de producto inline), Tropera completo, catálogos de referencia con búsqueda, analítica de uso y "olvidé mi contraseña" — **verificado en un dispositivo Android físico real** (no sólo emulador) desde el 2026-09-04, instalado y usado por el usuario en su propio celular. Gap real que sigue pendiente: no hay ningún build de release firmado (todo lo corrido hasta ahora es `expo run:android` debug atado al dev-client de la PC) — no instalable por un tercero sin EAS Build o un `assembleRelease` propio, ver `docs/Plan_Despliegue.md`. |
| Tropera (schema + módulos ganaderos) | ✅ | Establecimientos + hacienda por conteo agregado + movimientos con ledger transaccional + eventos sanitarios/reproductivos + panel consolidado + offline (F1.1–F1.6), backend + web + mobile — las 6 sub-fases verificadas de punta a punta, F1.5 primero en emulador y después en el dispositivo físico real de arriba. Sin seguimiento individual (ver nota de alcance en Fase 1), que sigue siendo una decisión de alcance explícita, no una deuda pendiente. Sus 18 acciones de escritura en la web están instrumentadas con analítica de uso (ver fila de abajo). |
| Farmacia / vademécum + stock | 🟡 | MVP básico (F4.2 parcial) + dispensa ligada a consulta (F4.3): catálogo de productos + stock actual + movimientos con historial y validación + dispensa desde la ficha del paciente, backend + web + mobile. F4.1 (SENASA) cubierto como catálogo de referencia con búsqueda, no como carga masiva del stock (ver nota de alcance en Fase 4); sin alertas (F4.4). |
| Catálogos de referencia (SENASA, vacunas, diagnósticos) | ✅ | (2026-09-04) Tres tablas globales de sólo-lectura (`farmacia.vademecum_senasa`, `hce.catalogo_vacunas`, `hce.catalogo_diagnosticos`), consumidas como campos de búsqueda-con-sugerencias en web y mobile — nunca restringen el campo a una lista cerrada, sólo asisten el autocompletado. |
| Analítica de uso (pantallas y acciones) | ✅ | (2026-09-04) `plataforma.eventos_uso` + panel "Analítica" en `/admin` (top pantallas/acciones/organizaciones por rango de fechas). Instrumentado en prácticamente toda acción de escritura de Huella y Tropera en la web, y en las pantallas/acciones principales del mobile. |
| Landing page pública | ✅ | (2026-09-04) `LandingPage.tsx`, mostrada cuando no hay sesión activa y la ruta no es `/login`. Precios armados dinámicamente desde los planes reales; cada plan linkea a `/login?plan=<id>` para arrancar el registro con ese plan preseleccionado. |
| Recuperar contraseña | ✅ | (2026-09-05) `POST /auth/forgot-password`/`reset-password`, token JWT stateless de 30 min (mismo patrón que el magic-link del portal), UI en web y mobile. Gap conocido: el dominio de envío de Resend sigue sin verificar, así que hoy no le llega el mail a un usuario real (ver `docs/Plan_Despliegue.md`). |
| Caja: apertura rápida + estadísticas | ✅ | Ver Fase 5c (2026-09-03). El primer cobro/venta del día abre la caja solo si no hay una abierta (antes bloqueaba con "Ir a Caja"); egresos siguen exigiendo una caja ya abierta a propósito. Nueva pestaña "Estadísticas" (totales del período, por método de pago, por día). |
| Onboarding: wizard de configuración rápida | ✅ | Ver Fase 5c (2026-09-03). Se dispara una sola vez, al primer login del `propietario` de una organización recién aprobada: alta de usuarios (respeta el cupo del plan) + agenda de veterinario(s) + agenda de peluquería canina. |
| Facturación (ARCA) | ⏳ | No confundir con el "Home de facturación" de la Fase 5c (control de pagos manual entre la plataforma y sus organizaciones clientes) — esta fila es la integración con ARCA/WSFE para que cada organización facture a sus propios clientes, sigue sin arrancar. |
| Deploy en VPS (Postgres real) | ✅ | (2026-09-13) VPS DonWeb aprovisionada y desplegada siguiendo `docs/Plan_Despliegue.md`: `https://app.huella.site` / `https://api.huella.site` con HTTPS (Let's Encrypt vía Caddy), Postgres real con las 37 migraciones + los 4 seeds, backups diarios por cron **probados con un restore real**. Gaps de production-readiness que siguen pendientes antes de invitar una clínica real: verificar el dominio en Resend (los emails transaccionales todavía sólo quedan logueados), error tracking, y correr el `Protocolo_Pruebas.md` contra el ambiente real — ver el detalle en `docs/Plan_Despliegue.md`. |

**Verticales cerradas:** el "reality check" (backend real por HTTP) y "hacerlo tangible" (web funcional) están completos. El ecosistema funciona hoy de punta a punta: navegador → API → base, con el turnero operando desde el mostrador. La HC clínica ya cierra el circuito completo — consultas (con edición/borrado), vacunaciones, recordatorios, carnet y portal — así que el **MVP funcional de historia clínica está cerrado**, y la sesión tiene refresh token. Tropera tiene establecimientos + hacienda por categoría + movimientos con historial y validación de stock + eventos sanitarios/reproductivos + panel consolidado + offline (F1.1–F1.6) — el backend de offline está probado (`test:sync-demo`), y desde el 2026-09-04 el mobile corre de punta a punta en un dispositivo físico real, no sólo el backend. Farmacia tiene su MVP básico (catálogo + stock + movimientos, F4.2 parcial) más la dispensa ligada a consulta (F4.3). Migración y seed ya se validaron contra un Postgres real, y desde el 2026-09-13 corren en el propio deploy de producción (`huella.site`). Analítica de uso, catálogos de referencia, landing page pública y recuperación de contraseña están cerrados de punta a punta (2026-09-04/05). Lo que queda pendiente (búsqueda de animales en servidor, un build de release del mobile, HCE offline, facturación, verificar Resend en producción) es robustez, alcance y ejecución, no funcionalidad core faltante en lo ya construido.

---

## 🌐 Visión general

El ecosistema (nombre paraguas *a definir*) agrupa soluciones de salud y gestión animal sobre una **base de datos y backend propios**, con control total y costo de infraestructura tendiente a cero.

**Soluciones:**

* **Tropera** — Gestión de emprendimientos ganaderos (producción, hacienda, sanidad de rodeo).
* **HCE Animal** — Historia Clínica Electrónica veterinaria (registro clínico, turnero, farmacia, stock, facturación).

**Principio articulador:** un mismo `animal` vive en un tronco común (`core`) y puede ser, a la vez, una cabeza de hacienda en Tropera **y** un paciente con historia clínica en la HCE. Esto habilita el seguimiento individual (ej. cría de animales de raza) sin duplicar datos.

---

## 🧱 Stack tecnológico (decisiones firmes)

| Capa | Tecnología | Estado / Nota |
|---|---|---|
| **Infraestructura (prod)** | **VPS paga** (ver `docs/Plan_Despliegue.md` para el detalle de recursos/proveedor) | ✅ Contratada y desplegada (2026-09-13): DonWeb Cloud Server (4 vCPU/8GB/30GB, Ubuntu 24.04), Docker, Caddy con HTTPS automático en `app.huella.site`/`api.huella.site`. Se descartó la idea original de una VM de Oracle Cloud Always Free (ARM Ampere) — capa gratuita atractiva en el papel, pero con recursos ARM más chicos e imprevisibles para un primer deploy. |
| **Base de datos** | **PostgreSQL** self-hosted, organizado por *schemas* | ✅ Corriendo en producción desde el 2026-09-13 (contenedor propio, no compartido con otros proyectos de la VPS) — 37 migraciones + los 4 seeds aplicados, backups diarios probados con un restore real. |
| **Base local (dev)** | **PGlite** (Postgres embebido en proceso) | ✅ Permite correr sin instalar nada. Driver configurable por `DATABASE_DRIVER`. |
| **Backend / API** | **NestJS** (TypeScript) | ✅ Operativo. Auth propia (JWT), API REST. |
| **ORM** | **Drizzle** (SQL-first, multi-schema) | ✅ Adoptado. Migraciones con `drizzle-kit`. |
| **App web** | **React + Vite**, **CSS propio** (sin framework de estilos) | ✅ Funcional. |
| **App móvil** | **React Native + Expo** | 🟡 Login + Tropera + HCE (Home, ficha, consultas/vacunaciones, Turnos, Farmacia) conectados a `sync/`, verificado en un dispositivo físico real desde 2026-09-04. `app.json`/`eas.json` ya listos para el build de release (package `com.huella.app`, perfil `preview` para APK) desde 2026-09-13 — falta correr el build en sí (EAS) para instalar fuera del dev-client de la PC. |
| **Base local móvil (offline)** | **WatermelonDB** | ✅ Decidido (2026-08-28): el backend ya estaba diseñado compatible con su `synchronize()`, así que minimiza código de cliente frente a Expo SQLite a mano. |
| **PDF (carnet/reportes)** | Generación desde el backend (`@react-pdf/renderer`) | 🟡 Carnet con datos mock; falta conectar a la base. |

**Cambio respecto de la estrategia anterior:** se abandonó el BaaS gestionado (Supabase). Autenticación, autorización, backups y API son responsabilidad del backend propio.

---

## 🏛️ Arquitectura de datos (schemas)

* `core` — `organizaciones` (tenant), `usuarios` (auth), `membresias` (rol por organización), `personas` (dueños/humanos), `especies`, `animales` (ficha base, con `datos_especificos` JSONB). ✅
* `tropera` — `establecimientos` (campos) ✅, `existencias` (hacienda por categoría, conteo agregado) ✅, `movimientos` (nacimiento/compra/muerte/venta/traslado, ajusta `existencias` en transacción) ✅, `eventos` (sanitarios/reproductivos, sólo registro) ✅; lotes individuales ⏳.
* `hce` — `consultas`, `vacunaciones`, `turnos`. ✅
* `farmacia` — `productos` (vademécum) ✅, `stock` ✅, `movimientos_stock` ✅ (con `consulta_id` opcional para dispensas, F4.3) ✅.
* `stock` — existencias generales (insumos, fármacos). ⏳
* `facturacion` — comprobantes. ⏳

> Nota de diseño: `establecimientos` (los campos) vive en el schema `tropera`, no en `core`, por ser específico de la ganadería. `core` conserva sólo lo transversal a todas las soluciones.

---

# Fases del ecosistema

Cada fase es un **incremento entregable y usable**. Marcadores: ✅ hecho · 🟡 parcial · ⏳ pendiente.

---

## 🏗️ Fase 0 — Fundaciones del ecosistema — 🟡

**Objetivo:** Levantar la infraestructura propia y el tronco común (`core`).

* **F0.1** ✅ (2026-09-13) VPS DonWeb aprovisionada y asegurada (usuario sin privilegios, firewall, fail2ban, SSH sólo por clave), PostgreSQL real corriendo en contenedor propio — ver `docs/Plan_Despliegue.md`. *(En dev se sigue usando PGlite.)*
* **F0.2** ✅ Scaffolding del backend NestJS (estructura modular por schema, variables de entorno).
* **F0.3** ✅ Autenticación propia (registro, login, JWT + refresh token, rotación en cada renovación).
* **F0.4** ✅ Modelo `core` (organizaciones, usuarios, membresías, personas, especies, animales).
* **F0.5** ✅ Endpoints de sincronización `pull`/`push` (última-escritura-gana; ver `sync/` en `Estructura_Proyecto.md`). Consumidor real: `apps/mobile` — Tropera desde el 2026-08-28, y desde el 2026-09-04 también HCE (animales/consultas/vacunaciones/turnos), verificado de punta a punta en un dispositivo físico real.
* **F0.6** 🟡 (2026-09-13) Backups automáticos (`pg_dump` + volumen `uploads`, cron diario) **probados con un restore real** contra el ambiente de producción. Pendiente: copia fuera de la VPS (hoy sólo protege contra "borré algo", no contra "se rompió el disco") y monitoreo básico (uptime externo, error tracking).

**Adicional hecho:** guards multi-tenant, migraciones con drizzle-kit, base local PGlite con seeds, provider de base configurable dev/prod, y endpoint de miembros (`GET /usuarios`).

---

## 🐄 Fase 1 — Tropera sobre el backend propio — ✅

**Objetivo:** Construir el MVP de Tropera sobre la infraestructura del ecosistema.

> **Decisión de alcance (2026-08-27, confirmada con el usuario antes de codear):** no existía ningún diseño previo de Tropera en el repo pese a lo que decían los docs (ver `CHANGELOG.md`). Se arrancó por F1.1+F1.2 nada más, y la hacienda se modela como **conteo agregado por categoría** — no como una fila individual por cabeza en `core.animales`. Esto es más simple y realista para un rodeo comercial grande, pero **implica que el "principio articulador"** de la sección de arriba (mismo animal individual compartido entre Tropera y HCE) **no aplica hoy**. Si más adelante se necesita seguimiento individual (ej. reproductores de pedigrí), es un cambio de modelo, no una extensión incremental — conviene decidirlo explícitamente antes de tocar F1.3 en adelante.

* **F1.1** ✅ Alta y administración de establecimientos ganaderos (`tropera/establecimientos`, backend + web).
* **F1.2** ✅ Carga de hacienda por categorías (vaca, toro, ternero, ternera, vaquillona, novillo) — conteo agregado por establecimiento, editable desde la web.
* **F1.3** ✅ Movimientos: nacimiento/compra (alta), muerte/venta (baja), traslado entre establecimientos — cada uno ajusta `existencias` en una transacción (si no hay stock suficiente para una baja, se rechaza sin tocar nada) y queda en un historial consultable por establecimiento. La corrección manual directa (`PATCH existencias`, sin dejar rastro) sigue existiendo para cargas iniciales/ajustes de inventario.
* **F1.4** ✅ Eventos sanitarios (`vacunacion`, `desparasitacion`, `tratamiento`) y reproductivos (`servicio`, `diagnostico_prenez`, `destete`) — sólo registro, no ajustan `existencias`. `categoria`/`cantidad` opcionales (puede aplicar a toda la hacienda del establecimiento).
* **F1.5** ✅ Registro offline en campo + sincronización. Backend (2026-08-28): `existencias` sumó `deleted_at`, `movimientos`/`eventos` sumaron `updated_at`/`deleted_at`, y las 4 tablas están en el registry de `sync/` — `movimientos` con un hook `afterCreate` que ajusta `existencias` (mismo camino que el alta online, incluye rechazo de stock negativo) para que un movimiento cargado offline no bypasee esa validación. Probado con `test:sync-demo`. También se encontró y corrigió un gap preexistente: `SyncModule` nunca había sido registrado en `AppModule`, así que `/sync` daba 404 pese a estar completamente implementado. Mobile (`apps/mobile`): WatermelonDB + pantallas de alta de movimiento + sincronización automática (dejó de ser manual, ver nota de 2026-09-04 más abajo), **verificado primero en un emulador Android real** — login, sync inicial, alta de movimiento offline y detalle de existencias funcionando de punta a punta contra el backend real. Desde el 2026-09-04 el mismo circuito (y el resto de la app, con HCE ya sumado) corre verificado en un **dispositivo físico Android real**, no sólo el emulador.
* **F1.6** ✅ Panel de resumen de stock por categoría: matriz establecimiento × categoría con totales por fila/columna, en la web arriba del listado de establecimientos (visible con 2+ establecimientos).

**Entregable:** establecimientos, hacienda por categoría, movimientos (con historial y validación de stock), eventos sanitarios/reproductivos, panel consolidado y offline operables desde la web y, para F1.5, también desde el mobile — verificado de punta a punta primero en un emulador y después (2026-09-04) en un dispositivo físico real.

---

## 🩺 Fase 2 — HCE Animal: núcleo clínico — ✅ (salvo offline)

* **F2.1** ✅ Alta de persona/dueño (DNI, nombre, apellido, sexo, fecha, contacto) — con edición.
* **F2.2** ✅ Alta de animal/paciente (set mínimo, dueño asociado) — con edición. Si el dueño no existe todavía, se crea inline desde el mismo formulario ("＋ Crear dueño nuevo…": nombre/apellido/celular/DNI), sin salir a la sección Dueños.
* **F2.3** ✅ Datos específicos por especie vía JSONB — **conectados en la web** (alta, edición y ficha) con catálogo editable (`config/especieDatos.ts`).
* **F2.4** ✅ Identificación unívoca: código legible `ESP-PAÍS-SECUENCIA-DV` (Luhn) + microchip ISO 11784/11785.
* **F2.5** ✅ Registro clínico (consultas): motivo, anamnesis, examen físico, diagnóstico, tratamiento, peso, temperatura, observaciones — con edición y borrado (soft delete) de una consulta ya cargada.
* **F2.5b** ✅ Vacunaciones: alta desde la ficha del paciente (producto, fecha, próxima dosis, lote) + pestaña "Recordatorios" para ver vencimientos y contactar al dueño (WhatsApp/llamada).
* **F2.6** ✅ Carnet del paciente en PDF — descargable desde la ficha (`GET /animales/:id/carnet.pdf`), con datos reales vía Drizzle (animal, especie, dueño, vacunaciones). Pendiente menor: domicilio del dueño (no modelado en `personas`, se imprime `—`).
* **F2.6b** ⏳ **Idea evaluada, no arrancada** (2026-09-05): dictado por voz para cargar Anamnesis/Examen físico (los campos de texto libre largo del form de consulta) — pedido explícito del usuario de evaluar, todavía sin decidir si se hace. Opciones consideradas: (1) Web Speech API del navegador — gratis, sin backend, sólo Chrome/Edge, la transcripción igual viaja a servidores de Google por debajo aunque sea "nativa del browser"; (2) un proveedor cloud de speech-to-text — mejor precisión y cross-browser/mobile, pero cuesta por uso y suma la primera dependencia externa de IA/ML del proyecto (hoy todo es determinístico); (3) reconocimiento nativo en mobile (Expo, mismo patrón de rebuild nativo que otros módulos ya documentado en `CLAUDE.md`); (4) dictado + estructuración automática de campos vía LLM — la más potente y la más riesgosa clínicamente si el modelo interpreta mal algo. Recomendación dada: pilotear la opción (1) acotada a 1-2 campos en la web antes de invertir en las demás — costo cero, se prueba en un día, valida si el vet realmente lo usa. En cualquier opción: el texto transcripto tiene que caer editable, nunca autocompletar sin revisión.
* **F2.7** ⏳ Registro clínico offline (el motor `sync/` ya sincroniza `consultas`/`vacunaciones`; falta la app móvil que lo consuma).

**Entregable:** HCE con ficha completa (incl. datos por especie), historia clínica editable, vacunaciones y carnet, operable desde la web de punta a punta. Sólo queda offline (F2.7), que depende de la app móvil.

---

## 📅 Fase 3 — HCE Animal: turnero y portal del dueño — 🟡

* **F3.1** ✅ Turnero: solicitud de cita (canal portal, solicitante autoresuelto desde el dueño).
* **F3.2** ✅ Gestión de agenda (confirmar, reprogramar, cancelar, atender) con estados terminales.
* **F3.3** ✅ Turnero en la **web**: agenda diaria + calendario del mes, alta desde mostrador con **alta de paciente y dueño inline**, y **asignación de profesional** (`veterinarioId` en `POST /turnos` + `GET /usuarios`).
* **F3.4** ✅ Pantalla de inicio según rol: los perfiles administrativos (`propietario`, `admin`, `recepcion`) entran directo al turnero.
* **F3.5** ✅ Portal del dueño: resumen de la historia clínica de su animal, por dos caminos, **ambos con UI completa** — público por código legible (`/c/:codigo`, `PortalDuenoPage.tsx`, una mascota) y magic-link emitido por staff (`?token=`, `PortalAccesoPage.tsx`, todas las mascotas + solicitud de turno; el botón para generarlo vive en `PersonasPage.tsx`).
* **F3.6** ✅ Recordatorios de vacunas: pestaña "Recordatorios" en la web (`GET /vacunaciones/recordatorios`), con contacto directo por WhatsApp/llamada al dueño. Sigue sin notificaciones proactivas (push/email) de turnos — hoy es una pantalla que el staff tiene que ir a mirar, no algo que avisa solo.
* **F3.7** ⏳ Check-in "marcar llegada / sala de espera" en el mostrador (campo `hora_llegada`, sin migrar el enum).

**Nota:** el turnero, el portal del dueño y los recordatorios ya operan de punta a punta en la web. Falta el envío proactivo de notificaciones (push/email/WhatsApp automático).

---

## 💊 Fase 4 — Farmacia y Stock — 🟡

> **Nota de alcance (2026-08-28):** igual que con Tropera, no había ningún diseño previo de esta vertical — se arrancó por lo básico (catálogo + stock + movimientos), confirmado con el usuario, mirroreando la estructura de Tropera. `categoria` en `productos` es texto libre (no un enum cerrado como las categorías de hacienda) porque un vademécum real es demasiado variado para eso.
>
> **Ampliación de alcance (2026-09-01):** dejó de ser sólo vademécum — la web ("Farmacia y stock") ahora cubre explícitamente cualquier insumo de mostrador (alimento, accesorios, forraje), con `esMedicamento`/`esFraccionable` (booleans nuevos en `productos`) marcando qué es y decidiendo qué campos pedir. Categoría/unidad/presentación siguen siendo texto libre en la base pero el alta sólo ofrece una lista cerrada en el frontend. Nuevo flujo "+ Ingresos": alta de stock para un producto existente con calculadora de bultos y los dos precios (`precio` venta, `precioCompra` costo, columna nueva) — el precio salió del alta de producto.

* **F4.1** 🟡 (2026-09-04) Poblado **como catálogo de referencia, no como carga masiva del stock de cada organización**: nueva tabla global `farmacia.vademecum_senasa` (7003 filas, seedeada desde un CSV real de SENASA), consultable vía `GET /farmacia/vademecum-senasa?buscar=` y expuesta en el frontend (`BuscadorSenasa.tsx`) como sugerencias de autocompletar sobre el campo "nombre" del alta de producto — nunca restringe a lo que ya está en el catálogo, sigue siendo texto libre. Deliberadamente **no** es un import masivo que crea productos reales en el stock de cada organización — el vademécum de una clínica real es un subconjunto de lo que efectivamente stockea, no la lista nacional entera; esa sería una funcionalidad distinta (y no pedida) si en algún momento hiciera falta.
* **F4.2** 🟡 Gestión de stock general: existencias (`GET /farmacia/stock`, corrección directa) ✅; entradas/salidas con historial (`movimientos_stock`: compra/uso/vencimiento/merma, transaccional, rechaza si deja negativo) ✅; vencimientos (fecha de vencimiento por lote) ⏳ — hoy el tipo `vencimiento` registra que algo venció, pero no hay campo de fecha de vencimiento por lote para alertar con anticipación.
* **F4.3** ✅ Dispensa de fármacos ligada a la consulta: un `movimientos_stock` de tipo `uso` con `consulta_id` opcional, cargada desde un panel en la ficha del paciente (`PacienteDetallePage.tsx`). La FK real `hce.vacunaciones.vademecum_id → farmacia.productos.id` sigue sin existir (fuera de alcance a propósito) — la dispensa queda ligada a la consulta, no a una vacunación puntual.
* **F4.4** ⏳ Alertas de stock bajo y vencimientos.

---

## 🧾 Fase 5 — Facturación — ⏳

> ⚠️ **Complejidad regulatoria:** la facturación electrónica en Argentina exige integración con **ARCA (ex-AFIP)** vía web services (WSFE), certificados y CAE. Reservada para después de validar HCE + stock.

* **F5.1** ⏳ Comprobantes internos (presupuestos/remitos).
* **F5.2** ⏳ Integración con ARCA (WSFE).
* **F5.3** ⏳ Reportes de facturación.

---

## 📊 Fase 5b — Plataforma: dashboard de indicadores + admin (planes, acceso, mensajes) — 🟡

> Arrancada el 2026-08-28 a pedido explícito del usuario, con alcance acordado de antemano (3 preguntas antes de codear): ambas partes en paralelo, mensajes dirigidos por organización **o por grupo de organizaciones** (concepto nuevo), y planes estructurados desde ya (tabla propia, sin lógica de facturación real — eso sigue en Fase 5/ARCA). Alcance **sólo web** — sin equivalente en `apps/mobile` todavía.

* **F5b.1** 🟡 Dashboard de indicadores (`GET /dashboard/resumen`, `DashboardPage.tsx`): pacientes activos, consultas del mes, turnos del mes por estado y vacunas por vencer para organizaciones `clinica`/`mixta`; existencias actuales y movimientos del mes por tipo para `establecimiento`/`mixta`. Nueva pantalla "Resumen", landing de `propietario`/`admin` en vez del turnero. Backend probado por lógica de conteo estándar de Drizzle; **sin verificar visualmente en el navegador** (sin credenciales disponibles en la sesión que lo construyó).
* **F5b.2** ✅ Control de acceso por organización: `organizaciones` suma `grupoId`/`planId`/`accesoHasta`/`esDemo`; `TenantGuard` rechaza con 403 si `accesoHasta` venció (null = sin vencimiento, no afecta orgs existentes). Planes (`admin/planes`, CRUD con nombre/precio/descripción) y grupos de organizaciones (`admin/grupos-organizaciones`) como catálogos nuevos, gestionables desde `AdminPage.tsx`. Probado con `test:plataforma-demo`.
* **F5b.3** ✅ Mensajes de la plataforma (anuncios, no chat): el admin redacta y dirige a "todas" / una organización / un grupo (`admin/mensajes`); cada usuario ve un banner descartable al loguearse (`GET /mensajes/pendientes`, `MensajesBanner.tsx`) que no vuelve a aparecer tras marcarlo leído. Probado con `test:plataforma-demo` (dirigido por grupo, aislamiento entre grupos, broadcast global, idempotencia del descarte).

**Entregable:** backend completo y probado (`pnpm --filter backend test:plataforma-demo`), web compilando limpio. Pendiente de **verificación manual en el navegador** de los tres flujos (dashboard clínica vs. campo, ciclo completo de acceso/vencimiento en el admin, banner de mensajes) antes de considerarlo cerrado — no se pudo hacer en la sesión que lo construyó por falta de credenciales de prueba a mano.

---

## 💳 Fase 5c — Negocio de la plataforma: facturación operativa, onboarding y mejoras de Huella — ✅ (2026-09-03)

Lote grande de pendientes de negocio pedido de una sola vez, dividido en 5 entregas y una pasada final de verificación real en el navegador (headless Chromium, ad-hoc para esa sesión). Detalle completo de cada una en `CHANGELOG.md` (cinco entradas del 2026-09-03 con ese mismo título temático) — acá sólo el resumen de qué quedó cerrado.

* **Home de facturación** ✅: `organizaciones` suma `fechaActivacion` (día del mes que define cuándo se factura). Nueva tabla `plataforma.pagos` (registro manual, sin pasarela de pago integrada). Pantalla "Home" en `/admin`: pago por organización (¿pagó este mes?, próximo vencimiento), ganancias acumuladas por período. `planes.activo` (ya existía, sólo le faltaba que algo lo hiciera cumplir) ahora bloquea de verdad asignar/solicitar un plan deshabilitado.
* **Solicitud de cuenta + selección de plan** ✅: el form público de alta ya sólo ofrece "cuenta nueva" (se sacó "unirme a una organización existente" de la UI), pide datos filiatorios completos (teléfono/DNI pasan a obligatorios) y un plan obligatorio — mostrando cuántos usuarios de cada rol incluye. Nuevo catálogo `config/rolesInfo.ts` + `<InfoRoles />` ("¿Qué puede hacer cada rol?"), visible ahí y en Planes de `/admin`. Al aprobar, el plan elegido y la fecha de activación se aplican solos a la organización nueva.
* **Wizard de configuración rápida** ✅: se dispara una única vez, al primer login del `propietario` de una organización recién aprobada — alta de usuarios (respetando el cupo del plan, gap real que no existía: antes sólo el super-admin podía agregar miembros) → agenda de veterinario(s) → agenda de peluquería canina → fin, cada paso salteable.
* **Portal del dueño** ✅: estilos unificados con el resto de la app en las dos superficies (antes cada una tenía su propia paleta hardcodeada), envío del link de acceso por WhatsApp desde Recordatorios, y foto de perfil de la mascota (sólo desde el magic-link, no desde el acceso público por código — decisión de alcance deliberada) con compresión 100% del lado del cliente (no hay librería de imágenes en el backend).
* **Huella operativo** ✅: botón "Atender" en "Turnos de hoy" del Home (marca el turno atendido y abre la ficha con la consulta lista para cargar); apertura automática de la caja con el primer cobro/venta del día (no con "atender" un turno — ese evento no involucra dinero y en la mayoría de los casos lo hace un veterinario, que no tiene permiso para abrir caja); costo obligatorio en las consultas (sin generar un cobro automático, sigue siendo un dato de referencia); nueva pestaña "Estadísticas" en Caja.
* **Verificación real en el navegador** ✅ (no sólo backend/build): se instaló Playwright ad-hoc, se levantó un backend/web aparte contra una base descartable, y se recorrió el flujo completo de punta a punta con capturas reales. Encontró y corrigió **dos bugs reales** que ningún `test:*-demo` cubría: la lista de organizaciones no se refrescaba sola tras aprobar una solicitud, y las fotos subidas quedaban en `dist/uploads/` en vez de `apps/backend/uploads/` (se hubieran perdido en el próximo rebuild).

**Entregable:** las 18 suites `test:*-demo` del backend en verde (se encontró y corrigió de paso una regresión silenciosa: agregar `fechaActivacion`/`costo` a tablas compartidas había roto 12 de los tests preexistentes, sin que ningún chequeo de rutina lo mostrara), `tsc`/`vite build` limpios, y — a diferencia de casi todas las fases anteriores de este roadmap — **verificado de punta a punta en un navegador real**, no sólo por API/lógica.

---

## 🧭 Fase 6 previa — Evolución UI/UX (spec grande, 2026-08-28) — Fase A ✅ · Fase B 🟡 · Fase C 🟡 · Fase D 🟡 · Fase E ✅ (backend/lógica, ver nota de verificación)

El usuario compartió una especificación UI/UX grande (`2c2d86bf-ecosistema_animal_uiux_spec.md`, 8 roles: recepción, veterinario clínico, propietario/gerente, peón de manga, veterinario sanitarista, encargado de estancia, tutor/portal). Se hizo un análisis de gaps contra el código real (no asumido) y se dividió en fases, porque varias secciones dependen de dos decisiones de arquitectura de fondo:

1. **Role stacking (§1.1):** un usuario puede tener más de un rol apilado en la misma organización — resuelto en Fase A (ver abajo).
2. **Seguimiento individual de animales en Tropera** (fichas transitorias `#TEMP`, caravana-tubo, apartados por potrero — §5.2, §5.3, §6): **contradice la decisión de alcance ya tomada** en Tropera ("conteos agregados por categoría, no una fila por cabeza" — ver nota en Fase 1). Resuelta el 2026-08-29 (una pregunta, opción recomendada): **modelo híbrido** — se suma seguimiento individual (`tropera.animales_campo`) en paralelo a los conteos agregados, sin migrarlos ni tocarlos. Desbloqueó Fase E (ver abajo, E.1 arrancada).

Fases propuestas (E a definir en detalle cuando se llegue): **A** fundacional (role stacking + omnibox + persistencia local) → **B** clínica (delta editing, macros, timeline médica, calculadora de dosificación) → **C** dashboard ejecutivo con drill-down + exportación → **D** caja/financiero (depende de un módulo de caja que no existe, adelanta parte de la Fase 5) → **E** campo individual (bloqueada por la decisión #2).

### Fase A — Role stacking + Omnibox (Ctrl+K) + Persistencia local de formularios — ✅

* **Role stacking**: `membresias.rol` pasó de enum único a arreglo (`roles core.rol_membresia[]`, migración `0006_medical_mister_fear.sql` con `USING ARRAY[rol]` — cero pérdida de datos). `TenantGuard` resuelve `req.roles` (arreglo); `RolesGuard` deja pasar si **alguno** de los roles del usuario coincide con los requeridos por `@Roles(...)` (los 24 usos existentes no cambiaron). Nuevo endpoint `PATCH /admin/organizaciones/:id/miembros/:membresiaId/roles`. Web: `Sesion.roles: string[]`, los 6 sets `ROLES_X` de `App.tsx` pasan de `.has(sesion.rol)` a `tieneAlguno(sesion.roles, ROLES_X)` — un usuario con roles apilados ve la **unión** de tabs de todos sus roles, sin rediseñar la nav. `AdminPage.tsx` suma checkboxes de roles (alta) y un editor inline de roles por miembro. Probado con `test:roles-demo` (6/6) + los 8 `test:*-demo` existentes siguen pasando.
* **Omnibox (Ctrl+K/Cmd+K)**: 100% cliente (`Omnibox.tsx`), sin backend nuevo — reusa `GET /personas`/`GET /animales` (ya devuelven todo sin paginar). Fuzzy match propio (`utils/fuzzy.ts`, substring + Levenshtein acotado, sin librería nueva) sobre nombre/apellido/dni/teléfono/microchip/código legible, agrupado en Dueños/Pacientes con cruce de relación. Click en un dueño abre `PersonasPage` con esa persona expandida (`personaIdInicial` nuevo, opcional).
* **Persistencia local de formularios**: hook `useFormularioPersistente` (debounced a `localStorage`, TTL 24h). Aplicado a los dos formularios largos que motivan el pedido del spec: alta de paciente (`PacientesPage.tsx`) y alta/edición de consulta (`PacienteDetallePage.tsx`, clave separada por paciente+consulta para no mezclar el borrador de "nueva" con el de una edición en curso).
* Efecto colateral encontrado y corregido de paso: `App.tsx` llamaba a `api.obtenerAnimal()` (flujo "Atender" desde un turno) pero ese método **nunca existió** en `client.ts` — bug preexistente, no introducido hoy, agregado ahora.

**Entregable:** backend completo y probado (9 suites `test:*-demo`, 103 checks). Verificado en el navegador junto con el usuario (2026-08-28): sesión vieja en `localStorage`/`SecureStore` con forma `{ rol }` en vez de `{ roles }` rompía el arranque de la web (`sesion.roles is undefined`) — `useSesion` ahora descarta cualquier sesión sin arreglo `roles` en vez de crashear. El borrador de formulario no volvía a aparecer tras una recarga porque el form vive detrás de un toggle ("+ Nuevo…") que arranca cerrado — nuevo helper `hayBorrador()` auto-abre el form si hay un borrador pendiente (`PacientesPage.tsx`, `PacienteDetallePage.tsx`). De paso, verificando el sync del mobile se encontró un bug no relacionado a Fase A pero real: WatermelonDB genera ids propios (16 caracteres alfanuméricos), no UUID, y las columnas `id` del backend son `uuid` — cualquier alta offline fallaba el push con "invalid input syntax for type uuid", traducido por `DbErrorFilter` a un 404 "Recurso no encontrado" confuso. Fix: `apps/mobile/src/db/uuid.ts` genera un UUID v4 real en el cliente, sobreescribiendo `_raw.id` en los 5 lugares donde el mobile crea registros offline (personas, animales, consultas, vacunaciones, movimientos de tropera). Roles apilados y Omnibox se dan por buenos (mismo patrón ya usado en otras partes probadas de la web), sin un chequeo dedicado adicional.

### Fase B — Clínica: macros, indicaciones/dosificación, plan de tratamiento en el portal, delta editing + timeline — 🟡

* **Macros (§3.1)**: catálogo `hce.macros` por organización (siembra lazy de 14 macros default), CRUD (`hce/macros`), `MacroPicker` en `ConsultaForm` (anamnesis/examen físico/diagnóstico/tratamiento). Backend probado (`test:macros-demo`, 7/7).
* **Indicaciones + calculadora de dosis (§3.2, §3.3)**: `hce.indicaciones` cubre documento puntual y esquema continuo (`duracionDias`), con `origen` `stock_interno`/`receta_externa`. `IndicacionesPanel` en la ficha del paciente (mismo patrón que `DispensaPanel`/F4.3): calculadora de dosis a partir de peso × `dosisSugeridaMgKg`/`concentracion` del producto (nuevas columnas en `farmacia.productos`), con botón explícito "Confirmar dosis" — nunca se aplica sola. Al guardar con stock interno, dispara un `POST /farmacia/movimientos` para descontar inventario. Backend probado (`test:indicaciones-demo`, 12/12).
* **Plan de tratamiento en el portal (§8.1)**: los dos caminos del portal (público por código y magic-link) devuelven `tratamientos`; `PortalDuenoPage.tsx`/`PortalAccesoPage.tsx` lo muestran con estado vigente/finalizado.
* **Delta editing + timeline médica (§3.1)**: `ConsultaForm` precarga peso/temperatura de la consulta anterior al dar de alta (sólo si no hay un borrador local ya guardado). Nuevo `HistoriaTimeline` (tarjetas por fecha con ícono 🩺/💉) + `DrawerItemLinea` (panel lateral con el detalle, sin interrumpir el resto de la página) sobre la tabla de historia clínica existente, que se mantiene intacta. FC/FR mencionados en el spec no se agregaron — no existen como campos en `hce.consultas`, sumarlos es un cambio de schema fuera de este alcance.

**Entregable:** backend completo y probado (11 suites `test:*-demo`), `nest build`/`vite build` limpios, `tsc --noEmit` de `apps/backend` contra `apps/web` sin errores nuevos atribuibles a este trabajo. **Verificado por API** (curl contra un backend efímero, sin tocar el `pgdata` real): registro → login → dueño → paciente → producto con concentración/dosis → compra de stock → consulta con peso → macros (siembra lazy) → indicación de stock interno con cálculo de dosis correcto → descuento real de stock → indicación con receta externa → plan de tratamiento idéntico en ambos portales → editar/finalizar/borrar por API. Gap cerrado de paso: `FarmaciaPage.tsx` no tenía los campos de concentración/dosis en sus formularios (sin eso la calculadora nunca se activaba). **Reverificado después contra datos reales** (usuario real `c@gmail.com`, animal real `duki`): macros, indicación con calculadora de dosis y descuento de stock, y portal — todo funcionó igual que en el backend efímero (ver `CHANGELOG.md`, 2026-08-29). Sigue sin verificarse sólo lo puramente visual del DOM (el `<select>` de macros, el drawer de la timeline abriendo/cerrando).

### Fase C — Dashboard ejecutivo: drill-down + centro de exportación — 🟡

Alcance acordado con el usuario antes de codear: §4.2 pide KPIs de facturación/ticket promedio que no existen en el sistema (Fase 5/ARCA, pausada a propósito) — se aplicó el drill-down sólo a los KPIs no monetarios que el dashboard ya tenía (F5b.1).

* **Drill-down (§4.2)**: cada tarjeta KPI de `DashboardPage.tsx` (pacientes activos, consultas del mes, vacunas por vencer, turnos por estado, movimientos por tipo, existencias por establecimiento) es clickeable y abre un drawer (`DrawerTabla.tsx`) con la tabla desglosada, fetch on-demand. Dos endpoints backend nuevos para poder desglosar lo que el dashboard ya cuenta: `GET /consultas?desde&hasta` (org-wide, antes sólo existía acotado a un paciente) y `desde`/`hasta` opcionales en `GET /tropera/movimientos`.
* **Centro de exportación (§4.5)** — ⚠️ **removido el 2026-09-01**, app-wide (Dashboard, Animales, Dueños, Farmacia, Tropera, Turnos). Tenía CSV/Excel/PDF genéricos (`ExportBar.tsx` + `utils/exportar.ts`, con `xlsx`/SheetJS como única librería nueva de la sesión que lo agregó); a pedido explícito del usuario dejó de existir. `utils/exportar.ts` sigue existiendo como `utils/columnasTabla.ts` (sólo el tipo `ColumnaExport` + `valorDe`, todavía usados por `DrawerTabla.tsx`).
* Plantillas de rol (§4.5, "Role Templates") no se tocaron — el alta de miembros con checkboxes de roles apilables (Fase A) ya cubre gran parte de la necesidad; una plantilla guardada es una mejora incremental, no bloqueante.

**Entregable:** backend probado por API contra un backend efímero (Tropera no tiene suite `test:*-demo` propia — gap preexistente): organización mixta, dashboard con ambos bloques, los dos endpoints nuevos con filtro de fecha y combinados con `establecimientoId`, todo respondiendo como se esperaba. `nest build`/`vite build` limpios, `tsc` sin errores nuevos. Reverificado contra datos reales: se encontró y corrigió un bug real (`DashboardService` contaba consultas soft-borradas, dando un número inconsistente con el drill-down — ver `CHANGELOG.md`, 2026-08-29). **Sin verificar en el navegador**: falta confirmar visualmente que los drawers abren/cierran bien y que las tres descargas (CSV/Excel/PDF) se abren correctamente en Excel y un lector de PDF real.

### Fase D — Caja chica, auditoría de cierres y honorarios — 🟡

Alcance acordado con el usuario antes de codear (4 preguntas, todas resueltas por la opción recomendada): precio en productos de Farmacia + concepto libre en servicios (nada de catálogo de precios completo); **una caja diaria por organización**, no turnos por cajero; honorarios como reporte exportable **sin** % de comisión automático; egresos con concepto libre, sin categorías. Fuera de alcance: §2.5 stock fraccionado con descuento proporcional (requeriría modelar capacidad por presentación) — una venta de mostrador hoy descuenta unidades enteras. Sigue así después del check `esFraccionable` agregado el 2026-09-01: ese campo es sólo informativo (marca qué productos se venden por porción de un bulto), no habilita cantidades decimales — `stock.cantidad`/`movimientos_stock.cantidad` siguen siendo enteros.

* **§2.6 caja chica y cierre**: nuevo schema `caja` (`cajas`/`cobros`/`egresos`). Abrir rechaza si ya hay una caja abierta; cerrar calcula lo esperado (inicial + cobros − egresos), lo compara contra el arqueo declarado, y decide automáticamente si el cierre queda `aceptado` (sin diferencia) o `pendiente` de auditoría (con diferencia) — la "alerta silenciosa a la gerencia" del spec.
* **§4.1 auditoría de cierres**: bandeja filtrable por estado (`propietario`/`admin` únicamente), con Aceptar/En revisión/Rechazar — las dos últimas exigen observación, validado en backend y en el form.
* **§4.4 liquidación de honorarios**: `cobros.veterinarioId` imputa el cobro a un profesional; `GET /caja/cobros/honorarios` trae el consolidado del rango (reusa `ExportBar` de Fase C) y `PATCH .../liquidar` marca como liquidados los cobros pendientes de ese rango — sin cálculo de comisión, ese % se resuelve fuera del sistema.
* **Venta de mostrador** (parte no-fraccionada de §2.5): `farmacia.productos` suma `precio`; `farmacia.movimientos_stock` suma el tipo `venta` — un cobro que referencia un producto dispara, desde el frontend, un segundo `POST /farmacia/movimientos` (mismo patrón desacoplado que `IndicacionesPanel` en Fase B), descontando stock real.
* `CajaPage.tsx` (nueva pestaña "Caja", roles de mostrador `propietario`/`admin`/`recepcion`): tres secciones internas (Caja del día, Auditoría, Honorarios), las dos últimas ocultas para `recepcion`.

**Entregable:** backend probado por API contra un backend efímero: apertura/rechazo de doble apertura, cobro sin caja abierta rechazado, venta con descuento real de stock, egreso, cierre con diferencia calculada correctamente (781 vs. 780 declarado → `pendiente`), auditoría con validación de observación obligatoria, honorarios y liquidación funcionando. `nest build`/`vite build` limpios. **Sin verificar en el navegador.** Desde el 2026-08-29, `test:caja-demo` cubre este flujo completo como regresión automática (16 checks).

### Fase E — Campo individual (modelo híbrido) — 🟡, corte E.1 de varios

Decisión de fondo resuelta con el usuario antes de codear: **modelo híbrido** — seguimiento individual convive con los conteos agregados de Tropera (F1.1–F1.6), sin migrarlos ni reemplazarlos. Fase E es más grande que B+C+D juntas, así que se ataca en cortes; E.1 es la pieza fundacional (identificar y seguir un animal), sin la cual nada más de la fase tiene sentido.

* **E.1 — Fichas individuales de campo (§5.2)** ✅: `tropera.animales_campo` (caravana real o transitoria `TEMP-N`, categoría, estado, sexo). Alta Express Transitoria (sin identificación, la caravana se asigna después vía secuencia); Bandeja de Conciliación (`GET ?transitorios=true` + `PATCH .../conciliar`) para asignar la caravana definitiva; `tropera.eventos` suma `animalCampoId` (ficha individual) y `retiroHasta` (retiro sanitario, con alerta en la ficha si está vigente). Nueva sección en `TroperaPage.tsx` dentro del detalle de establecimiento.
* **E.2 — Diagnóstico reproductivo (§6.1)** ✅: `tropera.hallazgos` (catálogo normalizado, siembra lazy) + `eventos.resultadoReproductivo`/`hallazgoId`. Grilla 1-tap (Preñada/Vacía/Anestro) y chips de hallazgo en `NuevoEventoForm`, sólo quando `tipo='diagnostico_prenez'`/`'tratamiento'`.
* **E.3 — Muestreos caravana-tubo, toros virtuales y evaluación andrológica (§6.2, parcial)** ✅: `tropera.muestras` (tubo + caravana, con `GET .../ultimo-tubo` para sugerir el siguiente y alertar saltos sin bloquear), `tropera.toros_virtuales` (catálogo de genética, referenciado desde un evento `servicio` vía `toroVirtualId`), `tropera.evaluaciones_andrologicas` (circunferencia + motilidad → `apto` calculado por el service, umbral simplificado ≥30cm/≥50%). **Protocolos IATF con tareas programadas a futuro queda explícitamente afuera** — es un concepto nuevo (tareas que se disparan solas en fechas futuras, nada parecido existe hoy) y se decidió no sumarlo apurado a este corte.
* **E.4 — Potreros y apartados rápidos (§5.3, §7.1)** ✅: `tropera.potreros` (subdivisión del establecimiento, no existía nada más chico que "establecimiento completo"). Reasignar potrero es el `PATCH` normal de `animales-campo` — un Apartado Rápido no es una acción separada. Si el animal tiene un retiro sanitario vigente, la web pide confirmación explícita antes de aplicar el cambio (alerta modal del spec).
* **E.5 — Modo plantilla 1-tap (§5.1)** ✅: `tropera.plantillas_tareas`/`plantilla_items` — una plantilla ("Vacuna + Antiparasitario + Pesaje") se aplica a un animal en un solo llamado, que crea todos los eventos de una (no queda nada "a medio cargar"). La revisión de UI field-ready (touch targets grandes, alto contraste) queda pendiente de un pase de diseño visual, no es algo que se resuelva a nivel de datos/lógica.
* **E.6 — Protocolos IATF y tareas programadas (§6.2, la parte diferida de E.3)** ✅: `tropera.protocolos_iatf`/`protocolo_iatf_pasos`/`tropera.tareas` — primer concepto de "tarea agendada a futuro" en todo el sistema (los `turnos` de HCE son citas con dueño, no esto). Aplicar un protocolo a un animal genera una tarea por paso en `fechaInicio + diaOffset`; completar/cancelar es un cambio de estado — no dispara la creación automática de un evento todavía (anotado como posible mejora futura, no bloqueante).

**Fix 2026-09-06** (auditoría de roles pre-despliegue): el rol `veterinario` no podía entrar a Tropera en absoluto — `ROLES_TROPERA` (nav) no lo incluía, aunque el backend ya le permitía evaluación andrológica/protocolos IATF/muestras/hallazgos/tareas desde que se construyó cada corte. Corregido sumando `veterinario` a `ROLES_TROPERA` + gating fino nuevo dentro de `TroperaPage.tsx` (`ROLES_TROPERA_CAMPO` vs `ROLES_TROPERA_VETERINARIO`, calcado de los `@Roles` reales de cada sub-feature) — ver `CHANGELOG.md`.

**Entregable E.1–E.6 (Fase E completa):** backend probado por API contra un backend efímero en cada corte: alta transitoria con secuencia correlativa, conciliación, retiro imputado a un animal, existencias agregadas sin verse afectadas (E.1); diagnóstico de preñez con resultado + hallazgo (E.2); toro virtual en un servicio, tubos correlativos, evaluación andrológica apta/no apta (E.3); potrero asignado vía Apartado Rápido (E.4); plantilla de 3 ítems aplicada creando exactamente 3 eventos (E.5); protocolo de 4 pasos generando tareas en las fechas exactas esperadas, completar sacándolas del filtro de pendientes (E.6). `nest build`/`vite build` limpios en los seis cortes, sin que ninguno tocara el modelo agregado de Tropera (F1.1–F1.6). **Sin verificar en el navegador** — toda la fase (y B/C/D) sigue pendiente de un pase visual con el usuario en su compu. Desde el 2026-08-29, `test:tropera-demo` cubre **las 6 sub-fases completas** como regresión automática (41 checks — ver `CHANGELOG.md`), no sólo F1.1–F1.6 + E.1 como en la primera versión de la suite.

---

## 🔗 Fase 6 — Integración cruzada y beta — ⏳

* **F6.1** ⏳ Seguimiento individual de animales que cruzan Tropera y HCE.
* **F6.2** ✅ Reportes y métricas transversales — cubierto por el dashboard de indicadores (F5b.1), aunque acotado a lo que cada organización ve de sí misma (no hay todavía una vista agregada multi-organización para el super-admin).
* **F6.3** ⏳ Telemetría, empaquetado y distribución para beta.

---

## 🧵 Consideraciones transversales

* **Offline-first:** el modelo ya incluye `updated_at`/`deleted_at` en todas las tablas sincronizables; falta construir el motor de sync (Fase 0.5).
* **Multi-tenant:** ✅ implementado y verificado (guards por rol y por tenant; la organización viaja en el header `X-Organizacion-Id`, nunca en el body).
* **Sesión en la web:** la sesión (`token`, `organizacionId`, `rol`) se guarda vía `useSesion` y se registra en el cliente de turnos desde `App.tsx` (fuente de verdad única).
* **Seguridad:** la autorización se resuelve en el backend (no se usa RLS). Opcional a futuro: sumar RLS de Postgres como defensa en profundidad.
* **Monetización:** modelo SaaS por organización. Ya implementado (2026-08-28, Fase 5b): `organizaciones.accesoHasta` bloquea el acceso vencido vía `TenantGuard`, `esDemo` marca renovaciones como prueba, y `planes` (nombre/precio/descripción) es un catálogo asignable — sin cobro automático todavía, eso sigue siendo Fase 5 (ARCA).

---

## ✅ Próximos pasos sugeridos

Con el core + HC (consultas + vacunaciones + recordatorios + carnet) + turnero + portal del dueño + admin (incluida la facturación de plataforma y el onboarding, Fase 5c) + refresh token + Tropera completo (F1.1–F1.6, incluido offline verificado en un dispositivo físico real) + Farmacia (catálogo + stock + movimientos + dispensa ligada a consulta, F4.3) + Huella operativo (atender, caja, costo, estadísticas) + mobile con HCE completo + analítica de uso + catálogos de referencia + landing page + recuperación de contraseña + **el deploy en VPS ya ejecutado y funcionando (2026-09-13)** — el foco pasa a cerrar los últimos gaps de production-readiness antes de invitar una clínica real, y a decidir la profundidad de cada vertical restante. Notificaciones proactivas (email/WhatsApp automático) quedan en pausa por decisión explícita, no por orden de prioridad.

De mayor a menor valor:

1. **Verificar el dominio en Resend** (`huella.site`, ya con DNS propio andando) — hoy el mail de recuperación de contraseña y de verificación de email no le llega a nadie más que a la cuenta de Resend. Es el gap más importante que queda de la auditoría de production-readiness (2026-09-05).
2. **Correr `docs/Protocolo_Pruebas.md`** (al menos los bloques 0/1/8) contra `https://app.huella.site` real, antes de mandarle el link a la primera clínica.
3. **Build de release para mobile** (EAS Build, perfil `preview` → APK instalable) — `app.json`/`eas.json` ya están listos (package `com.huella.app`, 2026-09-13), sólo falta correr el build con una cuenta de Expo. Sólo necesario si el testeo con usuarios reales va a incluir instalar la app en celulares de terceros.
4. **Backups fuera de la VPS** (hoy sólo locales, probados con restore) y **monitoreo básico** (uptime externo + error tracking) — ver F0.6.
5. Facturación (Fase 5, ARCA/WSFE): reservada por la complejidad regulatoria, no se tocó ni se va a tocar sin una conversación aparte. No confundir con el "Home de facturación" ya cerrado en la Fase 5c (control de pagos manual entre la plataforma y sus organizaciones clientes) — son dos cosas distintas.
