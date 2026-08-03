# 🗺️ Roadmap del Ecosistema de Salud Animal

> Documento vivo. Consolida la planificación y la reencuadra para reflejar el giro de **producto único** a **ecosistema de soluciones**. Es la fuente de verdad de fases, stack y **estado de avance**. `Tropera_Alcace.md` mantiene el alcance funcional específico de Tropera; `Estructura_Proyecto.md` describe la estructura de carpetas.

**Última actualización:** agosto 2026.

---

## 📊 Estado de avance

Leyenda: ✅ hecho · 🟡 parcial · ⏳ pendiente

| Área | Estado | Detalle |
|---|---|---|
| Scaffold monorepo + backend NestJS + Drizzle | ✅ | Backend arranca y responde por HTTP. |
| Autenticación (registro/login/JWT) | ✅ | Probada end-to-end. |
| Multi-tenant (guards jwt/tenant/roles) | ✅ | Aislamiento por organización verificado. |
| Core: organizaciones, usuarios, membresías, personas, especies, animales | ✅ | |
| Identificación unívoca del paciente (código legible + Luhn, microchip ISO) | ✅ | 19 tests + prueba HTTP. |
| HCE — Consultas | ✅ | |
| HCE — Vacunaciones + recordatorios | ✅ | |
| HCE — Turnos (turnero) | ✅ | Backend. Portal del dueño ⏳. |
| Edición (PATCH) de pacientes y dueños | ✅ | |
| App web (login, pacientes, dueños, ficha, alta, edición) | ✅ | React + Vite, CSS propio. |
| Base local PGlite para desarrollo (sin instalar Postgres) | ✅ | Driver configurable + migraciones + seeds. |
| Motor de sincronización offline (pull/push) | ⏳ | Columnas listas (`updated_at`/`deleted_at`); falta el motor. |
| App móvil (React Native/Expo) | ⏳ | |
| Tropera (schema + módulos ganaderos) | ⏳ | Diseñado en SQL; sin módulos. |
| Farmacia / vademécum + stock | ⏳ | |
| Facturación (ARCA) | ⏳ | |
| Carnet PDF del paciente | ⏳ | |
| Deploy en VM (Postgres real en Oracle) | ⏳ | Hoy corre local con PGlite. |

**Verticales cerradas:** el "reality check" (backend real por HTTP) y "hacerlo tangible" (web funcional) están completos. El ecosistema funciona hoy de punta a punta: navegador → API → base.

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
| **Infraestructura (prod)** | VM en **Oracle Cloud Always Free** (ARM Ampere) | ⏳ Pendiente de aprovisionar. |
| **Base de datos** | **PostgreSQL** self-hosted, organizado por *schemas* | ✅ Modelado; corre en prod con Postgres real. |
| **Base local (dev)** | **PGlite** (Postgres embebido en proceso) | ✅ Permite correr sin instalar nada. Driver configurable por `DATABASE_DRIVER`. |
| **Backend / API** | **NestJS** (TypeScript) | ✅ Operativo. Auth propia (JWT), API REST. |
| **ORM** | **Drizzle** (SQL-first, multi-schema) | ✅ Adoptado. Migraciones con `drizzle-kit`. |
| **App web** | **React + Vite**, **CSS propio** (sin framework de estilos) | ✅ Funcional. |
| **App móvil** | **React Native + Expo** | ⏳ Offline-first para trabajo de campo. |
| **Base local móvil (offline)** | **WatermelonDB** o Expo SQLite | ⏳ A decidir al construir el offline. |
| **PDF (carnet/reportes)** | Generación desde el backend | ⏳ |

**Cambio respecto de la estrategia anterior:** se abandonó el BaaS gestionado (Supabase). Autenticación, autorización, backups y API son responsabilidad del backend propio.

---

## 🏛️ Arquitectura de datos (schemas)

* `core` — `organizaciones` (tenant), `usuarios` (auth), `membresias` (rol por organización), `personas` (dueños/humanos), `especies`, `animales` (ficha base). ✅
* `tropera` — `establecimientos` (campos), lotes, existencias, movimientos, eventos sanitarios/reproductivos. ⏳
* `hce` — `consultas`, `vacunaciones`, `turnos`. ✅
* `farmacia` — vademécum, dispensas. ⏳
* `stock` — existencias generales (insumos, fármacos). ⏳
* `facturacion` — comprobantes. ⏳

> Nota de diseño: `establecimientos` (los campos) vive en el schema `tropera`, no en `core`, por ser específico de la ganadería. `core` conserva sólo lo transversal a todas las soluciones.

---

# Fases del ecosistema

Cada fase es un **incremento entregable y usable**. Marcadores: ✅ hecho · 🟡 parcial · ⏳ pendiente.

---

## 🏗️ Fase 0 — Fundaciones del ecosistema — 🟡

**Objetivo:** Levantar la infraestructura propia y el tronco común (`core`).

* **F0.1** ⏳ Aprovisionar VM (Oracle Always Free), instalar y asegurar PostgreSQL. *(En dev se usa PGlite; la VM queda para el deploy.)*
* **F0.2** ✅ Scaffolding del backend NestJS (estructura modular por schema, variables de entorno).
* **F0.3** ✅ Autenticación propia (registro, login, JWT). *(Refresh tokens: pendiente.)*
* **F0.4** ✅ Modelo `core` (organizaciones, usuarios, membresías, personas, especies, animales).
* **F0.5** ⏳ Endpoints de sincronización `pull`/`push` con resolución de conflictos.
* **F0.6** ⏳ Backups automáticos y monitoreo básico.

**Adicional hecho:** guards multi-tenant, migraciones con drizzle-kit, base local PGlite con seeds, y provider de base configurable dev/prod.

---

## 🐄 Fase 1 — Tropera sobre el backend propio — ⏳

**Objetivo:** Construir el MVP de Tropera sobre la infraestructura del ecosistema.

* **F1.1** ⏳ Alta y administración de establecimientos ganaderos.
* **F1.2** ⏳ Carga de hacienda por categorías (vacas, toros, terneros/as, vaquillonas, novillos).
* **F1.3** ⏳ Movimientos: altas (nacimientos, compras), bajas (muertes, ventas), traslados.
* **F1.4** ⏳ Eventos sanitarios y reproductivos con metadata.
* **F1.5** ⏳ Registro offline en campo + sincronización.
* **F1.6** ⏳ Panel de resumen de stock por categoría.

**Entregable:** Tropera funcional sobre backend propio.

---

## 🩺 Fase 2 — HCE Animal: núcleo clínico — ✅ (salvo carnet y offline)

* **F2.1** ✅ Alta de persona/dueño (DNI, nombre, apellido, sexo, fecha, contacto) — con edición.
* **F2.2** ✅ Alta de animal/paciente (set mínimo, dueño asociado) — con edición.
* **F2.3** ✅ Datos específicos por especie vía JSONB.
* **F2.4** ✅ Identificación unívoca: código legible `ESP-PAÍS-SECUENCIA-DV` (Luhn) + microchip ISO 11784/11785.
* **F2.5** ✅ Registro clínico (consultas: motivo, diagnóstico, tratamiento, peso, etc.).
* **F2.6** ⏳ Carnet del paciente en PDF.
* **F2.7** ⏳ Registro clínico offline.

**Entregable:** HCE con ficha completa e historia clínica, operable desde la web. ✅

---

## 📅 Fase 3 — HCE Animal: turnero y portal del dueño — 🟡

* **F3.1** ✅ Turnero: solicitud de cita (canal portal, solicitante autoresuelto desde el dueño).
* **F3.2** ✅ Gestión de agenda (confirmar, reprogramar, cancelar, atender) con estados terminales.
* **F3.3** ⏳ Portal del dueño: resumen de la historia clínica de su animal.
* **F3.4** ⏳ Notificaciones/recordatorios de turnos y vacunaciones. *(Recordatorios de vacunas ya existen en la API.)*

**Nota:** el turnero está en el backend; falta llevarlo a la web y construir el portal del dueño.

---

## 💊 Fase 4 — Farmacia y Stock — ⏳

* **F4.1** ⏳ Poblar vademécum desde el Vademécum de Productos Veterinarios del SENASA.
* **F4.2** ⏳ Gestión de stock general (existencias, entradas, salidas, vencimientos).
* **F4.3** ⏳ Dispensa de fármacos ligada a la consulta (descuenta stock).
* **F4.4** ⏳ Alertas de stock bajo y vencimientos.

---

## 🧾 Fase 5 — Facturación — ⏳

> ⚠️ **Complejidad regulatoria:** la facturación electrónica en Argentina exige integración con **ARCA (ex-AFIP)** vía web services (WSFE), certificados y CAE. Reservada para después de validar HCE + stock.

* **F5.1** ⏳ Comprobantes internos (presupuestos/remitos).
* **F5.2** ⏳ Integración con ARCA (WSFE).
* **F5.3** ⏳ Reportes de facturación.

---

## 🔗 Fase 6 — Integración cruzada y beta — ⏳

* **F6.1** ⏳ Seguimiento individual de animales que cruzan Tropera y HCE.
* **F6.2** ⏳ Reportes y métricas transversales.
* **F6.3** ⏳ Telemetría, empaquetado y distribución para beta.

---

## 🧵 Consideraciones transversales

* **Offline-first:** el modelo ya incluye `updated_at`/`deleted_at` en todas las tablas sincronizables; falta construir el motor de sync (Fase 0.5).
* **Multi-tenant:** ✅ implementado y verificado (guards por rol y por tenant; la organización viaja en el header `X-Organizacion-Id`, nunca en el body).
* **Seguridad:** la autorización se resuelve en el backend (no se usa RLS). Opcional a futuro: sumar RLS de Postgres como defensa en profundidad.
* **Monetización futura:** modelo SaaS por organización; la arquitectura permite limitar o bloquear cuentas.

---

## ✅ Próximos pasos sugeridos

Con el core + HCE + web funcionando, las opciones de mayor valor son:

1. **Enriquecer la web:** turnos en la web, portal del dueño, carnet PDF.
2. **Cerrar el core:** Tropera (schema + módulos) y farmacia/stock.
3. **El diferencial:** motor de sincronización offline + app móvil.
4. **Producción:** levantar Postgres en la VM de Oracle y correr contra base real.
