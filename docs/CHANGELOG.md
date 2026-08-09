# 📓 Changelog — Ecosistema de Salud Animal

> Registro de cambios por iteración. El estado global y las fases viven en `Roadmap_Ecosistema.md`; la estructura de carpetas en `Estructura_Proyecto.md`.

## [agosto 2026] — Turnero pulido, sesión robusta, carnet y datos por especie

### Turnero (web)
- **Cabecera en dos columnas**: a la izquierda los controles (navegación de fecha, "Hoy", input, "＋ Nuevo turno") y los cuatro contadores en grilla 2×2; a la derecha un **calendario del mes** clickeable, con el día seleccionado y "hoy" resaltados y un punto en los días con turnos.
- El punto de días-con-turnos se calcula con **una sola request por mes** (`contarTurnosPorDia`, reutiliza `GET /turnos?desde&hasta`).

### Sesión / autenticación
- El cliente de turnos ya **no lee una clave hardcodeada de localStorage**: la sesión se registra desde `App.tsx` con `configurarSesionTurnos(sesion)` (fuente de verdad: `useSesion`). Esto resolvió los errores "Falta el token" / "Token inválido o expirado" y que los catálogos (especies/dueños/profesionales) salieran vacíos.

### Alta de paciente desde el turno
- Se robusteció `crearPacienteRapido` (sin fetches de adorno que rompían la selección).
- El **dueño** se elige de una lista de existentes **o** se crea nuevo inline (nombre/apellido/celular/DNI).
- El selector de **profesional** filtra a `veterinario` / `propietario`.

### Miembros de la organización
- Nuevo módulo `core/usuarios` con `GET /usuarios` (miembros activos, con rol). Se resolvió su dependencia de `JwtService` importando `AuthModule` en el módulo.

### Animales (antes "Pacientes")
- **Renombre** de la sección "Pacientes" → **"Animales"** en el menú y el ruteo (`App.tsx`), y en los textos de las páginas.
- **Ficha del animal**: se corrigió la pantalla en blanco (las variables `onCarnet`/`generandoCarnet` estaban en el scope equivocado). El botón **"Descargar carnet"** abre el PDF de `GET /animales/:id/carnet.pdf` con la sesión (fetch + blob, porque el endpoint está detrás del token).
- **Datos específicos por especie** en la web: catálogo editable `config/especieDatos.ts` + componente `components/CamposEspecie.tsx`, integrados en **alta, edición y ficha**. Se persisten en `datosEspecificos` (JSONB, ya existente en el backend).

### Pendientes anotados
- Carnet PDF: el backend todavía devuelve **datos mock**; falta activar guards + `@CurrentOrg()` y reemplazar el bloque MOCK por consultas Drizzle.
- El catálogo de campos por especie hoy es del frontend; llevarlo a una tabla permitiría que cada veterinaria lo configure.
- Búsqueda de animales del turnero: filtrada en cliente (falta `GET /animales?buscar=`).
- Check-in "marcar llegada / sala de espera" (campo `hora_llegada`): pendiente de decisión.

---

## [agosto 2026] — Turnero en la web: home del admin, alta de paciente inline y asignación de profesional

Se llevó el turnero (que existía solo en el backend) a la app web y se cerró el flujo de mostrador de punta a punta.

### HCE — Turnos (web)
- Página de agenda operativa (`apps/web/src/pages/TurnosPage.tsx`) conectada al backend real: navegación por día, resumen por estado, filtros y la máquina de estados (confirmar, reprogramar, cancelar, atender).
- Cliente `apps/web/src/api/turnos.ts`: se sacó el modo mock y se apuntó a las rutas reales (`GET /turnos?desde&hasta`, `POST /turnos`, `PATCH /turnos/:id/estado`), con mapeo `fechaHora` ↔ `fecha`/`hora`.

### Alta de paciente desde el turno
- En "Nuevo turno", si la búsqueda no encuentra al animal, se puede crear el paciente (y su dueño) desde el mismo modal, reutilizando `POST /personas` y `POST /animales`.

### Asignación de profesional
- `POST /turnos` acepta `veterinarioId` (antes solo se asignaba al cambiar de estado) y un `estado` opcional (alta desde mostrador sale `confirmado`).

### Ruteo por rol en la web
- `App.tsx`: los perfiles administrativos (`propietario`, `admin`, `recepcion`) entran directo al turnero.
