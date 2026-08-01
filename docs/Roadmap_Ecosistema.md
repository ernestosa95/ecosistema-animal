# 🗺️ Roadmap del Ecosistema de Salud Animal

> Documento vivo. Reemplaza y amplía a `Etapas_Desarrollo.md` para reflejar el giro de **producto único** a **ecosistema de soluciones**.

---

## 🌐 Visión general

El ecosistema (nombre paraguas *a definir*) agrupa soluciones de salud y gestión animal sobre una **base de datos y backend propios**, con control total y costo de infraestructura tendiente a cero.

**Soluciones:**

* **Tropera** — Gestión de emprendimientos ganaderos (producción, hacienda, sanidad de rodeo).
* **HCE Animal** — Historia Clínica Electrónica veterinaria (registro clínico, turnero, farmacia, stock, facturación).

**Principio articulador:** un mismo `animal` vive en un tronco común (`core`) y puede ser, a la vez, una cabeza de hacienda en Tropera **y** un paciente con historia clínica en la HCE. Esto habilita el seguimiento individual (ej. cría de animales de raza) sin duplicar datos.

---

## 🧱 Stack tecnológico (decisiones firmes)

| Capa | Tecnología | Nota |
|---|---|---|
| **Infraestructura** | VM en **Oracle Cloud Always Free** (ARM Ampere) | Gratuito perpetuo; verificar límites vigentes al crear la cuenta. |
| **Base de datos** | **PostgreSQL** self-hosted | Control total, un solo motor para todo el ecosistema, organizado por *schemas*. |
| **Backend / API** | **NestJS** (TypeScript) | Auth propia (JWT), API REST, endpoints de sincronización. Comparte tipos con el frontend. |
| **App móvil** | **React Native + Expo** | Offline-first para trabajo de campo. |
| **Base local (offline)** | **WatermelonDB** (o Expo SQLite) | Sync `pull`/`push` contra endpoints propios. |
| **App web** | **React (Vite) / Next.js** + Tailwind | Reutiliza lógica y componentes con la app móvil. |
| **PDF (carnet/reportes)** | Generación desde el backend | Carnet del paciente, informes. |

**Cambio respecto de la estrategia anterior:** se abandona el BaaS gestionado (Supabase). La autenticación, la seguridad por filas, los backups y la API pasan a ser responsabilidad del backend propio.

---

## 🏛️ Arquitectura de datos (schemas)

* `core` — `usuarios` (auth), `personas` (dueños/humanos), `animales` (ficha base), `establecimientos`.
* `tropera` — hacienda, lotes, movimientos, eventos sanitarios/reproductivos.
* `hce` — consultas, historia clínica, turnos.
* `farmacia` — vademécum, dispensas.
* `stock` — existencias generales (insumos, fármacos).
* `facturacion` — comprobantes.

---

# Fases del ecosistema

Cada fase es un **incremento entregable y usable**. El orden prioriza construir primero el tronco compartido, recuperar Tropera sobre la nueva base, y luego desplegar la HCE módulo por módulo.

---

## 🏗️ Fase 0 — Fundaciones del ecosistema

**Objetivo:** Levantar la infraestructura propia y el tronco común (`core`), reemplazando la dependencia de Supabase.

**Historias de usuario / tareas:**

* **F0.1:** Aprovisionar VM (Oracle Always Free), instalar y asegurar PostgreSQL.
* **F0.2:** Scaffolding del backend NestJS (estructura modular por schema, variables de entorno, SSL).
* **F0.3:** Autenticación propia (registro, login, JWT, refresh tokens) reemplazando Supabase Auth.
* **F0.4:** Modelo `core`: `usuarios`, `personas`, `animales` (base), `establecimientos`.
* **F0.5:** Endpoints de sincronización `pull`/`push` para WatermelonDB, con estrategia de resolución de conflictos definida.
* **F0.6:** Backups automáticos de la base y monitoreo básico.

**Entregable:** Backend propio operativo, con auth y sync, listo para colgar las soluciones.

---

## 🐄 Fase 1 — Tropera sobre el backend propio

**Objetivo:** Recuperar y completar el MVP de Tropera sobre la nueva infraestructura (paridad + control total).

**Historias de usuario:**

* **F1.1:** Alta y administración de establecimientos ganaderos.
* **F1.2:** Carga inicial de hacienda por categorías (vacas, toros, terneros/as, vaquillonas, novillos).
* **F1.3:** Registro de movimientos: altas (nacimientos, compras), bajas (muertes, ventas), traslados.
* **F1.4:** Eventos sanitarios y reproductivos (vacunaciones, entoramiento) con metadata.
* **F1.5:** Registro offline completo en campo + sincronización automática.
* **F1.6:** Panel de resumen de stock por categoría (web y móvil).

**Entregable:** Tropera funcional y offline-first sobre backend propio.

---

## 🩺 Fase 2 — HCE Animal: núcleo clínico

**Objetivo:** Ficha del paciente con llenado progresivo, identificación unívoca y registro clínico.

**Historias de usuario:**

* **F2.1:** Alta de **persona/dueño** (DNI, nombre, apellido, sexo, fecha de nacimiento, celular/tel/mail).
* **F2.2:** Alta de **animal/paciente** con set mínimo (nombre, especie, fecha de nacimiento, foto, dueño asociado).
* **F2.3:** **Datos específicos por especie** vía campo JSONB (evolutivo, sin migraciones por especie).
* **F2.4:** **Algoritmo de identificación unívoca**: UUID v7 interno + código legible (`ESP-PAÍS-SECUENCIA-DV` con dígito Luhn) + soporte para microchip ISO 11784/11785 como identificador natural cuando exista.
* **F2.5:** **Registro clínico** (consultas: motivo, diagnóstico, tratamiento, notas, adjuntos).
* **F2.6:** Exportación de **carnet del paciente** en PDF (foto, código legible, opcional QR al resumen clínico).
* **F2.7:** Registro clínico offline (descargar pacientes del día, cargar en campo, sincronizar).

**Entregable:** HCE con ficha de paciente completa, ID único y consultas registrables offline.

---

## 📅 Fase 3 — HCE Animal: turnero y portal del dueño

**Objetivo:** Que el dueño gestione turnos y vea la salud de su animal desde casa.

**Historias de usuario:**

* **F3.1:** **Turnero**: el dueño solicita una cita desde su dispositivo.
* **F3.2:** Gestión de agenda por parte del veterinario (aceptar, reprogramar, cancelar).
* **F3.3:** **Portal del dueño**: resumen de la historia clínica de su animal (vacunas, consultas, próximos turnos).
* **F3.4:** Notificaciones/recordatorios de turnos y vacunaciones.

**Entregable:** Turnero autogestionado y vista de resumen clínico para el dueño.

---

## 💊 Fase 4 — Farmacia y Stock

**Objetivo:** Gestión de fármacos veterinarios y existencias generales.

**Historias de usuario:**

* **F4.1:** Poblar tabla de **vademécum** desde el Vademécum de Productos Veterinarios del SENASA (fuente pública; confirmar si expone API o requiere extracción). Búsqueda por especie, familia farmacológica e indicaciones.
* **F4.2:** **Gestión de stock general** (insumos y fármacos): existencias, entradas, salidas, vencimientos.
* **F4.3:** **Dispensa** de fármacos ligada a la consulta clínica (descuenta stock, queda en la historia).
* **F4.4:** Alertas de stock bajo y vencimientos próximos.

**Entregable:** Módulo de farmacia + control de stock integrado a la historia clínica.

---

## 🧾 Fase 5 — Facturación

**Objetivo:** Emitir comprobantes a partir del stock y las prestaciones.

> ⚠️ **Complejidad regulatoria:** la facturación electrónica en Argentina exige integración con **ARCA (ex-AFIP)** vía web services (WSFE), certificados y CAE. Reservada intencionalmente para después de validar HCE + stock.

**Historias de usuario:**

* **F5.1:** Comprobantes internos (presupuestos/remitos) a partir de prestaciones y dispensas.
* **F5.2:** Integración con ARCA (WSFE) para factura electrónica válida.
* **F5.3:** Reportes de facturación.

**Entregable:** Facturación operativa (interna y/o fiscal según alcance definido).

---

## 🔗 Fase 6 — Integración cruzada y preparación para beta

**Objetivo:** Explotar el tronco común entre Tropera y la HCE, y dejar el ecosistema listo para primeros clientes.

**Historias de usuario:**

* **F6.1:** **Seguimiento individual** de animales que cruzan ambos mundos (ej. reproductor de raza como cabeza de hacienda *y* paciente clínico).
* **F6.2:** Reportes y métricas transversales del ecosistema.
* **F6.3:** Telemetría básica (errores/logs), empaquetado y distribución para beta.

**Entregable:** Ecosistema integrado, listo para prueba piloto con clientes beta.

---

## 🧵 Consideraciones transversales (aplican a todas las fases)

* **Offline-first:** el motor de sync se construye en la Fase 0; cada módulo se apoya en él.
* **Multi-tenant:** aislar datos por usuario/establecimiento/clínica desde el día uno (con miras a monetización SaaS).
* **Seguridad:** al no usar RLS de Supabase, la autorización se resuelve en el backend (guards por rol y por tenant).
* **Monetización futura:** modelo SaaS por establecimiento/clínica o por volumen; la arquitectura debe permitir limitar o bloquear cuentas.

---

## ✅ Próximos pasos sugeridos

1. Confirmar backend (**NestJS** propuesto; alternativa FastAPI).
2. Diseñar el **esquema de base de datos compartido** (`core` + módulos) — destraba todo lo demás.
3. Especificar en detalle el **algoritmo de identificación del paciente**.
4. Actualizar `Tropera_Alcace.md` y `Tropera_Estrategia.md` para alinearlos con este roadmap.
