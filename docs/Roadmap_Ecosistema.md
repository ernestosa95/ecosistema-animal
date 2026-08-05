# Roadmap del Ecosistema — estado actual

Principio rector: **costo de implementación tendiente a cero** (self-hosted, PGlite en dev,
Oracle Always Free en prod, sin servicios pagos).

## ✅ Hecho — Vertical Huella (HCE animal) completa y en datos reales

- **Core:** organizaciones, usuarios, membresías, personas (dueños), especies, animales.
  - Identificador único del paciente (código legible + microchip ISO).
  - Dedup: dueños por DNI, animales por microchip.
- **HCE:** consultas, vacunaciones (con recordatorios), turnos (agenda + máquina de estados).
- **Carnet PDF** (`@react-pdf/renderer`, server-side, costo cero, corre en ARM).
- **Web:** login, Animales (con buscador por tipo/nombre/dueño), ficha + edición, Dueños
  (con buscador), Agenda/turnero.
- **Portal del dueño:** acceso por magic-link; ve mascotas, vacunas, turnos, consultas;
  solicita turnos (canal portal → aparecen en la Agenda).

## ✅ Hecho — Administración de plataforma

- **Panel `/admin`** (super-admin por `SUPERADMIN_EMAILS`), fuera del tenant.
- **Onboarding:** auto-registro público con aprobación (crear veterinaria o unirse a una
  existente) + bandeja de aprobación.
- **Alta de miembros** (veterinarios, administrativas, etc.) y asignación a veterinarias.
- **Ciclo de vida de la veterinaria:** desactivar/reactivar, exportar datos (JSON),
  eliminar en cascada (con confirmación por nombre), gestionar miembros (quitar/activar).
- **Permisos por rol** aplicados en el backend (`@Roles`): recepción = turnos + animales +
  dueños; veterinario = + clínico; propietario/admin = todo.

## ⏳ Pendiente — Pulido de Huella (corto)

- **Refresh tokens** (deuda de seguridad del arranque: la sesión no se puede renovar). ← próximo
- **Ocultar botones por rol en la web** (`permisos.ts` + `puede()`; el backend ya es la barrera real).
- **404 en vez de 500** al pasar un id inválido → resuelto con `DbErrorFilter` global.
- **Botón "Descargar carnet"** en la ficha del animal (evita la consola).
- Rename cosmético `PacientesPage` → `AnimalesPage`.

## 🔭 Pendiente — Expansión (el salto grande)

- **Tropera (ganadería):** nueva vertical — esquema (ya esbozado en el SQL: establecimientos,
  lotes, categorías, existencias, movimientos, eventos) + módulos + web. Acá el rol `capataz`
  recibe sus permisos.
- **App móvil** (React Native / Expo).
- **Motor offline / sincronización:** el diferencial para trabajo de campo. Se diseña junto
  con el móvil (requisito, no "a futuro", para Tropera).

## 🧊 Diferido

- **Despliegue en VM Oracle Always Free** — después de Tropera + móvil.
- **Facturación / ARCA** — pozo regulatorio (certificados, WSFE, CAE); sin retorno hasta
  validar el resto.
- **Farmacia / vademécum + stock** — módulos esbozados en el SQL, sin construir.

## Nota de proceso
Mantener el **repo remoto sincronizado** con lo aplicado localmente (`git push` seguido).
La divergencia entre local y remoto complica retomar el trabajo con precisión.
