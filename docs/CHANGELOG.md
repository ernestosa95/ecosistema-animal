# 📓 Changelog — Ecosistema de Salud Animal

> Registro de cambios por iteración. El estado global y las fases viven en `Roadmap_Ecosistema.md`; la estructura de carpetas en `Estructura_Proyecto.md`.

## [2026-08-30] — Términos y condiciones obligatorios en el alta de cuenta

A pedido del usuario: el form de "Solicitar acceso" (`LoginPage.tsx`, modo registro) suma un checkbox obligatorio de aceptación de términos y condiciones / política de privacidad, con un modal de sólo lectura para leer el texto completo antes de tildarlo.

- **Contenido** (`apps/web/src/legal/terminos.ts`): borrador de Términos y Condiciones + Política de Privacidad orientado a la Ley 25.326 (Argentina), cubriendo qué datos se recopilan (cuenta, organización, y los datos de terceros — dueños/animales — que el propio usuario carga), para qué se usan, con quién se comparten, derechos del titular y contacto. **Tiene placeholders sin completar** (`[Razón social]`, CUIT, email de contacto) y **no fue revisado por un abogado** — hace falta completarlo con los datos reales y una revisión legal antes de considerarlo válido para producción.
- **Backend**: `core.solicitudes` suma `terminos_aceptados_en` (timestamp; no-nulo = aceptó) y `terminos_version` (migración `0016_safe_roxanne_simpson.sql`). `CrearSolicitudDto.terminosAceptados` usa `@Equals(true)` — rechaza con 400 tanto `false` como que falte el campo. La versión aceptada la fija el backend (`TERMINOS_VERSION`), no el cliente. `AdminPage.tsx` muestra en cada solicitud pendiente si aceptó y cuándo.
- Pensado para poder exigir re-aceptación en el futuro si el texto cambia de forma sustancial (comparando `terminos_version` contra la constante vigente) — no implementado todavía, no hay caso de uso real aún.

**Verificado**: `nest build`, `pnpm --filter web build` y `tsc --noEmit` limpios (mismo ruido preexistente de siempre). Migración aplicada contra el `pgdata` real (protocolo de siempre: backend parado por PID, script descartable, conteos iguales antes/después). Probado por curl contra el backend real: sin aceptar términos da 400 con el mensaje esperado, aceptando crea la solicitud con `terminos_aceptados_en`/`terminos_version` bien guardados — datos de prueba borrados después. **Sin verificar clic a clic en el navegador** (sin herramienta de automatización de browser en esta sesión): falta confirmar visualmente que el modal abre/cierra bien y que el botón "Enviar solicitud" queda deshabilitado hasta tildar el checkbox.

## [2026-09-01] — Layout ¾/¼ en tres pantallas, scroll único de la app, Home con centro de operaciones, Farmacia con stock general y flujo de Ingresos

Sesión larga a pedido del usuario, iterando pantalla por pantalla. Sin tocar `apps/mobile`.

### Layout ¾ / ¼ y scroll de página
- Generalizado `.layout-2col`/`.layout-main`/`.layout-side` (ya usado por `PacienteDetallePage.tsx`) — grid de dos columnas estiradas a igual altura — y aplicado también a `RecordatoriosPage.tsx` (todo el contenido pasó de la columna angosta a la ancha, a pedido explícito tras un primer intento con el contenido en la ¼) y a `HuellaHomeSection.tsx` (ver más abajo).
- **`.app` ahora tiene una altura real** (`height: 100%` + `overflow: hidden`, antes sólo `min-height: 100vh`, que no limitaba nada) y `.contenido` es el único elemento con `overflow-y: auto` de toda la app autenticada — el rail de navegación y la cabecera de sección quedaban recortados de a poco cuando una pantalla tenía contenido largo, porque en la práctica el `<body>` entero scrolleaba. Login/Admin/Portal no usan `.app` y no se tocaron.
- `PacienteDetallePage.tsx`: la ficha del animal se compactó para entrar sin scroll de página en un viewport normal — grid de datos a 4 columnas (`ficha-datos-compacta`), el form de consulta reagrupó Motivo/Observaciones y Anamnesis/Examen físico de a pares (antes cada uno ocupaba el ancho completo), la tabla de historia clínica pagina de a 3 (`.paginacion`) y se oculta por completo mientras el form de "+ Nueva consulta" está abierto (editar una fila existente sí la deja visible, por el contexto).

### Farmacia y stock (rework grande)
- **Ya no es sólo vademécum**: la página pasó a título/copy "Farmacia y stock" y ahora cubre alimento, accesorios, forraje, etc. — el backend nunca lo impidió (`categoria` siempre fue texto libre), faltaba la UX. Categoría/unidad/presentación siguen siendo texto libre en la base pero el alta/edición sólo ofrece una lista cerrada: categoría vía un combobox de búsqueda nuevo y reusable (`components/SelectorBusqueda.tsx` — filtra tipeando, no deja mandar texto libre), unidad/presentación vía `<select>` simple. Editar un producto con un valor previo a la lista cerrada lo conserva como opción extra en vez de perderlo.
- **Dos checks nuevos en el alta** (`esMedicamento`, `esFraccionable`, columnas nuevas — ver migración abajo): el subform de concentración/unidad de concentración/dosis sugerida sólo aparece si `esMedicamento` está tildado. `esFraccionable` (se vende por porciones de un bulto, ej. kg de una bolsa de 25kg) es sólo informativo por ahora — las cantidades de stock siguen siendo enteras, no habilita decimales.
- **El precio salió del alta de producto.** Nuevo botón "+ Ingresos" (al lado de "+ Nuevo producto"): buscar un producto existente, calculadora de bultos (bultos × contenido por bulto → cantidad total, para no hacer la cuenta a mano al recibir mercadería en bolsas/cajas), y ahí se cargan los dos precios — `precioCompra` (costo al proveedor, opcional, columna nueva) y `precio` (venta al cliente, obligatorio) — ambos por la unidad del producto ("por kg", "por frasco"). Un submit hace el movimiento `compra` + actualiza el producto.
- Reusa la misma calculadora de bultos en "+ Nuevo movimiento" (ficha de un producto puntual) — ya existía ahí de una iteración anterior de esta misma sesión.
- **Migración `0019_useful_trauma.sql`**: `farmacia.productos` suma `precio_compra` (numeric, nullable), `es_medicamento`/`es_fraccionable` (boolean, `default false`). `ALTER TABLE ... ADD COLUMN` simple, sin tocar filas existentes. Aplicada contra el `pgdata` real con el protocolo de siempre (backend parado por PID exacto, conteos de filas idénticos antes/después, backend reiniciado) — confirmado con el usuario antes de tocar su proceso.

### Home de Huella — "Centro de operaciones" + Turnos de hoy
- La izquierda (¾) pasó de estar vacía a un panel de accesos rápidos, gateados por rol (mismos roles que exige el backend en cada endpoint, no inventados): **Nueva consulta**/**Registro de vacuna** (`ROLES_CLINICO`) abren `SeleccionarAnimalModal` (buscar o crear el paciente ahí mismo) y navegan a su ficha con el form correspondiente ya abierto (`abrirConsulta`/`abrirVacuna`, mismo mecanismo que ya usaba "Atender" desde Turnos); **Venta común** (`ROLES_CAJA`) abre `VentaRapidaModal` — producto por `SelectorBusqueda`, precio unitario editable que si se cambia queda como el nuevo precio general del producto (no sólo de esa venta), total calculado; **Nuevo turno** (`ROLES_TURNERO`) abre `NuevoTurnoRapidoModal` — mismo picker de paciente, y la misma lógica de agenda/disponibilidad de `TurnosPage.tsx` (`listarAgendas`/`slotsDisponibles` de `api/turnos.ts`, con horarios ocupados deshabilitados) pero reimplementada con el sistema de diseño global en vez del CSS `hu-*` autocontenido de esa página, porque este modal no vive ahí.
- Debajo del panel, tabla "Turnos de hoy" (mismo gate de rol) con los turnos del día — no cancelados ni ya atendidos — cada fila abre la ficha del paciente al click; botón "Ver todos los turnos →" al lado del título navega a la pantalla completa de Turnos.
- La derecha (¼) sigue siendo los tres KPI apilados con drill-down; se sacó el desglose de turnos por estado que tenía antes (ese detalle ya vive en Turnos/Recordatorios).
- Se eliminó el centro de exportación (CSV/Excel/PDF, `ExportBar.tsx` + `utils/exportar.ts`) de toda la app — Dueños, Farmacia, Caja, Tropera y el drill-down del dashboard. Lo que quedaba con uso real (`ColumnaExport`/`valorDe`, para las tablas de `DrawerTabla.tsx`) se movió a `utils/columnasTabla.ts`.

**Verificado**: `nest build`, `tsc --noEmit` (backend y frontend) y `pnpm --filter web build` limpios en cada paso. Todo probado clic a clic contra instancias PGlite descartables aisladas (puertos 3001/5174, nunca el backend real del usuario salvo para aplicar la migración con permiso explícito) — layout ¾/¼ y ausencia de scroll de página medidos con `scrollHeight`/`clientHeight` además de capturas de pantalla; flujo de Ingresos con compra de 4 bultos de 25kg calculando 100kg y actualizando ambos precios; venta común remarcando el precio y confirmando que el producto quedó con el nuevo precio general; turno rápido con agenda real (bloques 09-17hs) mostrando y reservando un slot; tabla de turnos de hoy filtrando correctamente un turno de mañana. Migración aplicada contra el `pgdata` real sólo después de que el usuario confirmara explícitamente.

## [2026-08-30] — Agendas y bloques de turnos (por profesional o sin profesional)

A pedido del usuario, para cerrar la iteración de funcionalidades antes de pasar al pulido de interfaz: el turnero pasa de ser puramente puntual (`fechaHora` libre, `veterinarioId` opcional, **sin ninguna validación de solapamiento**) a soportar **agendas** — una por profesional, o sin profesional (ej. "Peluquería canina") — con horario recurrente semanal y excepciones puntuales (feriados/licencias o aperturas extra), generando slots fijos reservables y evitando que se pisen dos turnos en el mismo horario de una misma agenda.

- **Modelo nuevo** (`hce.ts`): `agendas` (nombre, `usuarioId` opcional, `duracionTurnoMinutos`, `activa`), `agenda_bloques` (horario recurrente: día de semana + hora inicio/fin) y `agenda_excepciones` (fecha puntual, tipo `cierre`/`apertura_extra`, hora opcional — sin hora en un cierre = día completo). `turnos.veterinarioId` se **reemplaza** por `turnos.agendaId` (nullable — un turno sin agenda sigue siendo 100% libre, sin ninguna validación, igual que hoy).
- **Migración en dos pasos** (`0017_giant_deadpool.sql` + `0018_heavy_sabretooth.sql`, mismo motivo que la de `organizaciones.tipo`: evitar el prompt interactivo de `drizzle-kit` sobre "¿es un rename?"): 0017 crea las tablas nuevas y agrega `agenda_id` con un **backfill** que sintetiza una agenda por cada `veterinario_id` distinto usado en turnos existentes (preservando la asignación de profesional que ya había); 0018 elimina `veterinario_id`.
- **Motor de slots** (`AgendasService.slotsDisponibles`, nuevo módulo `hce/agendas/`): bloques recurrentes del día de semana → recortados por excepciones `cierre` de esa fecha exacta (día completo o una franja parcial) → sumando ventanas `apertura_extra` → troceado en slots de `duracionTurnoMinutos` → cruzado contra los turnos no cancelados de esa agenda ese día. `validarDisponibilidad()` lo reusa para rechazar (400) un turno fuera de horario o en un slot ocupado; acepta excluir el propio turno (para reprogramar sin chocar contra uno mismo).
- **De paso, dos bugs reales corregidos** (el código ya se estaba tocando): `TurnosService.solicitar()` ignoraba `dto.estado` y siempre insertaba `'solicitado'` (contradecía el propio comentario del DTO sobre altas confirmadas desde mostrador); `TurnosService.agenda()` no seleccionaba `veterinarioId` en absoluto, por lo que el filtro "Mis turnos" del frontend comparaba contra `undefined` — silenciosamente roto. Ahora trae `agendaId`/`agendaNombre`/`agendaUsuarioId` vía `LEFT JOIN`.
- **Web**: `TurnosPage.tsx` — el selector de "Profesional" pasa a ser de "Agenda"; al elegir una agenda + fecha, el `<input type=time>` libre se reemplaza por una grilla de horarios (slots ocupados deshabilitados). Nuevo botón "⚙ Agendas" abre `turnos/GestionAgendas.tsx` (alta/edición de agendas, horario recurrente, excepciones puntuales) — vive dentro del turnero, **no se agregó ningún ítem nuevo al nav rail** a propósito, para no tocar la navegación antes del pulido que sigue. `Overlay`/`Field` (antes locales a `TurnosPage.tsx`) se extrajeron a `turnos/ui.tsx` para reusarlos sin import circular.
- **Fuera de alcance, a propósito**: el portal del dueño (`PortalService.solicitarTurno`) no se tocó — sigue siendo una sugerencia de fecha libre que el staff confirma después, no una reserva de slot.

**Verificado**: `nest build`, `pnpm --filter web build` y `tsc --noEmit` limpios (mismo ruido preexistente de siempre). Nueva suite `test:agendas-demo` (22 checks) — a diferencia de la mayoría de los `test:*-demo`, **instancia las clases reales** (`AgendasService`, `TurnosService`) en vez de reimplementar la lógica, para no arriesgar que el motor de slots (la parte más intrincada de este cambio) diverja de lo que corre en producción. Las 14 suites existentes también en verde — `sync-flow.demo.ts` y `turnos-flow.demo.ts` necesitaron actualizar su mini-schema inline (`veterinario_id` → `agenda_id`) para seguir compilando contra el schema Drizzle real. Migración aplicada contra el `pgdata` real con el protocolo de siempre (backend parado por PID exacto, script descartable, conteos idénticos antes/después — no había turnos con `veterinario_id` cargado, así que el backfill no tuvo nada que sintetizar). **Sin verificar clic a clic en el navegador** (sin herramienta de automatización de browser en esta sesión) — queda pendiente que el usuario cree una agenda con horario, pida un turno eligiendo un slot, y confirme que un slot ocupado no se puede volver a elegir.

## [2026-08-30] — Pulido visual del shell web (parte 2 de 2)

Segunda parte del rediseño del shell (la primera fue la reestructuración del nav rail por soluciones) — esta vez, pulido de los estilos compartidos de `styles.css`, que cascadean a las ~13 páginas sin tocar su JSX.

- **Tipografía**: se suma Inter (Google Fonts, `index.html`) como fuente principal, reemplazando la pila `system-ui` — misma fuente que ya usaba el mockup de referencia.
- **Paleta neutra unificada**: el nav rail (construido en la parte 1) ya usaba tonos slate (`#e2e8f0`/`#64748b`) hardcodeados; el resto de la app todavía usaba grises más cálidos (`#e5e7eb`/`#6b7280`) en `--border`/`--muted`. Se unificó todo a slate vía las variables de `:root`, y los hardcodes del rail pasaron a usar esas variables (`--hover-bg` nueva, antes `#f1f5f9` repetido a mano en tres lugares).
- **Profundidad**: nuevos tokens `--sombra-suave`/`--sombra-flotante` (sombras de dos capas, más parecidas a las del mockup) aplicados a `.card` y `.user-dropdown`. `.card` pasa de `border-radius: 12px` a `14px`; inputs/botones/chips de `8px` a `9px` — mismo criterio, radios un poco más suaves y consistentes entre sí.
- **Botones**: `.btn` suma una sombra sutil + estado `:active` (leve desplazamiento al click); `.btn-ghost` usa `--hover-bg` en vez de un gris hardcodeado propio.
- **Tabla**: filas con hover (`--hover-bg`) para mejorar el escaneo visual; encabezados con más peso.
- No se tocó el JSX de ninguna página ni la consola `/admin` (tiene su propio CSS-in-JS autocontenido, fuera de este alcance) ni el portal del dueño (`PortalAccesoPage.tsx`, ídem).

**Verificado**: `pnpm --filter web build` limpio, CSS válido. **Sin verificar visualmente en el navegador** (sin herramienta de automatización de browser en esta sesión) — es un cambio puramente de CSS compartido con impacto en toda la app, así que vale la pena que el usuario lo mire en vivo (`localhost:5173`, ya corriendo) antes de dar el pulido por terminado; puede haber ajustes de detalle (contraste, espaciados puntuales) que sólo se notan viéndolo.

## [2026-08-30] — Soluciones activables por organización (Tropera/Huella) + consola /admin genérica

A pedido del usuario, en línea con el rediseño del shell web (entrada anterior): `organizaciones.tipo` (enum `clinica`/`establecimiento`/`mixta`, fijo desde la creación) se reemplaza por dos booleans independientes, `huellaActiva`/`troperaActiva`, activables/desactivables por separado (incluso ambas en `false`, ej. una organización suspendida) desde `/admin` en cualquier momento — ya no sólo al crear la organización.

- **Migración en dos pasos** (`db/migrations/0014_white_valeria_richards.sql` + `0015_eager_ghost_rider.sql`): 0014 agrega las dos columnas boolean y hace un `UPDATE` de backfill leyendo el `tipo` viejo (todavía presente en ese paso) antes de que 0015 lo elimine junto con el enum `core.tipo_organizacion`. Se generó así (en dos `db:generate` separados) a propósito — un solo paso combinado dispara el prompt interactivo de "¿es un rename?" de `drizzle-kit`, que no se puede responder en un entorno no interactivo.
- **Backend**: `core/auth/auth.service.ts` (login/register), `admin/admin.service.ts` (listar/crear + nuevo `setSoluciones()`), `dashboard/dashboard.service.ts` (qué bloques de KPIs calcular) y `solicitudes/solicitudes.service.ts` (mapea el `tipoOrganizacion` de texto libre del form público a los dos booleans recién al aprobar) migrados a los dos booleans. Nuevo endpoint `PATCH /admin/organizaciones/:id/soluciones`.
- **El form público de alta** ("Solicitar acceso" en el login) sigue pidiendo un único tipo (clínica/establecimiento/mixta) — más simple para un alta por primera vez; el super-admin puede ajustar los booleans después desde `/admin` si hace falta. Decisión explícita, no un olvido.
- **Consola `/admin` "genericizada`**: ahora que puede haber organizaciones que son sólo Tropera (un campo, no una veterinaria), se renombró "Veterinarias" → "Organizaciones" en toda la UI (nav, títulos, copys, nombres de archivo exportado) y el brand del topbar de "Huella · Administración" → "Ecosistema · Administración" (la consola gestiona ambas soluciones, no sólo una). `NuevaOrg` cambia su `<select>` de tipo por dos checkboxes (Huella/Tropera, con la misma validación de "al menos una" que ya tenía el alta pública); nuevo panel `SolucionesOrg` (junto a `AccesoOrg`) para tocar los booleans de una organización ya creada.
- **Web**: `Sesion.tipo?` → `Sesion.huellaActiva`/`troperaActiva` (ya no opcionales); `nav/config.ts`'s `solucionesDisponibles()` lee los booleans directo. Nuevo caso límite real que el viejo enum no permitía: una org con **ninguna** solución activa — `App.tsx` corta antes del rail con una pantalla "Sin soluciones activas" en vez de caer silenciosamente al fallback de Huella.
- **Tests**: las 14 suites `test:*-demo` recrean su propio mini-schema inline (no importan las migraciones reales) — se actualizaron los 14 archivos (reemplazo mecánico del `CREATE TYPE`/columna `tipo` por las dos columnas boolean) para que seguir compilando/corriendo contra el schema Drizzle real que sí cambió.

**Verificado**: `nest build`, `pnpm --filter web build` y `tsc --noEmit` (vía `apps/backend`) limpios — mismo ruido preexistente de siempre, nada nuevo. Las 14 suites `test:*-demo` en verde (0 fallas). Migración aplicada contra el `pgdata` real del usuario con el protocolo de siempre (backend detenido por PID exacto, migración vía script PGlite descartable, conteos de `organizaciones`/`usuarios`/`personas`/`animales` idénticos antes/después, backend reiniciado) — las 3 organizaciones reales existentes (todas `tipo='clinica'`) backfillearon a `huellaActiva=true`/`troperaActiva=false` como se esperaba. **Sin verificar clic a clic en el navegador** — no hay herramienta de automatización de browser en esta sesión; falta que el usuario entre a `/admin` con la cuenta de super-admin real y pruebe crear una organización con los checkboxes nuevos y tocar los booleans de una existente.

## [2026-08-30] — Rediseño del shell web: nav rail por soluciones (Tropera / Huella) — parte 1 de 2

A pedido del usuario, con un mockup HTML de referencia y un documento de identidad visual (`Identidad_Visual_Tropera.pdf`). Primera de dos iteraciones acordadas: migrar toda la funcionalidad existente a la nueva estructura de navegación primero, un pase de pulido visual después (tablas/forms/cards internos no se retocaron en esta parte).

- **"Huella"** queda confirmado como nombre de marca definitivo del lado clínico/veterinario (antes "HCE Animal" en la UI, sin cambiar el nombre del módulo backend).
- La nav horizontal plana de 9 pestañas (`App.tsx`) se reemplaza por un **nav rail** de 80px: switcher de soluciones arriba (Tropera/Huella, sólo se muestran las habilitadas según `organizaciones.tipo` — `sesion.tipo`, nunca según el rol; si sólo hay una, el switcher ni aparece), un set de íconos dinámico según la solución activa en el medio, y un menú de usuario (avatar, click-to-toggle con overlay para cerrar) abajo. Config centralizada en `nav/config.ts` (ids, íconos SVG portados del mockup, sets de roles — mismos que regían la nav vieja).
- **"Usuarios"** (gestión de miembros) sale del rail — no es función de ninguna solución puntual — y pasa al menú de usuario.
- **Home por solución**: `DashboardPage.tsx` (mezclaba bloques clínica+tropera para orgs mixtas) se separó en `HuellaHomeSection` (renombrado de archivo, sólo bloque clínico) y el Home de Tropera (ver abajo), cada uno con su propio drill-down.
- **`TroperaPage.tsx` dividido en 5 secciones** navegables directamente (antes todo vivía anidado dentro de "elegir establecimiento → detalle"): Home (alta/edición de establecimientos + panel consolidado + KPI de movimientos del mes), Animales (existencias/movimientos/eventos a nivel categoría), Potreros, Animales individuales (fichas de campo + muestreos + evaluación andrológica) y Plantillas y protocolos (catálogo org-wide + agenda de tareas) — las secciones que necesitan un establecimiento eligen uno con un selector nuevo y reusable (`EstablecimientoSelector`) en vez de depender de la navegación anidada vieja. La lógica interna de cada pieza (`PotrerosSection`, `AnimalesCampoSection`, `PlantillasYProtocolosSection`, etc.) no se tocó, sólo cómo se llega a cada una.
- `tutorial/tours.ts`: los `data-tour` de cada paso se actualizaron a los nuevos botones del rail (`nav-dashboard`, `nav-tropera-home`, etc.); el contenido de los pasos no se reescribió (eso es parte del pulido).
- Paleta de marca: `--verde`/`--tierra` ya coincidían con "Verde Monte"/"Marrón Tierra" del PDF de identidad; se sumaron `--celeste` (azul río/cielo, de apoyo — no de acción) y `--tropera-bg`/`--huella-bg` para los badges del rail y el breadcrumb superior.

**Fuera de alcance a propósito**: `/admin` (consola super-admin) y los dos caminos del portal del dueño — superficies separadas de `App.tsx`, el mockup no las cubre.

**Verificado**: `pnpm --filter web build` y `tsc --noEmit` (vía `apps/backend`, mismo truco de siempre) limpios — el único ruido son los errores preexistentes ya documentados (`ImportMeta.env`, `react-dom/client`, `Joyride`'s `styles.options`), ninguno nuevo. Backend + web reales levantados con `./dev.sh` sin errores de arranque, `nest build` en 0 errores, `App.tsx` transformado por Vite sin fallar. **Sin verificar clic a clic en el navegador** — no hay herramienta de automatización de browser en esta sesión; falta que el usuario recorra el rail con una organización real (`mixta` para ver el switcher, o `clinica`/`establecimiento` para confirmar que no aparece) antes de dar esta parte por cerrada.

## [2026-08-30] — Formulario de solicitud de cuenta: DNI del usuario + datos de la institución/campo

A pedido del usuario ("necesitamos mejorar el formulario de solicitud de una nueva cuenta para poder tener todos los datos del usuario y de la institución/campo"). Alcance acordado con dos preguntas antes de codear: del usuario sólo faltaba **DNI**; de la institución/campo, **dirección, localidad, provincia y teléfono/email de contacto** (CUIT quedó afuera — aunque la columna ya existía sin usarse en ningún lado, el usuario no la pidió esta vez).

- **Schema + migración `0013`**: `core.usuarios.dni`, `core.organizaciones.{direccion,localidad,provincia,telefono,email}`, y los mismos 5 campos institucionales + `dni` duplicados en `core.solicitudes` (con sufijo `_organizacion` para no chocar con los datos personales del solicitante) — la solicitud necesita guardar estos datos *antes* de que exista la organización real, para trasladarlos recién al aprobar.
- **Backend**: `CrearSolicitudDto` los suma todos opcionales; `SolicitudesService.crear()` los persiste (los institucionales sólo si `tipo === 'crear'`, no aplican a "unirse"); `aprobar()` los traslada a `usuarios.dni` y a los 5 campos de `organizaciones` al crear la fila real; `CAMPOS` (la proyección que ve el admin) los expone.
- **Web**: `LoginPage.tsx` — el form de "Solicitar acceso" suma DNI (siempre) y los 5 campos institucionales (sólo cuando "Crear una veterinaria o campo nuevo"); de paso, la copy pasa de "veterinaria" a "institución / campo" en los lugares donde el tipo puede ser un establecimiento ganadero, no sólo una clínica. `AdminPage.tsx` — la tarjeta de revisión de solicitudes ahora muestra el DNI junto al contacto y una segunda línea con dirección/localidad/provincia/teléfono/email institucional, para que el super-admin vea todo antes de aprobar.
- **Incidente en el camino — el backend real se rompió brevemente**: el watch-mode del backend recompiló el código con el schema nuevo antes de que la migración se aplicara contra el `pgdata` real (`organizaciones`/`usuarios`/`solicitudes` no tenían las columnas nuevas todavía) — cualquier `select()` de fila completa sobre esas tablas empezó a tirar 500 (`column "direccion" does not exist"`), incluido el login. Se resolvió con el protocolo de siempre: bajar el backend por PID exacto, aplicar la migración `0013` con un script PGlite descartable verificando `count(*)` antes/después de `organizaciones`/`usuarios`/`solicitudes`/`personas`/`animales` (sin cambios, sólo columnas nuevas), reiniciar. **Lección**: cuando se agrega una columna a una tabla `core` de uso transversal (`organizaciones`/`usuarios`), aplicar la migración al `pgdata` real *antes* de guardar el cambio de schema, no después — para tablas menos centrales el watch mode no llega a notarlo tan rápido, pero éstas se tocan en casi todos los endpoints.
- **Deuda de testing, mismo patrón de siempre, a mayor escala esta vez**: `organizaciones`/`usuarios` son las tablas más reusadas de todo el proyecto — prácticamente las 14 suites `test:*-demo` las recrean a mano, así que las 6 columnas nuevas rompieron 9 de las 14 de una sola vez (cualquier test que hiciera `.insert(organizaciones)`/`.insert(usuarios)` con la tabla real de Drizzle y `.returning()`). Corregido agregando las columnas a cada DDL hand-rolled afectado.
- **Verificado end-to-end contra el backend real**: `POST /solicitudes` con los 11 campos nuevos → aparecen completos en `GET /admin/solicitudes` → `aprobar()` crea la organización real con los 5 campos institucionales — confirmado que el insert no tira error (la única forma de confirmar sin exponer esas columnas en el endpoint de listado, que no fue tocado por no ser parte del pedido). Datos de prueba (`Establecimiento Los Alamos`) borrados por la vía correcta (`DELETE /admin/organizaciones/:id`) al terminar. Las 14 suites `test:*-demo` (196 checks) y `nest build`/`vite build` limpios.

## [2026-08-30] — Fix: `res.json()` sobre respuestas 200 con cuerpo vacío rompía el front (los tres clientes)

Siguiente síntoma en la misma pestaña de Caja, ya con el fix de `/personas/veterinarios` puesto: "JSON.parse: unexpected end of data at line 1 column 1 of the JSON data" apenas se abría (antes de tocar nada).

- **Causa**: `GET /caja/cajas/actual` devuelve `null` cuando no hay caja abierta (comportamiento correcto y esperado — así lo interpreta `Mostrador` en `CajaPage.tsx` para mostrar el form de apertura). Pero Nest, cuando un controller devuelve `null`/`undefined`, no manda `res.json(null)` — manda una respuesta **200 con cuerpo vacío y sin `Content-Type`** (confirmado con `curl -I`: sin `Content-Length` ni `Content-Type`). Los tres clientes HTTP del proyecto (`apps/web/src/api/client.ts`, `apps/web/src/api/turnos.ts`, `apps/mobile/src/api/client.ts`) sólo tenían el caso especial `res.status === 204 → null`, y llamaban `res.json()` directo para cualquier otro 2xx — sobre un cuerpo vacío eso tira exactamente el error que se vio.
- **Por qué no aparecía en otros lados todavía**: es el primer endpoint del proyecto pensado para devolver "nada" (`null`) con status 200 en vez de 204 — todos los demás GET devuelven una lista (`[]` si está vacía) o lanzan 404 si no existe. `cajaActual` es conceptualmente distinto: "no hay caja abierta" es un estado válido, no un error ni una lista vacía.
- **Fix** (mismo patrón en los tres archivos): en vez de `res.status === 204 ? null : res.json()`, se lee `res.text()` primero y sólo se parsea si no está vacío — `res.status === 204 ? null : (texto ? JSON.parse(texto) : null)`. Cubre 204 explícito y 200 con cuerpo vacío por igual, sin cambiar el comportamiento para respuestas con contenido real.
- **Verificado**: `vite build` y `tsc --noEmit` de `apps/mobile` limpios. La pestaña de Caja ya carga bien contra el backend real (confirmado por el usuario).

## [2026-08-30] — Fix: `GET /personas/veterinarios` devolvía 404 (orden de rutas)

Encontrado por el usuario probando la app real en el navegador (pestaña "Caja" tirando "Recurso no encontrado" apenas se abría, antes de tocar nada). `Mostrador` en `CajaPage.tsx` pide `cajaActual`/`productos`/`veterinarios` en paralelo — el que fallaba era `api.veterinarios()`.

- **Causa**: en `personas.controller.ts`, `@Get(':id')` estaba declarado *antes* que `@Get('veterinarios')`. Nest/Express registra las rutas en orden de declaración y usa la primera que matchea — `:id` matchea cualquier segmento, así que `GET /personas/veterinarios` se enrutaba a `obtener(id='veterinarios')`, que hace `eq(personas.id, 'veterinarios')`. Postgres rechaza eso como `invalid input syntax for type uuid`, y `DbErrorFilter` (pensado para convertir ESE error puntual en un 404 limpio en vez de un 500) lo traduce a `{"message":"Recurso no encontrado"}` — por eso el síntoma era un 404 y no un error de sintaxis SQL visible.
- **Por qué no lo agarró ningún test**: `test:personas-demo` replica la lógica de `PersonasService` directamente contra Drizzle, sin pasar por el enrutador HTTP de Nest — este tipo de bug (orden de rutas literal-vs-`:id`) sólo se manifiesta a través del enrutador real, algo que ninguna de las 14 suites `test:*-demo` ejercita (todas evitan levantar Nest a propósito, para no necesitar un servidor corriendo). Gap real, anotado para si alguna vez se justifica un puñado de tests de integración HTTP.
- **Fix**: reordené `personas.controller.ts` — las rutas literales (`veterinarios`, `:id/animales`) van antes que `:id` a secas.
- **Auditoría de paso**: repasé los ~35 controllers del backend buscando el mismo patrón (una ruta literal declarada después de un `:id`/`:algo` en el mismo controller) — este era el único caso.
- **Verificado**: `GET /personas/veterinarios` devuelve `[]` (antes 404) contra el backend real; `nest build` limpio; las 14 suites `test:*-demo` siguen en verde.

## [2026-08-29] — Fix: `nest build`/`nest start` roto por un conflicto de `@types/react` duplicado

Encontrado al intentar levantar el backend real para el usuario (pidió el emulador + un usuario admin para probar al llegar a su casa): `nest start --watch` tiró 57 errores TS2769 al arrancar. `nest build` — que no se había vuelto a correr desde que se instaló `react-joyride` para el tutorial guiado, sólo `vite build` del lado web — también fallaba, así que esto llevaba un rato roto sin que se notara (`vite build` transpila con esbuild y no tipa de verdad, por eso no lo agarró).

- **Causa**: instalar `react-joyride` corrió de nuevo el arbitraje de pnpm sobre qué versión de `@types/react` ocupa el hoist ambiental compartido (`node_modules/.pnpm/node_modules/@types/react`, el "último recurso" que usa la resolución de Node cuando un paquete no declara su propio `@types/react`) — pasó de `18.3.31` a `19.2.18` (ya coexistían ambas versiones en el lockfile desde antes por `apps/mobile`, que sí necesita React 19 de verdad; lo nuevo es cuál de las dos "ganaba" ese slot ambiental). `@react-pdf/renderer` no declara `@types/react` como dependencia propia — su `.d.ts` resuelve `react` caminando hacia arriba desde su propia carpeta hasta pegarle a ese hoist ambiental. Resultado: los `h(Text, ...)`/`h(View, ...)` de `carnet.document.ts`/`ficha.document.ts` quedaban tipados contra una copia de `React.Context` distinta a la que backend usa en el resto del código → "no assignable" en cada llamada.
- **Fix**: `pnpm.packageExtensions` en el `package.json` raíz, dándole a `@react-pdf/renderer` una dependencia propia `@types/react@18.3.31` — la resolución la encuentra ahí antes de llegar al hoist ambiental, sin tocar la resolución real de `apps/mobile` (que sigue con 19.x, verificado con `tsc --noEmit` después del fix) ni la de `apps/web`.
- **Verificado**: `nest build` limpio, `tsc --noEmit` de `apps/mobile` limpio, las 14 suites `test:*-demo` del backend siguen en verde (196 checks).
- **Lección anotada**: instalar una dependencia en un workspace de un monorepo pnpm puede romper silenciosamente el *type-checking* de otro workspace sin tocarle una sola línea de código — `vite build`/`esbuild` no lo detectan porque no tipan de verdad. De acá en más, tras instalar cualquier dependencia nueva en cualquier workspace, correr `nest build` (no sólo `vite build`) antes de dar por buena la sesión.

## [2026-08-29] — Tutorial guiado (tour interactivo por rol)

A pedido del usuario ("agregar una opción de tutorial/guía de cómo hacer los procesos ante un primer ingreso"). Alcance acordado antes de codear (dos preguntas, `AskUserQuestion`): formato **tour interactivo con tooltips sobre la pantalla real** (no una página de ayuda estática ni sólo un modal — el usuario prefirió esto explícitamente, aunque implica más trabajo y una librería nueva) y **una guía por rol** con los flujos principales de cada uno.

- **Librería nueva**: `react-joyride` (única dependencia nueva de `apps/web` en esta sesión junto con `xlsx`). Es la v3, con una API bastante distinta de los tutoriales/ejemplos más conocidos de v2 (`onEvent` en vez de `callback`, sin export default — `import { Joyride } from 'react-joyride'`) — se investigó su `.d.ts` directamente en `node_modules` antes de escribir el wrapper, en vez de asumir la API vieja.
- **`tutorial/tours.ts`**: 4 tours (`tourAdministrativo` = propietario+admin, `tourVeterinario`, `tourRecepcion`, `tourCapataz`), cada `TourStep` con un `target` (selector `data-tour="..."`) y una `seccion` opcional — el `nombre` de `Vista` (`App.tsx`) al que hay que navegar antes de mostrar ese paso.
- **`components/TutorialGuiado.tsx`**: wrapper controlado (`stepIndex` propio, no el avance automático de la librería) — cuando el siguiente paso pide una sección distinta a la actual, primero navega (`onNavegar` → `setVista` en `App.tsx`) y recién cuando `seccionActual` ya refleja ese cambio (un `useEffect` separado) confirma el nuevo `stepIndex`, para que el elemento ya esté montado cuando Joyride lo busca. Si el target no existe en ese momento (`EVENTS.TARGET_NOT_FOUND` — puede pasar en pasos "profundos" si el usuario ya estaba en una sub-vista distinta a la esperada dentro de esa sección) el tour salta ese paso en la misma dirección en la que venía, en vez de trabarse.
- **Disparo**: un flag en `localStorage` por usuario (`ecosistema.tutorial.visto.<usuarioId>`) — decisión deliberada de no sumar esto al backend, es puramente onboarding, no necesita persistir entre dispositivos. Se muestra solo al primer login; siempre se puede reabrir con el botón nuevo "❓ Ayuda" en el topbar.
- **`App.tsx`**: cada botón del nav suma `data-tour="nav-<seccion>"` (siempre montado, independiente de qué página esté activa, así que la mayoría de los pasos ni siquiera necesitan navegar); 3 pasos "profundos" apuntan a un botón dentro de la página (`turnos-nuevo`, `animales-nuevo`, `tropera-nuevo`) — se verificó que los tres se renderizan siempre en la cabecera de su página, sin condicionar por estado de carga o de selección interna, para que el target no desaparezca a mitad del tour.
- **Verificado**: `vite build` limpio, y un smoke test con el dev server real (`pnpm dev`, `curl` a los módulos nuevos) confirmando que Vite pre-empaqueta `react-joyride` sin errores y sirve `App.tsx`/`TutorialGuiado.tsx`/`tours.ts` con 200 (nada de overlay de error de compilación). **No se pudo hacer clic a través del tour en un navegador real** — no hay ninguna herramienta de automatización de browser disponible en este entorno; la lógica se trazó a mano paso por paso (los 12 pasos del tour administrativo) para confirmar que cada `target` existe en el momento en que Joyride lo busca, pero la verificación visual real queda pendiente para cuando el usuario lo pruebe.

## [2026-08-29] — Domicilio en `core.personas`

A pedido del usuario ("modelemos el domicilio"), cierra el pendiente menor que había quedado anotado en la entrada anterior (carnet/ficha) y en el Roadmap. Texto libre (`domicilio: text`), mismo criterio que `tropera.establecimientos.ubicacion` — no se modela por componentes (calle/número/localidad/CP separados) porque nada en el sistema necesita filtrar o geocodificar por esas partes.

- **Schema + migración**: `core.personas.domicilio` (migración `0012_pretty_squadron_supreme.sql`, un solo `ALTER TABLE ADD COLUMN`, generada con `db:generate`).
- **Backend**: `CreatePersonaDto`/`UpdatePersonaDto` lo suman como opcional; `PersonasService.crear()`/`actualizar()` lo persisten; `CarnetService.buildData()` ahora lo trae del join real en vez del placeholder `'—'` hardcodeado — la ficha A4 (agregada en la entrada anterior) ya lo imprime.
- **Web**: `Persona` (tipo) + `DuenoForm` en `PersonasPage.tsx` suman el campo; se agregó también a la columna de export de `ExportBar`.
- **Mobile**: mismo criterio que las extensiones de sync anteriores — `personas` ya estaba en el registry de sync y en el schema WatermelonDB, así que sólo hizo falta sumar la columna ahí también (schema v3→v4, `addColumns` sobre `personas`, campo nuevo en el modelo `Persona.ts`) para que no se pierda offline.
- **Encontrado y corregido de paso — deuda de testing, mismo patrón recurrente de siempre**: al generar la migración, `test:personas-demo`, `test:turnos-demo` y `test:sync-demo` se rompieron los tres — importan la tabla Drizzle real `core.personas` (no una redefinición propia) y su `.returning()` ahora incluye `domicilio` en la lista de columnas devueltas, que no existía en el DDL hand-rolled de esos tres tests. Corregido agregando la columna a los tres (nullable, sin lógica que la ejercite todavía). Las 14 suites vuelven a estar en verde.
- **Aplicado contra el `pgdata` real del usuario**: sin backend corriendo en ese momento (verificado con `lsof -i :3000`), se aplicó el `ALTER TABLE` directamente con un script PGlite descartable, verificando `count(*)` de `personas` y `organizaciones` antes/después (sin cambios, sólo se sumó la columna) antes de borrar el script.
- **Verificado con un backend efímero** (`PORT=3089`, `pgdata` descartable en `/tmp`): alta de persona con domicilio, `PATCH` actualizándolo, y la ficha A4 renderizada mostrando "Av. Siempre Viva 742, Springfield" en el campo Domicilio en vez de `—`.

## [2026-08-29] — Carnet y ficha del animal: dos PDFs distintos, no uno solo

A pedido del usuario: "el carnet" hasta ahora era un único documento A5 con look de libreta sanitaria (identificación + tabla de vacunas). El pedido separa dos necesidades reales: una **ficha A4** para archivar/imprimir en la clínica con el registro completo (vacunas/desparasitaciones/tratamientos, llena o vacía), y un **carnet** que se pueda imprimir y llevar encima como un DNI del animal (tarjeta chica, no una hoja).

- **`ficha.document.ts`** (nuevo, A4): es básicamente el documento anterior reubicado — identificación, columnas paciente/responsable y la tabla de vacunaciones — retitulado "Vacunas, desparasitaciones y tratamientos preventivos" (columna "PRODUCTO" en vez de "VACUNA"). No hizo falta ningún cambio de schema: `hce.vacunaciones.producto` ya es texto libre, así que una desparasitación cargada ahí (ej. "Antiparasitario Drontal") ya aparece en la misma tabla — no hay (ni hacía falta agregar) un `tipo` que distinga vacuna de desparasitación.
- **`carnet.document.ts`** (reescrito): ahora es una tarjeta CR80 real (85.6×54mm, `Page size: [243, 153]` en puntos) — foto (si `animales.fotoUrl` está cargada; si no, un placeholder, porque no existe todavía feature de carga de fotos en la web) + nombre + especie/raza + código legible + microchip arriba, QR + datos del responsable abajo. Un solo lado (no frente/dorso) — mantener el documento a una cara era alcance MVP razonable, doble faz queda para si hace falta después.
- **`carnet.service.ts`**: `buildData()` (la query real contra Drizzle) se reutiliza para ambos documentos sin cambios — sólo se sumó `fotoUrl` a la proyección. `generarCarnet()` ahora arma la tarjeta, `generarFicha()` (nuevo método) arma la A4.
- **`carnet.controller.ts`**: `GET /animales/:id/carnet.pdf` (tarjeta, sin cambiar la ruta) + `GET /animales/:id/ficha.pdf` (nuevo).
- **Web**: `PacienteDetallePage.tsx` suma el botón "Descargar ficha (A4)" junto al ya existente "Descargar carnet" (ambos comparten un solo helper `abrirDocumento('carnet'|'ficha')` en vez de duplicar el fetch).
- **Encontrado y eliminado de paso — código muerto y roto**: `apps/web/src/api/carnet.ts` (`abrirCarnet()`) no lo importaba nadie — el botón real de "Descargar carnet" siempre usó un fetch inline en `PacienteDetallePage.tsx` con la sesión pasada por props. Además tenía un bug real: leía `localStorage['huella.sesion']`, una clave que nunca existió (la real es `'ecosistema.sesion'`, la que usa `useSesion`) — si alguna vez se hubiera importado, habría llamado al endpoint sin `Authorization` ni `X-Organizacion-Id` y fallado con 401 siempre. Borrado en vez de arreglado, por estar confirmado sin uso.
- **Verificado con un backend efímero** (`PORT=3088`, `pgdata` descartable en `/tmp`, borrado al terminar): registro → animal real → los dos PDFs se generan con las dimensiones correctas (`pdfinfo`: carnet 243×153pt, ficha A4 595×842pt) → renderizados a imagen (`pdftoppm`) e inspeccionados visualmente — la ficha con la tabla vacía primero y después con 2 filas (una vacuna, una desparasitación) mostrando fecha/próxima dosis correctas; el carnet con la identificación, QR y datos del responsable legibles en el tamaño de tarjeta real.
- `nest build`/`vite build` limpios, las 14 suites de backend siguen en verde (196 checks — este cambio no tocó lógica de negocio, sólo documentos/rutas, así que no ameritó una suite `test:*-demo` propia).

## [2026-08-29] — Fase 7 (Encargado de Estancia): investigada, no arrancada — no hay subconjunto sin decisiones

Alcance acordado con el usuario antes de codear: avanzar sólo lo que **no** requiera una decisión suya, dado que sigue sin estar disponible para resolverlas ("solo lo que no requiere decisiones"). El framing inicial asumía que el cálculo de GDP (ganancia diaria de peso) podía apoyarse en "pesajes ya existentes" — se investigó el código antes de escribir nada y esa premisa era falsa.

- **No existe ningún registro de peso para hacienda de campo.** `tropera.eventos` no tiene un tipo `pesaje` (el enum `tipo_evento` es vacunacion/desparasitacion/tratamiento/servicio/diagnostico_prenez/destete); "Pesaje" sólo aparece como texto de ejemplo de un ítem de plantilla (`schema/tropera.ts:286`), no como dato estructurado. `hce.consultas.pesoKg` es de la ficha clínica de mascotas, sin relación con `animales_campo`. Sin una fuente de peso, no hay GDP que calcular — y decidir cómo modelarlo (¿tipo de evento nuevo? ¿tabla propia? ¿unidad?) es exactamente el tipo de decisión que se estaba tratando de evitar esta pasada.
- **El "semáforo de potreros"** tiene un campo ya preparado (`potreros.capacidadCabezas`, cargado en Fase E "para un futuro semáforo, no se usa todavía") pero el conteo real de cabezas por potrero sólo puede salir de `animales_campo.potreroId` — bajo el modelo híbrido, un establecimiento puede tener la mayoría de su hacienda sólo en `existencias` agregadas (sin granularidad de potrero). Un semáforo calculado así subestimaría la ocupación real en cualquier establecimiento no migrado a seguimiento individual, y presentarlo como confiable sería engañoso sin que el usuario decida cómo tratar ese caso.
- **Planificador de rotación multidía** y **reportes gerenciales** son, directamente, diseño desde cero (algoritmo/UI el primero, qué KPIs importan el segundo) — nunca fueron candidatos a "sin decisiones".
- **Registro de raciones** tampoco tiene ningún modelo previo (tipos de alimento, unidades, periodicidad) del que partir sin inventar la primera decisión de alcance.

**Conclusión: los 5 puntos de Fase 7 requieren alcance definido con el usuario — no se escribió código de Fase 7 esta pasada** para evitar construir sobre supuestos que probablemente haya que rehacer. Queda anotado para retomar con el mismo patrón usado en Tropera/Caja: una `AskUserQuestion` acotada antes de codear, cuando el usuario esté disponible para resolverla.

## [2026-08-29] — Mobile: cobertura de sync para Fase E (seguimiento individual de campo)

A pedido del usuario ("los otros últimos puntos"), acotado antes de codear con una pregunta de alcance: **sólo capa de datos** (schema + modelos + registry de sync), sin pantallas — el usuario sigue sin poder verificar visualmente. `apps/mobile` ya traía una app WatermelonDB real (no un scaffold vacío como se pensaba: modelos + pantallas de pacientes/turnos/establecimiento/sync existentes de antes de esta sesión), pero su cobertura de sync se había quedado en F1.1–F1.6 — nada de Fase E.

- **Backend (`sync.core.ts`)**: sumadas al `REGISTRY` genérico `animales_campo`, `potreros`, `hallazgos`, `toros_virtuales`, `muestras`, `plantillas_tareas`, `protocolos_iatf` y `tareas` — el motor de pull/push ya es completamente genérico (serializa/valida por columnas Drizzle), así que no hizo falta tocar su lógica interna, sólo el registro. **Excluidas a propósito**: `plantilla_items`, `protocolo_iatf_pasos` y `evaluaciones_andrologicas` — son filas hijas inmutables sin `updated_at`/`deleted_at`, columnas que el motor asume en toda tabla registrada; sumarlas requiere antes esa migración de schema, una decisión de alcance aparte de "cablear el registry". Tampoco se sumaron Farmacia, Caja ni `hce.macros`/indicaciones — desk/online por diseño (Caja es una reconciliación de caja en vivo; la dispensa de Farmacia depende de `consultas`, que tampoco está pensada para offline), bajo valor para captura en el campo.
- **Encontrado y corregido de paso — bug real de orden de FKs**: al registrar las tablas nuevas, `eventos` quedó agregado en el registry ANTES que `animales_campo`/`hallazgos`/`toros_virtuales`, sus 3 FKs opcionales nuevas de Fase E. El push aplica todas las creaciones de una ronda **en una sola transacción, en el orden del registry** — si un capataz carga offline un animal nuevo y un evento sobre ese animal en la misma sincronización, el insert de `eventos` habría corrido antes de que existiera la fila de `animales_campo` referenciada, violando la FK. Reordenado el registry (potreros → animales_campo → hallazgos/toros_virtuales → muestras/plantillas/protocolos/tareas → eventos al final) y agregado un check nuevo a `test:sync-demo` que reproduce exactamente ese caso (potrero + animal_campo + hallazgo + toro_virtual + evento que referencia a los tres, todo en un solo push) para que no vuelva a pasar desapercibido.
- **Mobile (`db/schema.ts` + `db/migrations.ts`, v2→v3)**: schema espejado 1:1 con las tablas nuevas del backend (mismos nombres de columna snake_case, WatermelonDB no distingue tipos tan finos como Drizzle así que enums/uuid/date llegan como `string`), más `addColumns` sobre `eventos` (las 5 columnas de Fase E que el schema mobile nunca había recibido, aunque el backend las tenía desde antes de esta sesión — otra instancia del mismo gap recurrente de drift entre schemas hand-mantenidos). 8 modelos WatermelonDB nuevos (`AnimalCampo`, `Potrero`, `Hallazgo`, `ToroVirtual`, `Muestra`, `PlantillaTarea`, `ProtocoloIatf`, `Tarea`) registrados en `database.ts`. `sync.tsx` (pantalla existente, sólo el texto de ayuda) actualizado para mencionar lo nuevo.
- **Verificado**: `test:sync-demo` pasó de 24 a **27 checks** (todos en verde), las 14 suites del backend siguen limpias (**196 checks en total**), `nest build` limpio, `tsc --noEmit` de `apps/mobile` limpio. **Sin poder correr la app mobile en un device/emulador** — no hay esa herramienta disponible en este entorno; sigue pendiente para cuando el usuario pueda probarla en un dispositivo real.

## [2026-08-29] — `test:farmacia-demo` cierra el último gap de deuda de testing

Continuación directa de la entrada anterior ("si arranca con ese y los otros últimos puntos" — el primero de la lista). Farmacia era el único módulo del backend, junto con Tropera y Caja, verificado siempre a mano por curl y sin suite propia; con esta entrada las 14 áreas del backend tienen su `test:*-demo`.

- **`test/farmacia-flow.demo.ts`** (14 checks): alta de producto con los campos de la calculadora de dosis (`precio`/`concentracion`/`dosisSugeridaMgKg`, F. B) y aislamiento por organización en el listado; stock arrancando en 0 sin fila propia (`LEFT JOIN` + `coalesce`) y `fijar()` como upsert (dos llamadas no duplican fila); movimientos con la misma lógica transaccional que Tropera/Caja (`compra` suma, `venta`/`merma` restan, rechazo de una baja que dejaría stock negativo **sin aplicar nada a medias**); la dispensa ligada a consulta (F4.3: un movimiento `tipo:'uso'` con `consultaId`) verificada tanto en el efecto sobre stock como en el filtro `GET .../movimientos?consultaId=`.
- Mismo patrón que las 13 suites existentes: `PGlite` en memoria, DDL mínimo hand-rolled (incluyó `core.animales.persona_id` y las columnas clínicas de `hce.consultas` que el `INSERT` de Drizzle necesita aunque el test no las use, mismo gap recurrente de siempre), lógica de `ProductosService`/`StockService`/`MovimientosService` replicada inline.
- **Las 14 suites del backend pasan limpias, 193 checks en total.** `nest build` limpio. `CLAUDE.md` actualizado con el comando nuevo.

## [2026-08-29] — `test:tropera-demo` ampliada a Fase E completa (E.2–E.6)

Continuación directa de la entrada anterior, a pedido del usuario ("avancemos con lo que falte de código"). Se extendió `tropera-flow.demo.ts` (en vez de crear 6 archivos nuevos) para cubrir lo único que quedaba sin regresión automática: E.2–E.6. Un solo archivo tiene sentido acá porque todas estas tablas cuelgan de `establecimientos`/`animales_campo`, ya declarados en el setup existente — separarlas hubiera duplicado ese boilerplate 6 veces.

- **Hallazgos (E.2)**: siembra lazy del catálogo default (8 hallazgos, importados de la fuente real `hallazgos-default.ts` en vez de hardcodearlos de nuevo), idempotencia, catálogos independientes por organización.
- **Diagnóstico reproductivo (E.2)**: `resultadoReproductivo` + `hallazgoId` guardados juntos en un evento imputado a un animal — de paso, la columna pasó de `text` a un enum real de Postgres en el DDL del test (iguala el comportamiento de producción, que si validaba el valor).
- **Toros virtuales (E.3)**: creado y referenciado desde un evento `servicio`.
- **Muestreos caravana-tubo (E.3)**: `ultimoTubo()` en 0 sin muestras, sube a 2 tras cargar dos tubos.
- **Evaluación andrológica (E.3)**: los mismos umbrales del service real (≥30cm/≥50% → apto) replicados y verificados con un caso apto y uno no apto.
- **Potreros y Apartados Rápidos (E.4)**: el "apartado" es literalmente el `UPDATE` de `potreroId` — se verificó que el animal aparece filtrando por ese potrero después.
- **Modo Plantilla (E.5)**: una plantilla de 3 ítems aplicada a un animal crea exactamente 3 eventos, todos imputados a ese animal, en una sola transacción.
- **Protocolos IATF (E.6)**: un protocolo de 4 pasos (día 0/7/9/11) aplicado con fecha de inicio 2026-09-01 generó tareas en 2026-09-01/08/10/12 — la misma aritmética de fechas ya verificada a mano por API, ahora como regresión; completar una tarea la saca del filtro de pendientes.
- `tropera-flow.demo.ts` pasó de 19 a **41 checks**. Las 13 suites del backend siguen pasando limpias, **179 checks en total**.

## [2026-08-29] — Deuda de testing: `test:tropera-demo` y `test:caja-demo`

El usuario se iba a ir varias horas y pidió algo de desarrollo para dejar avanzado sin necesitar verificación visual. Se cerró un gap anotado varias veces en esta misma sesión: Tropera y Caja se habían verificado siempre a mano por curl contra un backend efímero, sin ninguna suite automatizada propia (a diferencia de las otras 11 áreas del backend).

- **`test/tropera-flow.demo.ts`** (41 checks, ampliada más tarde el mismo día — ver entrada siguiente): existencias (upsert, completa las 6 categorías en 0), movimientos (alta suma, baja resta, **rechazo de stock negativo sin dejar nada aplicado a medias**, traslado entre establecimientos creando la fila de destino si no existía), eventos (agregado vs. imputado a un animal, con retiro sanitario), animales individuales (E.1: secuencia `TEMP-N` correlativa, conciliación y rechazo de re-conciliar), y aislamiento entre organizaciones. Arrancó cubriendo sólo el núcleo F1.1–F1.6 + E.1 (19 checks) — E.2–E.6 se sumaron después en la misma sesión.
- **`test/caja-flow.demo.ts`** (16 checks): cobro/egreso rechazados sin caja abierta, apertura y rechazo de doble apertura, cierre con cálculo correcto (`inicial + cobros − egresos`) y decisión automática de auditoría (`aceptado` sin diferencia, `pendiente` con diferencia), auditoría exigiendo observación salvo al aceptar, honorarios y liquidación (con verificación de que liquidar dos veces no vuelve a afectar nada), aislamiento entre organizaciones.
- Mismo patrón que las 11 suites existentes: `PGlite` en memoria (sin `dataDir`, sin ningún riesgo de tocar `pgdata`), DDL mínimo hand-rolled, lógica de los services replicada inline (no se importa el módulo de Nest).
- **Encontrado y corregido de paso**: al escribir estas suites, correr la batería completa mostró que `test:sync-demo` se había roto — su DDL hand-rolled de `tropera.eventos` no tenía las 5 columnas que sumó Fase E (`animal_campo_id`, `retiro_hasta`, `hallazgo_id`, `resultado_reproductivo`, `toro_virtual_id`). Mismo gap recurrente de siempre (cada test recrea el schema a mano); corregido agregando las columnas nuevas como nullable sin FK (el test no ejercita esas relaciones). Con este fix, **las 13 suites del backend pasan limpias, 157 checks en total**.
- `CLAUDE.md` tenía la lista de comandos `test:*-demo` desactualizada (le faltaban 6 de los 13) — corregido de paso, es la única sección tocada de ese archivo (el resto del drift documentado al principio de esta sesión sigue sin resolver, no era parte de este pedido).

## [2026-08-29] — Fase E.4/E.5/E.6 del spec UI/UX: potreros, plantillas 1-tap y protocolos IATF — Fase E cerrada

Cierre de Fase E completa, a pedido explícito del usuario ("terminemos la fase e"). Las tres piezas que quedaban pendientes de los cortes anteriores.

### Backend — 3 conceptos nuevos en `tropera`
- **`tropera.potreros`** (§5.3/§7.1): subdivisión de un establecimiento — no existía ninguna granularidad más chica que "establecimiento completo" hasta ahora. `animales_campo` suma `potreroId` (opcional); los **Apartados Rápidos** son literalmente el `PATCH` normal de `animales-campo` con un `potreroId` nuevo, no una acción separada. `GET /tropera/animales-campo?potreroId=` para ver quién está en cada potrero.
- **`tropera.plantillas_tareas` + `plantilla_items`** (§5.1, Modo Plantilla): una plantilla ("Rutina de manga" = Vacuna + Antiparasitario + Pesaje) es una lista de `{tipo, producto}`. `POST .../aplicar` con un animal es el 1-tap: crea un evento por ítem, todos imputados a ese animal, en una transacción.
- **`tropera.protocolos_iatf` + `protocolo_iatf_pasos` + `tropera.tareas`** (§6.2, la parte que se había diferido en E.3): a diferencia de una plantilla, un protocolo no crea eventos ya sucedidos — genera **tareas programadas a futuro** (`fechaProgramada` = fecha de inicio + `diaOffset` de cada paso). `tropera.tareas` es el primer concepto de "tarea agendada" en todo el sistema (los `turnos` de HCE son citas con un dueño, no esto). Completar/cancelar una tarea es un `PATCH` de estado — no crea un evento automáticamente todavía, eso queda anotado como alcance futuro si hace falta.
- Migración `0011_messy_spectrum.sql`: diff limpio de una sola pasada (7 tipos/tablas nuevos + la columna en `animales_campo`).

### Web — `TroperaPage.tsx`
- Sección "Potreros" en el detalle del establecimiento (alta simple); columna "Potrero" en la tabla de animales individuales; el form de edición de la ficha suma el selector de potrero — si el animal tiene un retiro sanitario vigente, cambiar de potrero dispara un `confirm()` ("¿Confirmar y continuar?") antes de guardar, la alerta modal explícita del spec.
- En la ficha del animal: "Aplicar plantilla (1-tap)" (selector + botón, sólo aparece si hay plantillas cargadas) y "Protocolo IATF" (selector + fecha de inicio + lista de tareas generadas con Completar/Cancelar).
- Nueva sección "Plantillas y protocolos (catálogos)" en el detalle del establecimiento: gestión org-wide de ambos catálogos (alta con ítems/pasos dinámicos).
- Nueva sección "Agenda de tareas": todas las tareas del establecimiento (no ligadas a un animal puntual en la vista), con filtro "sólo pendientes".

### Verificado
- Backend: `nest build` limpio; `test:hce-demo`/`test:macros-demo`/`test:indicaciones-demo`/`test:turnos-demo` siguen en verde. Tropera sigue sin suite propia — verificado por API contra un backend efímero: potrero creado y asignado a un animal vía Apartado Rápido, listado filtrado por potrero; plantilla de 3 ítems aplicada a un animal creando exactamente 3 eventos; protocolo de 4 pasos (día 0/7/9/11) aplicado con fecha de inicio 2026-09-01 generando tareas en las fechas exactas esperadas (09-01/09-08/09-10/09-12); completar una tarea la saca correctamente del filtro de pendientes.
- Web: `vite build` limpio, `tsc --noEmit` sin errores nuevos de una clase distinta a los ya preexistentes.
- **Sin verificar en el navegador** — sigue pendiente toda la verificación visual de Fase E (y de B/C/D), para cuando el usuario esté en su compu.

**Fase E completa: E.1 (fichas individuales) → E.2 (diagnóstico reproductivo) → E.3 (muestreos/genética) → E.4 (potreros/apartados) → E.5 (plantillas 1-tap) → E.6 (protocolos IATF/tareas), las 6 sub-fases con backend probado por API. Ninguna tocó el modelo agregado de Tropera (F1.1–F1.6), tal como definía el modelo híbrido acordado al principio.**

## [2026-08-29] — Fase E.2/E.3 del spec UI/UX: diagnóstico reproductivo, muestreos y genética

Continuación de E.1 en la misma sesión, a pedido del usuario ("adelantemos todo lo que podamos" — sin poder verificar visualmente, está fuera de su casa). Se dejó afuera a propósito la parte más grande de §6.2 (Protocolos IATF con tareas programadas a futuro) porque es un concepto nuevo — "tareas agendadas que se disparan solas en fechas futuras" no existe en ningún lado del sistema hoy (los `turnos` de HCE son citas, no tareas de campo) — y merece su propio corte en vez de sumarse apurado a este. Apartados por potrero (§5.3) sigue esperando el modelo de potreros.

### Backend — 4 piezas nuevas en `tropera`, todas opcionales sobre `eventos`
- **`tropera.hallazgos`** (§6.1): catálogo normalizado de hallazgos patológicos, mismo patrón de siembra lazy que `hce.macros` (8 hallazgos default: Metritis, Endometritis, Quiste ovárico, etc.).
- **`tropera.toros_virtuales`** (§6.2): catálogo de "toros virtuales / pajuelas" para filiación genética, sin que el toro físico esté cargado como `animales_campo`.
- **`tropera.eventos`** suma `hallazgoId`, `resultadoReproductivo` (enum `prenada`/`vacia`/`anestro`) y `toroVirtualId` — los tres opcionales y validados contra la organización si vienen cargados; ninguno excluye al otro (un evento puede tener hallazgo sin ser diagnóstico de preñez, por ejemplo).
- **`tropera.muestras`** (§6.2, interfaz caravana-tubo): `tuboNumero` + caravana (o `animalCampoId` si el animal ya está cargado individualmente). `GET .../muestras/ultimo-tubo` expone el último número registrado para que el frontend sugiera el siguiente y alerte sobre saltos — sin bloquear a nivel de constraint, por si hace falta corregir una muestra puntual.
- **`tropera.evaluaciones_andrologicas`** (§6.2): circunferencia escrotal + motilidad de un toro (`animal_campo` puntual, no del catálogo de toros virtuales) → `apto` lo calcula el service con un umbral simplificado (≥30cm y ≥50%, documentado como MVP que no reemplaza el criterio clínico), no lo manda el cliente.
- Migración `0010_stale_sumo.sql`: diff limpio de una sola pasada.

### Web — `TroperaPage.tsx`
- `NuevoEventoForm` (ya generalizado en E.1) suma: grilla 1-tap de resultado reproductivo cuando `tipo='diagnostico_prenez'`, chips de hallazgos normalizados (diagnóstico de preñez y tratamiento), y selector de toro virtual cuando `tipo='servicio'` — los catálogos se piden sólo cuando el tipo de evento los necesita, no en cada apertura del form.
- Nueva sección "Muestreos (caravana-tubo)" en el detalle del establecimiento: sugiere el próximo número de tubo y muestra una alerta (no bloqueante) si el número cargado salta el siguiente esperado.
- Nueva sección "Evaluación andrológica" en la ficha individual, visible sólo si `categoria === 'toro'`: formulario de circunferencia/motilidad + historial con el resultado de aptitud ya calculado.

### Verificado
- Backend: `nest build` limpio; `test:hce-demo` (10/10), `test:macros-demo` (7/7) e `test:indicaciones-demo` (12/12) siguen pasando (no tocan Tropera, pero confirman que nada del resto se rompió). Tropera sigue sin suite `test:*-demo` propia — verificado por API contra un backend efímero: siembra lazy de hallazgos, diagnóstico de preñez con resultado + hallazgo imputado a un animal, rechazo de un `resultadoReproductivo` inválido, toro virtual creado y referenciado desde un evento de servicio, dos muestras con tubos correlativos y `ultimo-tubo` reflejando el máximo, evaluación andrológica apta (35cm/60%) y no apta (25cm/40%) calculadas correctamente.
- Web: `vite build` limpio, `tsc --noEmit` sin errores nuevos de una clase distinta a los ya preexistentes.
- **Sin verificar en el navegador** — pendiente para cuando el usuario esté en su compu.

## [2026-08-29] — Fase E.1 del spec UI/UX: seguimiento individual de campo (modelo híbrido)

Fase E estaba bloqueada desde que se armó Tropera por una decisión de fondo sin tomar: si la hacienda pasa de conteo agregado a seguimiento individual — algo que "contradice la decisión de alcance ya tomada" (ver nota en Fase 1). Se resolvió con el usuario antes de codear (una pregunta, opción recomendada): **modelo híbrido**. El seguimiento individual se suma en paralelo a `existencias`/`movimientos` agregados, sin tocarlos ni migrar nada — un establecimiento puede tener parte de su hacienda contada por categoría y parte identificada animal por animal, y no hay reconciliación automática entre ambas formas (es una decisión, no un olvido).

Alcance de este primer corte (E.1, §5.2 del spec): lo mínimo para identificar y seguir un animal. Diagnóstico reproductivo (§6.1), caravana-tubo (§6.2) y apartados por potrero (§5.3 — necesita modelar potreros, que hoy no existen en Tropera) quedan para próximos cortes.

### Backend — nueva tabla `tropera.animales_campo`
- Una fila por animal individual: `caravana`, `caravanaDefinitiva` (boolean), `categoria` (mismo enum que existencias), `sexo`, `estado` (activo/vendido/muerto/transferido), `fechaAlta`, `observaciones`.
- **Alta Express Transitoria**: si `POST /tropera/animales-campo` no manda `caravana`, el service consume `tropera.animales_campo_temp_seq` (mismo patrón que `core.animales_codigo_seq` para el código legible) y asigna `"TEMP-N"` con `caravanaDefinitiva=false`. Si se manda una caravana real, queda definitiva desde el alta.
- **Bandeja de Conciliación**: `GET /tropera/animales-campo?transitorios=true` lista los pendientes; `PATCH .../conciliar` les asigna la caravana real (rechaza si ya era definitiva).
- `tropera.eventos` suma `animalCampoId` (opcional, valida pertenencia a la organización) y `retiroHasta` (§5.3: período de retiro sanitario) — un evento puede seguir siendo agregado por categoría (como antes) o imputarse a un animal puntual, ambos caminos conviven en la misma tabla. `GET /tropera/animales-campo/:id/eventos` es la ficha individual (historial filtrado por ese animal).
- Roles de escritura: mismo criterio que existencias/movimientos (`propietario`/`admin`/`capataz`).
- Migración `0009_awesome_taskmaster.sql`: `drizzle-kit generate` dio un diff limpio de una sola pasada; se agregó a mano el `CREATE SEQUENCE` (drizzle no tiene un builder declarativo para secuencias en esta versión, mismo criterio ya usado en la migración base).

### Web — `TroperaPage.tsx`
- Nueva sección "Animales individuales" dentro del detalle de establecimiento, entre Hacienda y Movimientos: alta express (categoría + un clic), alta completa (con caravana/sexo/observaciones), checkbox "Sólo pendientes de conciliar" y una acción inline "Asignar caravana" por fila.
- Ficha del animal (`FichaAnimalCampo`): datos + historial de eventos propios + alerta visible si hay un retiro sanitario vigente (`retiroHasta` de algún evento ≥ hoy) + alta de evento ya pre-cargado con `animalCampoId` (oculta los campos de categoría/cantidad agregados, que no aplican a un animal puntual).
- `NuevoEventoForm` (ya existente) se generalizó para aceptar un `animalCampoId` opcional, reusado tanto desde el establecimiento (evento agregado, como antes) como desde la ficha individual.

### Verificado
- Backend: `nest build` limpio. Sin suite `test:*-demo` propia (mismo gap que Tropera y Caja) — verificado por API contra un backend efímero: alta transitoria (`TEMP-1`, `TEMP-2` correlativos), alta con caravana real, conciliación (y rechazo de conciliar dos veces), bandeja filtrando correctamente, evento con `retiroHasta` imputado al animal apareciendo en su ficha, evento agregado normal (sin animal) sin romperse, `animalCampoId` de otra organización rechazado, y **existencias agregadas sin verse afectadas** por ninguna de las altas individuales — confirma que el modelo híbrido no interfiere consigo mismo.
- Web: `vite build` limpio, `tsc --noEmit` de `apps/backend` contra `apps/web` sin errores nuevos de una clase distinta a los ya preexistentes.
- **Sin verificar en el navegador** — el usuario está fuera de su casa, queda pendiente para más tarde.

## [2026-08-29] — Verificación real de Fases B y C (con incidente) + reset de `apps/backend/pgdata`

Antes del incidente de abajo, se verificaron Fases B y C **contra datos reales** (backend real, `pgdata` real, usuario `c@gmail.com`/`celia1967`, roles `propietario`+`veterinario`), no sólo contra bases efímeras de curl como las sesiones anteriores:
- **Fase B**: siembra lazy de macros confirmada sobre la organización real; una indicación de stock interno con calculadora de dosis (6.2kg × 10mg/kg sobre 50mg/ml → "62.0 mg (~1.24 ml)") descontó stock real (20→18) y apareció correctamente en el portal público por código del animal real (`duki`, código `CAN-AR-00006H-U`).
- **Fase C**: `GET /dashboard/resumen` devolvía `consultasEsteMes: 3` pero el drill-down (`GET /consultas?desde=`) sólo traía 2 — **bug real encontrado**: `DashboardService.resumenClinica()` contaba consultas soft-borradas (le faltaba `isNull(deletedAt)`; el mismo gap afectaba `pacientesActivos`, `turnosPorEstado` y `movimientosPorTipo`). Corregido en `dashboard.service.ts`, backend reconstruido y reiniciado.

### Incidente: dos procesos contra el mismo PGlite

Mientras el backend real seguía corriendo, se abrió una segunda conexión de diagnóstico contra el mismo `pgdata` (un script suelto, no el backend) — rompiendo el protocolo de un solo proceso por PGlite. Ese script falló al instante, pero el `pgdata` quedó en un estado que aborta al arrancar (`RuntimeError: Aborted()` dentro de `pg_initdb`, bug conocido y sin fix en la build WASM de PGlite tras un corte abrupto — [electric-sql/pglite#327](https://github.com/electric-sql/pglite/issues/327)). Los datos seguían físicamente legibles (`strings` sobre los archivos mostró emails, nombres, hashes intactos) pero el motor no lograba terminar el arranque ni en el original ni en una copia — no había forma de recuperarlo sin instalar Postgres 16 nativo para un WAL replay manual, y el usuario prefirió no hacerlo (era todo dato de prueba).

**Se resolvió reseteando**: `pgdata` viejo descartado, uno nuevo creado con `scripts/init-local-db.mjs` (las 9 migraciones + seed de especies), verificado arrancando limpio y sosteniendo un alta real sin crashear.

**Consecuencia**: la base local de desarrollo quedó vacía — el usuario de prueba `c@gmail.com`, los animales `duki`/`firulai`/`yika`/`tontin`/`pancho` y todo lo demás que hubiera cargado antes de esta fecha ya no existen. Cualquier sesión futura que asuma esos datos está asumiendo mal; hay que recrearlos.

**Lección de proceso**: el protocolo de "nunca dos procesos contra el mismo PGlite" (ya documentado en este archivo antes) no tiene margen de error — ni siquiera un script de diagnóstico de sólo lectura es seguro mientras el backend real está arriba. Antes de correr cualquier query directa contra `pgdata`, confirmar primero que no hay ningún backend real escuchando ese `DATABASE_PATH` (`lsof -i :3000` + chequear `/proc/<pid>/environ`), sin excepciones.

## [2026-08-29] — Fase D del spec UI/UX: caja chica, auditoría de cierres y honorarios

Última pieza de la sesión, tras cerrar B y C. Antes de codear se acordaron 4 decisiones de alcance con el usuario (todas por la opción recomendada): precio en productos de Farmacia + concepto libre en servicios (sin catálogo de precios completo); una caja diaria **por organización** (no turnos por cajero); honorarios como reporte exportable **sin** cálculo automático de comisión ("liquidar" sólo marca cobros y reinicia el acumulador); egresos con concepto libre, sin categorías. Fuera de alcance a propósito: §2.5 (venta de una *fracción* de una presentación con descuento proporcional de stock) — hoy una venta de mostrador descuenta unidades enteras, igual que el resto de Farmacia; modelar capacidad por presentación queda para otra pasada.

### Backend — nuevo schema `caja`
- `caja.cajas`: una fila por jornada. `abrir()` rechaza si ya hay una `abierta` en la organización (chequeo a nivel service, mismo criterio que `tropera.existencias`/`farmacia.stock`). `cerrar()` calcula `montoCalculado = inicial + Σcobros − Σegresos`, compara contra `montoDeclarado` (el arqueo), y decide `estadoAuditoria`: `aceptado` automático si no hay diferencia, `pendiente` (entra a la bandeja de auditoría) si la hay — la "alerta silenciosa a la gerencia" del spec.
- `caja.cobros`: `concepto` + `monto` libres, `veterinarioId` opcional (a quién se le imputa, para honorarios), `productoId`/`cantidad` opcionales (venta de un producto de Farmacia). `crear()` exige una caja abierta (la resuelve del lado del servidor, no confía en un `cajaId` del cliente) y valida producto/consulta si vienen cargados.
- `caja.egresos`: tabla separada a propósito — "aislamiento de egresos" del spec, nunca se listan junto a los cobros.
- `farmacia.productos` suma `precio` (opcional). `farmacia.movimientos_stock` suma el tipo `venta` (venta de mostrador, distinta de `uso` que es dispensa ligada a consulta) — mismo patrón que `IndicacionesPanel` (Fase B): el frontend dispara un segundo `POST /farmacia/movimientos` después de crear el cobro, no hay acoplamiento directo entre los dos módulos.
- Migración `0008_blue_wolf_cub.sql`: `drizzle-kit generate` produjo un diff limpio de una sola pasada (schema nuevo + los dos agregados a `farmacia`) — confirma que el journal sigue sano desde el squash.
- Endpoints: `POST/GET /caja/cajas`, `GET /caja/cajas/actual`, `PATCH /caja/cajas/:id/cerrar`, `GET /caja/cajas?estadoAuditoria=` (bandeja de auditoría) + `PATCH /caja/cajas/:id/auditoria` (roles `propietario`/`admin` únicamente — §4.1 es "Propietario/Gerente"), `POST/GET /caja/cobros`, `GET /caja/cobros/honorarios` + `PATCH /caja/cobros/honorarios/liquidar`, `POST/GET /caja/egresos`. El resto de operaciones de mostrador (abrir/cerrar/cobrar/egresar) admite además `recepcion`.

### Web — `CajaPage.tsx` (nueva pestaña "Caja")
- Tres secciones internas (mismo patrón que `AdminPage.tsx`): **Caja del día** (todos los roles de mostrador), **Auditoría de cierres** y **Honorarios** (filtradas a `propietario`/`admin` dentro de la propia página, el switcher de secciones ni siquiera se muestra a `recepcion`).
- Caja del día: si no hay una abierta, formulario de apertura (monto inicial); si hay una abierta, cobros + egresos en vivo con el total calculado, y un cierre que muestra la diferencia en tiempo real antes de confirmar. Elegir un producto en el cobro sugiere el monto (cantidad × precio, editable) y dispara el movimiento de stock `venta` al guardar.
- Auditoría: bandeja filtrable por estado, acción "Revisar" por fila con Aceptar/En revisión/Rechazar — las dos últimas piden observación obligatoria (igual que el backend).
- Honorarios: elegir profesional + rango de fechas, tabla de cobros imputados con `ExportBar` (reusa el centro de exportación de Fase C) y "Marcar como liquidado".
- `FarmaciaPage.tsx` suma el campo `precio` a alta/edición/detalle de producto, y la etiqueta "Venta (mostrador)" para el nuevo tipo de movimiento.

### Verificado
- Backend: `nest build` limpio; las 12 suites `test:*-demo` existentes (`auth`, `animales`, `personas`, `hce`, `vacunas`, `turnos`, `sync`, `plataforma`, `roles`, `macros`, `indicaciones`) siguen pasando — hubo que sumar `precio` al DDL a mano de `farmacia.productos` en `indicaciones-flow.demo.ts` (mismo gap recurrente de siempre: cada `*-demo` recrea el schema a mano). Caja no tiene una suite `test:*-demo` propia todavía (gap nuevo, igual que Tropera) — se verificó por API contra un backend efímero, sin tocar el `pgdata` real: abrir caja, rechazo de cobro sin caja abierta, rechazo de doble apertura, cobro con veterinario imputado, venta de producto con descuento real de stock (10 → 8), egreso, cierre con diferencia (calculado 781 vs. declarado 780 → `pendiente`), rechazo de auditoría sin observación, auditoría con observación, honorarios trayendo el cobro correcto, liquidación marcando el flag — los 12 pasos respondieron exactamente como se esperaba. Backend apagado por PID exacto al terminar.
- Web: `vite build` limpio, `tsc --noEmit` de `apps/backend` contra `apps/web` sin errores nuevos de una clase distinta a los ya preexistentes (mismo ruido de siempre por falta de `@types/react`).
- **Sin verificar en el navegador** — misma limitación que B y C: sin credenciales ni forma de operar un browser real en esta sesión.

## [2026-08-29] — Fase C del spec UI/UX: drill-down del dashboard + centro de exportación

Continuación de la misma sesión que cerró Fase B. Antes de codear se acordó con el usuario un punto de alcance real: §4.2 pide KPIs de "facturación" y "ticket promedio", pero el sistema no tiene ningún dato de cobros (eso es Fase 5/ARCA, pausada a propósito). Se decidió aplicar el drill-down únicamente a los KPIs **no monetarios** que el dashboard ya tenía desde F5b.1 — nada de facturación se agregó ni se simuló.

### Backend — dos endpoints nuevos para poder desglosar lo que el dashboard ya cuenta
- `GET /consultas?desde&hasta`: consultas de **toda la organización** en un rango de fechas, con el nombre del paciente (join con `animales`) — antes `ConsultasController` sólo tenía `GET /consultas/animal/:animalId` (acotado a un paciente puntual). Necesario para el drill-down de "Consultas este mes".
- `GET /tropera/movimientos` suma `desde`/`hasta` opcionales (adicionales a `establecimientoId`, que ya existía), filtrando por `createdAt` — el mismo campo que `DashboardService` usa para contar "movimientos este mes por tipo", para que el desglose coincida exactamente con el número de la tarjeta.
- "Vacunas por vencer" y "turnos por estado" no necesitaron backend nuevo: ya existían `GET /vacunaciones/recordatorios?dias=` y `GET /turnos?desde&hasta`.

### Web — centro de exportación (§4.5), genérico y reutilizable
- `utils/exportar.ts`: `exportarCSV` (nativo, con BOM UTF-8 para que Excel no rompa tildes/ñ), `exportarExcel` (usa `xlsx`/SheetJS — única librería nueva agregada en toda la sesión; generar un `.xlsx` real a mano no es razonable, y el truco sin librería de disfrazar una tabla HTML como `.xls` dispara un cartel de advertencia en Excel al abrirlo, peor experiencia que sumar la dependencia) y `exportarPDF` (ventana imprimible + `window.print()` — "Guardar como PDF" es nativo de cualquier navegador, sin sumar una librería de generación de PDF en el cliente).
- `components/ExportBar.tsx`: tres botones (CSV/Excel/PDF) a partir de `columnas` + `filas` genéricas. Se agregó en **Animales** (`PacientesPage.tsx`), **Dueños** (`PersonasPage.tsx`), **Farmacia** (productos y movimientos por producto), **Tropera** (establecimientos, existencias, movimientos y eventos por establecimiento) y **Turnos** (agenda del día visible) — los cinco lugares que el usuario pidió explícitamente.

### Web — drill-down del dashboard (§4.2)
- `components/DrawerTabla.tsx`: drawer genérico (mismo patrón visual que el de la línea de tiempo médica de Fase B) con una tabla + `ExportBar` — click en una tarjeta KPI o un chip lo abre sin navegar a otra pantalla.
- `DashboardPage.tsx` reescrita: "Pacientes activos", "Consultas este mes" y "Vacunas por vencer (30 días)" pasan de `<div>` a `<button>` clickeable; cada chip de "Turnos por estado" y "Movimientos por tipo" también es clickeable. Cada uno dispara un fetch on-demand (nada se precarga de más) y arma la tabla del drawer. "Existencias actuales" ya mostraba el total por categoría; sumó un link "Ver desglose por establecimiento →" que abre el mismo drawer con el detalle sin agregado (ya estaba en `resumen.tropera.existenciasPorCategoria`, no hizo falta otro fetch).

### Gap encontrado y cerrado de paso (Fase B, no de esta fase)
`FarmaciaPage.tsx` nunca había sumado a sus formularios de alta/edición de producto los campos `concentracion`/`unidadConcentracion`/`dosisSugeridaMgKg` — el backend los soporta desde la migración `0007` (sesión anterior), pero sin estos campos en la UI la calculadora de dosis de `IndicacionesPanel` (Fase B) no tenía forma de activarse nunca desde la web. Se agregaron a ambos formularios y a la ficha de detalle del producto.

### Verificado
- Backend: `nest build` limpio; `test:hce-demo` (10/10) sigue pasando tras tocar `ConsultasService`. Tropera no tiene una suite `test:*-demo` dedicada (gap preexistente, no introducido acá) — se verificó por API contra un backend efímero (puerto aparte, base PGlite temporal en `/tmp`, el `pgdata` y backend reales del usuario sin tocar): se creó una organización, se le cambió el `tipo` a `mixta` con un script directo contra la base temporal (backend detenido por PID exacto antes del cambio, conteos verificados antes/después, reiniciado después) para poder probar los dos bloques del dashboard a la vez, se cargó una consulta y un movimiento de tropera, `GET /dashboard/resumen` trajo ambos bloques correctamente, y los dos endpoints nuevos (`GET /consultas?desde=`, `GET /tropera/movimientos?desde=`) devolvieron exactamente lo esperado — incluida una fecha futura sin resultados y el filtro combinado `establecimientoId`+`desde` funcionando juntos. Backend apagado por PID exacto al terminar.
- Web: `vite build` limpio (con warning esperado de tamaño de chunk por sumar `xlsx`, sin acción tomada — es una herramienta interna, no un sitio público optimizado por peso). `tsc --noEmit` de `apps/backend` contra `apps/web/tsconfig.json`: cero errores nuevos atribuibles a este trabajo, mismo ruido preexistente de siempre (namespace `React`, prop `key`, indexado con `any` por falta de `@types/react`).
- **Sin verificar en el navegador** — misma limitación que Fase B: sin credenciales de prueba ni forma de operar un browser real en esta sesión. La verificación de arriba confirma que el backend devuelve los datos correctos para el drill-down; falta confirmar visualmente que los drawers abren/cierran bien, que los tres formatos de descarga (CSV/Excel/PDF) se abren correctamente en Excel/un lector de PDF real, y que el `chunk` de 600kB no genera un salto perceptible al cargar el dashboard.

## [2026-08-29] — Fase B (clínica) del spec UI/UX: macros, indicaciones + calculadora de dosis, plan de tratamiento en el portal y delta editing/timeline

Retomado tras un corte de sesión (el backend de macros e indicaciones ya había quedado escrito y probado — `test:macros-demo` 7/7, `test:indicaciones-demo` 12/12, migración `0007_useful_iron_lad.sql` ya aplicada a `pgdata` — pero sin ningún consumo desde la web). Se comparó el spec adjunto por el usuario contra el que originó la división en Fases A-E: son idénticos, sin requerimientos nuevos en el documento. Se confirmó alcance con el usuario antes de codear (4 piezas, las 4 elegidas) y se cerraron todas en esta pasada.

### Macros en el formulario de consulta (§3.1)
- `MacroPicker` (`PacienteDetallePage.tsx`): un `<select>` por campo (anamnesis, examen físico, diagnóstico, tratamiento) que inserta el texto del macro elegido — en los `<textarea>` lo agrega a continuación de lo ya tipeado; en los `<input>` de una línea lo reemplaza. `ConsultaForm` carga el catálogo completo de la organización una sola vez (`PacienteDetallePage.cargar()`) y lo filtra por categoría en cada picker.

### Indicaciones + calculadora de dosis asistida (§3.2 y §3.3)
- Nuevo `IndicacionesPanel`, mismo patrón que `DispensaPanel` (F4.3): botón "Indicación" por fila de consulta, alterna un panel con lo ya cargado (fármaco, dosis, frecuencia, duración, estado vigente/finalizado) y un formulario de alta.
- Discrimina origen igual que el backend: `stock_interno` (selecciona producto de Farmacia) vs. `receta_externa` (texto libre, no toca stock).
- Calculadora de dosis: si el producto tiene `dosisSugeridaMgKg` cargado, muestra un campo de peso (precargado con el peso de la consulta) y una sugerencia (`mg totales` + volumen si hay `concentracion`/`unidadConcentracion`) con un botón **"Confirmar dosis"** explícito — nunca se aplica sola, tal como pide el spec.
- Al guardar una indicación con origen `stock_interno` y `cantidadStock` cargada, dispara automáticamente un `POST /farmacia/movimientos` (tipo `uso`, mismo `consultaId`) para descontar el inventario — así "stock interno descuenta del inventario" queda cerrado de punta a punta sin duplicar la lógica de ajuste de stock. Si ese segundo llamado falla, la indicación ya quedó guardada y se avisa aparte (no se revierte ni se bloquea).

### Plan de tratamiento en el portal del dueño (§8.1)
- El portal público por código (`hce/portal/`) ya traía `tratamientos` armado; se agregó el mismo bloque al portal por magic-link (`portal/portal.service.ts`, `resumen()`), que no lo tenía — mismo shape en los dos caminos.
- `PortalDuenoPage.tsx` y `PortalAccesoPage.tsx` suman una sección "Plan de tratamiento" (sólo si hay indicaciones), con chip "Vigente"/"Finalizado" por fila.

### Delta editing + línea de tiempo médica (§3.1)
- `ConsultaForm` recibe la consulta anterior del animal (`consultas[0]`, ya ordenada desc por fecha) y precarga **peso y temperatura** con esos valores al dar de alta una consulta nueva — sólo cuando no hay ya un borrador guardado (la persistencia local sigue teniendo prioridad). Un hint ("Anterior: X kg") aclara de dónde salió el valor. FC/FR que menciona el spec no se agregaron: no existen como campos en `hce.consultas` y sumarlos es un cambio de schema fuera del alcance acordado para esta pasada.
- Nuevo `HistoriaTimeline`: fila horizontal de tarjetas (🩺 consulta / 💉 vacuna) ordenadas por fecha, arriba de la tabla de historia clínica existente — que se deja intacta (edición/borrado/dispensa/indicación siguen viviendo ahí). Un click abre `DrawerItemLinea`, un panel lateral (overlay, no navegación) con el detalle completo del evento — no interrumpe un formulario que esté abierto en el resto de la página.

### Verificado
- Backend: `nest build` limpio; `test:hce-demo` (10/10), `test:vacunas-demo` (10/10) y `test:turnos-demo` (12/12) siguen pasando tras tocar `portal/portal.service.ts`; una consulta SQL directa contra `pgdata` confirma que el nuevo join de indicaciones en el portal magic-link no tiene errores de columnas. `test:macros-demo` (7/7) y `test:indicaciones-demo` (12/12), ya escritos en la sesión anterior, se re-confirmaron.
- Web: `vite build` limpio; se corrió además el `tsc --noEmit` de `apps/backend` apuntado a `apps/web/tsconfig.json` (mismo truco ya usado antes para pescar errores de tipos reales, ya que este proyecto no tiene `@types/react`) — cero errores nuevos atribuibles a este trabajo, sólo el ruido preexistente de siempre (namespace `React`, prop `key`, `ImportMeta.env`) que ya aparecía en archivos no tocados hoy.
- **Gap encontrado y cerrado de paso**: `FarmaciaPage.tsx` nunca había sumado a sus formularios de alta/edición de producto los campos `concentracion`/`unidadConcentracion`/`dosisSugeridaMgKg` (el backend los soporta desde que se agregaron a la migración `0007`) — sin esto, la calculadora de dosis de `IndicacionesPanel` no tenía forma de activarse nunca desde la web. Se agregaron a ambos formularios y a la ficha de detalle del producto.
- **Verificación de API de punta a punta** (sin navegador, por curl, contra un backend efímero en el puerto 3055 con una base PGlite temporal en `/tmp` — el `pgdata` y el backend reales del usuario no se tocaron): registro → login → alta de dueño/paciente → producto con concentración/dosis sugerida → compra de stock (100) → consulta con peso/temperatura → macros (siembra lazy confirmada, 14) → indicación stock interno (dosis "84.0 mg (~1.68 ml)" para un peso de 8.4kg y dosis sugerida de 10mg/kg sobre una concentración de 50mg/ml, cálculo correcto) → descuento de stock disparado igual que lo haría el frontend (100 → 98, confirmado) → indicación receta externa → listado por animal ordenado por más reciente → plan de tratamiento idéntico en el portal público por código **y** en el magic-link → finalizar/editar/borrar indicaciones y macros por API. Todo respondió como se esperaba. Backend apagado por PID exacto al terminar.
- **Sigue sin probarse**: todo lo que sólo se puede ver en el DOM real (el `<select>` de `MacroPicker` insertando texto en el campo correcto, el drawer de la timeline abriendo/cerrando visualmente, el hint "Anterior: X kg" mostrándose) — la verificación de arriba confirma que los datos que el backend le da a la web son correctos, no que los componentes React los rendericen bien. Falta un pase en el navegador real con el usuario.

## [2026-08-28] — Verificación en el navegador de Fase A + fix de sync offline en mobile

Verificación manual junto al usuario de lo construido en Fase A (ver entrada de abajo). Encontró y corrigió dos bugs, ninguno del diseño de Fase A en sí:

- **Sesión vieja rompía el arranque de la web**: `localStorage`/`SecureStore` con una sesión guardada de antes del cambio `rol` → `roles` no tenía el arreglo nuevo, y `App.tsx` crasheaba con `sesion.roles is undefined` al leerla. `apps/web/src/auth/useSesion.ts` (`cargar()`) ahora descarta cualquier sesión sin `Array.isArray(sesion.roles)` en vez de propagar el crash — el usuario simplemente vuelve al login.
- **Borrador de formulario "no volvía" tras recargar**: `NuevoPacienteForm` (`PacientesPage.tsx`) y `ConsultaForm` (`PacienteDetallePage.tsx`) viven detrás de un botón toggle ("+ Nuevo…") que arranca cerrado en cada carga de página — el borrador se guardaba bien en `localStorage`, pero el formulario que lo mostraría no se reabría solo. Nuevo `hayBorrador(clave)` exportado desde `useFormularioPersistente.ts`, usado como inicializador del estado del toggle en ambas páginas.
- **Sync offline del mobile fallaba con "Recurso no encontrado"** (no relacionado a Fase A, encontrado de paso al verificar el punto anterior): WatermelonDB genera ids propios de 16 caracteres alfanuméricos (`randomId()`, ver `node_modules/@nozbe/watermelondb/utils/common/randomId`), no UUIDs — pero toda columna `id` del backend es `uuid` en Postgres, y `sync.core.ts` respeta el id que manda el cliente tal cual (`id: rec.id` en el insert). Cualquier alta hecha offline (paciente, consulta, vacunación, movimiento de tropera) fallaba en el push con el error de Postgres `22P02 invalid input syntax for type uuid`, que `DbErrorFilter` traduce a un 404 "Recurso no encontrado" — mensaje genérico que no daba ninguna pista de la causa real. Fix: nuevo `apps/mobile/src/db/uuid.ts` (UUID v4 simple, sin librería nueva), aplicado sobreescribiendo `_raw.id` en los 5 `.create()` de registros sincronizables (`paciente/nuevo.tsx`: persona + animal; `paciente/[id].tsx`: consulta + vacunación; `establecimiento/[id].tsx`: movimiento). Nota para quien retome esto: un registro creado offline **antes** de este fix sigue teniendo el id viejo guardado en la SQLite local del dispositivo y va a seguir fallando el push hasta que se borren los datos de la app — no alcanza con actualizar el código instalado.
- Roles apilados y Omnibox no tuvieron un chequeo dedicado además de este pase — se dan por buenos por reusar patrones ya verificados en otras partes de la web.

**Entregable:** Fase A cerrada (✅ en `Roadmap_Ecosistema.md`).

---

## [2026-08-28] — Fase A del nuevo spec UI/UX: role stacking + Omnibox (Ctrl+K) + persistencia local

El usuario compartió un documento grande de especificación UI/UX (8 roles). Se hizo un análisis de gaps contra el código real, se dividió en fases (A a E), y se identificaron dos decisiones de arquitectura de fondo — role stacking (resuelta acá) y si Tropera pasa a seguimiento individual de animales (**sin decidir**, bloquea la fase de campo). El usuario eligió arrancar por Fase A.

### Backend — roles apilables
- `core.membresias.rol` (enum único) → `roles` (arreglo, mismo nombre de columna física `rol`, sólo cambia el tipo). Migración `0006_medical_mister_fear.sql`: drizzle-kit generó un `ALTER COLUMN ... SET DATA TYPE` ingenuo sin conversión de datos — se reescribió a mano con `USING ARRAY["rol"]::"core"."rol_membresia"[]` para envolver cada valor existente sin perder nada. Aplicada a mano contra `pgdata` (mismo procedimiento ya establecido), verificado que las 3 membresías existentes quedaron como arreglo de 1 elemento con su rol original.
- `TenantGuard` resuelve `req.roles` (arreglo) en vez de `req.rol`. `RolesGuard` pasa a `requeridos.some(r => req.roles.includes(r))` — alcanza con que coincida uno solo. Los 24 usos existentes de `@Roles(...)` en los controllers no cambiaron (siguen siendo listas planas de roles permitidos).
- Actualizados todos los puntos que leían `membresias.rol` directo: `admin.service.ts` (listar/agregar/quitar miembro, protección del último propietario — ahora chequea `roles.includes('propietario')`), `usuarios.service.ts` (filtro por rol vía `sql\`... = ANY(...)\`` — primera vez que se usa este operador de array en el repo), `personas.service.ts` (`listarVeterinarios`), `auth.service.ts` (login), `solicitudes.service.ts` (alta de membresía al aprobar — se dejó como selección de un solo rol al aprobar, envuelto en arreglo de 1 al insertar, por ser una acción de bootstrap puntual, no el lugar donde el stacking importa).
- Nuevo `AgregarMiembroDto.roles: string[]` (antes `rol: string`) y nuevo endpoint `PATCH /admin/organizaciones/:id/miembros/:membresiaId/roles` para editar los roles de una membresía existente sin recrearla.
- Nuevo `test/roles-flow.demo.ts` (`test:roles-demo`): `TenantGuard` resuelve el arreglo completo, `RolesGuard` deja pasar con cualquiera de los roles coincidente y rechaza si ninguno coincide, y una membresía "vieja" (backfill de 1 rol) sigue funcionando. 6/6 OK.
- **Efecto colateral encontrado y corregido**: cambiar `membresias.rol` rompió los 7 scripts `test:*-demo` existentes (mismo patrón que ya había pasado con las columnas de `organizaciones` en la iteración anterior) porque cada uno recrea el DDL a mano. Se actualizaron los 6 que declaran `core.membresias` con `rol` — quedan 9 suites (`auth`, `animales`, `personas`, `hce`, `vacunas`, `turnos`, `sync`, `plataforma`, `roles`), 103 checks, todas OK.

### Web — roles como arreglo
- `Sesion.rol: string` → `Sesion.roles: string[]`. `App.tsx`: nuevo helper `tieneAlguno(roles, set)`; los 6 sets `ROLES_DASHBOARD/TURNERO/ATIENDEN/TROPERA/USUARIOS/FARMACIA` no cambiaron de definición, sólo la forma de consultarlos — un usuario con roles apilados ve la unión de tabs de todos sus roles sin ningún cambio de diseño de nav. `homeDe()` mantiene la prioridad ya implícita (dashboard > turnero > animales).
- `AdminPage.tsx`: `AgregarMiembroForm` pasa de un `<select>` único a checkboxes (`RolesFieldset`, componente compartido); cada fila de miembro muestra un chip por rol y un editor inline ("Editar roles") que llama al endpoint nuevo.
- `UsuariosPage.tsx` y `api/turnos.ts` (lista de profesionales para asignar turnos) también leían `.rol` de `GET /usuarios` — actualizados a `.roles` (con un campo `rol` de sólo display, `roles.join(' + ')`, para no tocar el resto de esos archivos).
- **Bug preexistente encontrado de paso (no introducido hoy)**: `App.tsx` llama a `api.obtenerAnimal(sesion, t.pacienteId)` en el flujo "Atender" desde un turno, pero ese método nunca se agregó a `client.ts` — rompía en runtime al hacer clic en "Atender". Se agregó (`GET /animales/:id`, que el backend ya tenía). Se encontró porque `vite build` (esbuild) no type-checkea — este proyecto nunca tuvo `@types/react` instalado en `apps/web`, así que ningún error de tipos se detecta en el build normal; se usó por única vez el `tsc` de `apps/backend` apuntado a `apps/web` para pescar errores reales, filtrando el ruido de "no encuentra @types/react".

### Web — Omnibox (Ctrl+K)
- Nuevo `components/Omnibox.tsx`, 100% cliente: atajo global `Ctrl+K`/`Cmd+K`, sin endpoint de backend nuevo — reusa `GET /personas`/`GET /animales` (ya devuelven todo sin paginar, como el resto de la web). `hooks/useEntidadesBusqueda.ts` cachea ambas listas en memoria para no repetir el fetch en cada apertura.
- `utils/fuzzy.ts`: matching propio (substring exacto + Levenshtein acotado para tolerar errores de tipeo), sin sumar ninguna librería. Resultados agrupados en Dueños/Pacientes, cruzando `animal.personaId` contra la lista de personas ya cargada para mostrar la relación.
- Click en un dueño navega a `PersonasPage` con esa persona ya expandida — se agregó un prop opcional `personaIdInicial` que reusa el `busqueda`/`expandida` que la página ya tenía, sin tocar su lógica de filtro.

### Web — Persistencia local de formularios
- Nuevo `hooks/useFormularioPersistente.ts`: drop-in de `useState` que persiste a `localStorage` (debounced 300ms, TTL 24h para no resucitar un borrador viejo sin que el usuario lo pida), con `limpiar()` para borrar el borrador al guardar exitosamente.
- Aplicado a los dos formularios largos que motivan el pedido del spec: alta de paciente (`PacientesPage.tsx`, 11 campos que antes eran `useState` sueltos, consolidados en un solo objeto) y alta/edición de consulta (`PacienteDetallePage.tsx`) — en este último, la clave del borrador incluye `animalId` + `consulta?.id ?? 'nueva'` para que editar una consulta existente no pise (ni se confunda con) el borrador de "consulta nueva" de otro momento.
- El resto de los formularios de la web (personas, movimientos, etc.) queda sin tocar por ahora — el spec los menciona como motivador para los de alta longitud específicamente, no como un requisito universal.

### Sin verificar en el navegador
Misma limitación que la iteración anterior (Fase 5b): sin credenciales de prueba a mano en la sesión que lo construyó. `nest build` + 9 suites de test limpias, `vite build` limpio, pero eso no reemplaza probarlo. Falta: crear un miembro con dos roles y confirmar que ve la unión de tabs, abrir Ctrl+K y buscar por nombre parcial/DNI/mascota, y confirmar que un borrador de alta sobrevive a una recarga accidental.

---

## [2026-08-28] — Fase 5b: dashboard de indicadores + admin (grupos, planes, acceso, mensajes)

A pedido del usuario, dos features de plataforma nuevas, confirmado por investigación previa que **no existía nada de esto** — ni dashboard, ni control de vencimiento/demo, ni planes, ni mensajería. Se planificó con 3 preguntas de alcance respondidas antes de codear: ambas partes en paralelo, mensajes dirigidos por organización o por un **grupo de organizaciones** (concepto nuevo, ej. "cadena de veterinarias"), y planes **estructurados desde ya** (tabla propia) aunque sin lógica de cobro automático.

### Backend — schema nuevo
- `plataforma.planes`, `plataforma.grupos_organizaciones`, `plataforma.mensajes`, `plataforma.mensajes_leidos` (schema Postgres separado — es información de la plataforma, no de una organización puntual).
- `core.organizaciones` suma `grupoId`/`planId`/`accesoHasta`/`esDemo`. `grupoId`/`planId` son **referencias lógicas sin FK real** — `plataforma.ts` ya importa de `core.ts`, así que una FK en sentido inverso crearía un ciclo de módulos; mismo criterio que `hce.vacunaciones.vademecum_id → farmacia.productos`. `accesoHasta` nulo = sin vencimiento, no afecta ninguna organización existente.
- Migración `0005_curly_black_crow.sql`, aplicada a mano contra `pgdata` con el procedimiento ya establecido (backend detenido por PID exacto, integridad de conteos verificada antes/después).

### Backend — enforcement y endpoints
- `TenantGuard` rechaza con 403 ("El acceso de tu organización venció...") si `accesoHasta` ya pasó. Cambio de bajo riesgo: sólo afecta organizaciones que alguna vez configuren esa fecha.
- Nuevos módulos bajo el patrón ya establecido de `admin/` (`JwtAuthGuard + SuperAdminGuard`, módulo propio que importa `AuthModule`): `admin/planes` y `admin/grupos` (CRUD simples), `admin/mensajes` (crear/listar/eliminar anuncios). `admin.controller.ts` suma `PATCH /admin/organizaciones/:id/acceso`.
- Módulo nuevo **tenant-scoped** (no admin) `mensajes/`: `GET /mensajes/pendientes` resuelve mensajes con destinatario "todas" / la organización actual / el grupo de la organización actual, restando lo ya leído por ese usuario; `POST /mensajes/:id/leido` (idempotente).
- `GET /dashboard/resumen` (nuevo módulo `dashboard/`, tenant-scoped): primera vez que el repo usa `count()`/`GROUP BY` en Drizzle. Según `organizacion.tipo`, devuelve un bloque `clinica` (pacientes activos, consultas del mes, turnos del mes agrupados por estado, vacunas por vencer — esto último reusando **tal cual** `VacunacionesService.recordatorios()`) y/o un bloque `tropera` (existencias actuales vía `ExistenciasService.listarTodas()` reusado tal cual, movimientos del mes agrupados por tipo). `ExistenciasService` y `VacunacionesService` pasaron a exportarse desde sus módulos para poder inyectarlos en `DashboardModule`.
- `AuthService.login()` ahora hace `innerJoin` con `organizaciones` para devolver también `tipo` por cada membresía — lo necesita la web para decidir qué dashboard mostrar. Cambio aditivo, no rompe nada existente.

### Web
- `App.tsx`: `propietario`/`admin` aterrizan en una pantalla nueva "Resumen" (`DashboardPage.tsx`) en vez del turnero; el resto de los roles no cambia. `Sesion` suma `tipo` de organización.
- `AdminPage.tsx` (archivo monolítico existente, CSS-in-JS propio, sin router de tabs): se agregó un selector de sección simple ("Veterinarias" / "Planes" / "Grupos" / "Mensajes") respetando ese mismo patrón en vez de introducir una librería nueva. El detalle de cada organización suma un bloque "Acceso" (grupo, plan, fecha de vencimiento con atajos +7/+30 días, checkbox demo).
- `MensajesBanner.tsx`, enganchado en `App.tsx`: banner descartable con lo que devuelva `GET /mensajes/pendientes`, uno a la vez.

### Verificado
- Backend: `nest build` limpio; **nuevo** `test:plataforma-demo` (6 casos: `TenantGuard` deja pasar sin `accesoHasta`, rechaza con `accesoHasta` vencido, un mensaje por grupo llega a un usuario de una org de ese grupo y no a otra, marcar leído es idempotente y saca el mensaje de "pendientes", el broadcast "todas" llega a cualquier organización) — 6/6 OK.
- Efecto colateral encontrado y corregido: las nuevas columnas de `organizaciones` rompieron **los 7 scripts `test:*-demo` existentes** (`auth`, `animales`, `personas`, `hce`, `vacunas`, `turnos`, `sync`) porque cada uno recrea el DDL de `core.organizaciones` a mano y Drizzle incluye explícitamente en el INSERT generado toda columna `NOT NULL DEFAULT` de la tabla real. Al arreglarlos también salió a la luz que **`activo` ya faltaba de antes** en 6 de esos 7 DDLs (un gap preexistente a esta sesión, no introducido hoy, que nunca se había notado porque nadie corrió esos scripts en un tiempo) — se sumó junto con las columnas nuevas. Los 7 vuelven a pasar limpio.
- Corrección sobre el propio trabajo: se había afirmado que el hook `afterCreate` de `animales` (Fase 1.5, sesión anterior del mismo día) necesitaba bumpear `updatedAt` a mano o el `codigo_legible` no llegaría al mobile en el próximo pull delta — **se verificó revirtiéndolo y el test `sync-demo` seguía pasando**, así que no era un bug real (el propio insert ya deja un `updatedAt` posterior al `lastPulledAt` de la ronda). Se dejó el bump como buena práctica defensiva, pero con el comentario corregido para no afirmar algo que no se pudo reproducir.
- Web: `vite build` limpio. **Sin verificar visualmente en el navegador** — no había credenciales de prueba a mano en la sesión que lo construyó. Falta: ver el dashboard con una organización `clinica` y otra `establecimiento`/`mixta`, y correr el flujo completo de admin (crear grupo → crear plan → asignar a una organización → poner fecha de vencimiento pasada → confirmar que un usuario de esa org no puede entrar → mandar un mensaje al grupo → confirmar que aparece el banner).

---

## [2026-08-28] — HCE en `apps/mobile`: pacientes, consultas, vacunaciones y turnos

Mismo día que F1.5, después de que Tropera quedó verificado en emulador. Alcance acordado con el usuario (dos preguntas explícitas antes de codear): alta completa de persona/animal desde el mobile (no sólo lectura) y turnos en modo sólo lectura (sin cambios de estado offline — tiene una máquina de estados con `atendido`/`cancelado`/etc. que no encaja con el patrón "cargar y sincronizar" de consultas/vacunaciones).

### Backend
- `personas`, `animales`, `consultas`, `vacunaciones`, `turnos` ya estaban en el `REGISTRY` de `sync/` desde antes de este trabajo (nadie lo había marcado explícitamente, pero ya estaban) — no hizo falta agregarlos.
- Gap real encontrado: el `codigo_legible` de un animal se genera con `nextval('core.animales_codigo_seq')`, exclusivamente server-side (no se puede calcular en el cliente) — igual que el ajuste de `existencias` de Tropera, `AnimalesService.crear()` tenía esa lógica inline, sin forma de reusarla desde el sync. Se extrajo a `core/animales/generar-proximo-codigo-legible.ts` (compartida) y se sumó un hook `afterCreate` a la entrada `animales` del registry: un animal creado offline llega sin código, y el hook se lo asigna al sincronizar.
- `test/sync-flow.demo.ts` sumó 2 casos: alta offline de un animal recibe `codigo_legible` válido (Luhn), y ese valor aparece en el siguiente pull delta. 24/24 checks OK.
- Nota de proceso: al escribir el hook se agregó un bump manual de `updatedAt` pensando que sin él la fila no aparecería en el pull delta siguiente — **se verificó empíricamente revirtiéndolo y corriendo el test, y seguía pasando** (el propio insert ya deja un `updatedAt` posterior al `lastPulledAt` de la ronda, a diferencia del caso de `existencias` en Tropera donde sí hacía falta). Se dejó el bump igual, como buena práctica defensiva, pero corregido en el comentario para no afirmar un bug que en los hechos no se reprodujo.

### Mobile (`apps/mobile`)
- WatermelonDB pasa de schema v1 a v2 sumando `personas`/`animales`/`consultas`/`vacunaciones`/`turnos`, con una migración (`src/db/migrations.ts`) que sólo crea tablas nuevas — no toca lo de Tropera ya sincronizado en dispositivos que ya venían probando.
- Tabs nuevas: **Pacientes** (lista + alta con el mismo patrón de quick-create-dueño que ya usa `PacientesPage.tsx` en la web) y **Turnos** (agenda de sólo lectura, cruza `turnos` con `animales` local para mostrar el nombre del paciente).
- `paciente/[id].tsx`: ficha con historial de consultas y vacunaciones (lectura) + formularios inline para cargar una consulta o vacunación nueva offline — mismo patrón de "guardado local, pendiente hasta sincronizar" que ya usa el detalle de establecimiento de Tropera.
- Catálogo de especies: no vive en WatermelonDB (no está en el registry de sync, es global y no cambia en runtime) — se pide una vez por `GET /especies` y se cachea en memoria (`src/api/useEspecies.ts`). Limitación conocida y aceptada: si la app arranca sin conectividad antes de haber pedido especies alguna vez, el selector de especie en el alta de paciente queda vacío hasta tener señal.
- Root `_layout.tsx`: el guard de auth-redirect y la lista de rutas del `Stack` se generalizaron para incluir `paciente/nuevo` y `paciente/[id]` junto a `establecimiento/[id]`.

### Sin verificar en dispositivo
A diferencia de Tropera F1.5, esta tanda de pantallas **no se probó en el emulador** — el usuario se desconectó a mitad de sesión antes de poder loguearse de nuevo y probar el flujo. `tsc --noEmit` y el build del resto del monorepo están limpios, pero eso es necesario, no suficiente. Falta como mínimo: crear un paciente offline y confirmar que recibe `codigo_legible` al sincronizar, cargar una consulta y una vacunación, y confirmar que turnos ya sincronizados se ven bien en la lista.

---

## [2026-08-28] — Tropera F1.5 (offline) + primera versión conectada de `apps/mobile`

Los dos próximos pasos del roadmap, atacados juntos porque F1.5 no tiene forma de probarse de verdad sin un consumidor mobile real. Dos gaps encontrados antes de tocar código, no sólo "agregar filas al registry de sync": faltaban columnas (`deleted_at`/`updated_at`) en el schema de `tropera`, y el `push()` genérico del motor de sync hace un INSERT crudo — si `tropera.movimientos` se registraba tal cual, un movimiento offline no ajustaría `existencias` ni rechazaría una baja que dejara stock negativo, porque esa lógica sólo vivía en `MovimientosService.crear()`.

### Backend
- `tropera.existencias` suma `deleted_at`; `tropera.movimientos` y `tropera.eventos` suman `updated_at` + `deleted_at` (nunca se usan para borrar/actualizar vía UI — son ledgers append-only — pero mantienen la convención del proyecto y evitan tener que especializar `sync.core.ts` para tolerar columnas ausentes). Migración `0004_wonderful_moon_knight.sql`, aplicada a mano contra `apps/backend/pgdata` con el mismo procedimiento ya establecido (backend detenido, integridad de conteos verificada antes/después).
- La lógica de "cómo un movimiento ajusta `existencias`" (validar pertenencia del establecimiento + sumar/restar + rechazar si queda negativo) se extrajo de `MovimientosService.crear()` a una función compartida, `aplicarMovimiento` (`tropera/movimientos/aplicar-movimiento.ts`), para no duplicarla.
- `sync.core.ts`: el `REGISTRY` ahora acepta un hook opcional `afterCreate` por tabla, invocado dentro de la misma transacción del `push()` y sólo para filas que realmente se insertaron (no para reintentos absorbidos por `onConflictDoNothing`). Las 4 tablas de `tropera` quedaron registradas; `movimientos` usa el hook para llamar `aplicarMovimiento` — un movimiento cargado offline pasa por la misma validación que el alta online.
- **Tradeoff aceptado:** si un movimiento en cola dejaría stock negativo al sincronizar, se aborta **toda la transacción de push**, no sólo ese movimiento — el resto del lote pendiente tampoco se aplica y hay que reintentar tras resolver el conflicto.
- `test/sync-flow.demo.ts` sumó DDL de `tropera` y 3 casos nuevos: push de un movimiento de compra ajusta `existencias`; push de una venta que dejaría stock negativo se rechaza (y no deja nada más del lote aplicado, ni siquiera un establecimiento del mismo push); reintentar el mismo push (mismo id) no duplica el ajuste. 21/21 checks OK.

### Mobile (`apps/mobile`)
- Dejó de ser el scaffold default de `create-expo-app` — se sacaron las rutas/componentes de tutorial (Home/Explore, `app-tabs.*`, `hint-row`, `web-badge`, `collapsible`, `themed-text/view`, `external-link`, el tema/hooks que sólo ellos usaban) por quedar huérfanos.
- Stack offline elegido: **WatermelonDB** (`@nozbe/watermelondb` + `@morrowdigital/watermelondb-expo-plugin` como config plugin de Expo), porque el backend ya estaba diseñado explícitamente compatible con su `synchronize()` — minimiza código de cliente frente a reimplementar diffing a mano sobre Expo SQLite. Requiere Expo Dev Client (no corre en Expo Go); se agregó `expo-dev-client` y decorators legacy (`@babel/plugin-proposal-decorators`) porque los modelos de WatermelonDB los usan.
- Sesión (`src/auth/useSesion.ts` + `SesionContext`) y cliente HTTP (`src/api/client.ts`) son un puerto directo del patrón de `apps/web` (headers `Authorization`/`X-Organizacion-Id`, refresh silencioso en 401 con reintento único) usando `expo-secure-store` en vez de `localStorage`.
- Pantallas nuevas, alcance acotado a Tropera (no HCE en esta iteración): login, lista de establecimientos, detalle con existencias + alta de movimiento offline (queda pendiente de sync, no ajusta `existencias` local hasta sincronizar — el ajuste lo hace el servidor), y una pestaña de sincronización manual.
- Se homogeneizó el lockfile (`package-lock.json` de npm borrado; queda dentro del `pnpm-lock.yaml` del monorepo).
- **Sin verificar en un dispositivo/emulador real** — no hay simulador disponible en este entorno. Typecheck (`tsc --noEmit`) y build del resto del monorepo (backend + web) limpios; falta correr `expo prebuild` + un build de Dev Client y probar el circuito login → alta offline → sync en un teléfono real antes de dar F1.5 por cerrado del todo.

### Verificación end-to-end en un emulador Android real (mismo día)
Con el código escrito, se armó un emulador (Pixel 6, API 34) y se corrió `expo prebuild` + `expo run:android` contra el backend local real del usuario. Se encontraron y resolvieron, en orden, los siguientes problemas — todos reales, ninguno cosmético:

1. **CMake de WatermelonDB no resuelve rutas bajo pnpm**: `native/android-jsi/.../CMakeLists.txt` usa una ruta relativa fija (estilo npm/yarn clásico) para encontrar `react-native/ReactCommon/jsi/jsi/jsi.cpp`, y la estructura de symlinks `.pnpm/` de pnpm no la resuelve. Fix: `apps/mobile/.npmrc` con `node-linker=hoisted`, **acotado a ese workspace** (no en el `.npmrc` raíz) — aplicarlo a todo el monorepo aplana `@types/react` a una sola versión y rompe el typecheck de `apps/backend` (`@react-pdf/renderer` del carnet necesita una versión distinta a la que usa React Native 19).
2. **`expo-dev-client`/`expo-secure-store`/`@react-native-community/netinfo` en versiones no alineadas a Expo SDK 57**: puestas a mano al principio con un esquema de versión viejo (ej. `expo-dev-client` 6.x en vez de 57.x). `npx expo install --check` las detecta; corregidas a mano cuando `expo install` en sí fallaba (intenta usar npm dentro del workspace pnpm y pisa contra un postinstall roto de otro paquete).
3. **`@morrowdigital/watermelondb-expo-plugin` inyecta `getJSIModulePackage()`**, una API de RN removida en el template Bridgeless de Expo 57 — `Unresolved reference 'JSIModulePackage'`. Fix: usar el adapter de WatermelonDB sin JSI (`jsi: false`, alcanza de sobra para el volumen de datos de Tropera) + un plugin de Expo propio (`apps/mobile/plugins/withWatermelonJsiFix.js`) que limpia el import roto. Nota de orden no obvia: los mods de `withMainApplication` de distintos plugins corren en orden **inverso** al de declaración en `app.json` (el último declarado corre primero) — el plugin propio tiene que declararse *antes* que el de WatermelonDB para poder limpiar lo que éste inyecta.
4. **Babel no combina decorators legacy con aserciones `!` de TypeScript** en un mismo campo de clase (`@babel/plugin-transform-typescript` lo rechaza). Fix: sacar el `!` de los modelos de WatermelonDB y `strictPropertyInitialization: false` en `tsconfig.json` — mismo criterio que recomienda TypeORM para clases decoradas.
5. **`sesion!.organizacionId` explota con `Cannot read property 'organizacionId' of null`**: hay un instante entre que `sesion` pasa a `null` y que `_layout.tsx` redirige a `/login` donde la pantalla de todos modos llega a renderizar. Fix: fallback `sesion?.organizacionId ?? '__none__'` en las queries y un guard `if (!sesion) return null` **después** de todos los hooks (no se pueden llamar condicionalmente).
6. **Emulador Android usa `10.0.2.2` para el host, no `localhost`** — `EXPO_PUBLIC_API_URL=http://localhost:3000` nunca iba a conectar desde el emulador. Corregido en `apps/mobile/.env`.
7. **`SyncModule` nunca había sido registrado en `AppModule`**: el motor de sync estaba completo y probado por `test:sync-demo` desde antes, pero como módulo nunca se importó en `app.module.ts`, `/sync` devolvía 404 (`Cannot GET /sync`) en la app real — un gap preexistente a esta iteración, no introducido por el trabajo de hoy, pero que sólo se hizo evidente al tener un consumidor real por primera vez.

Con todo eso resuelto: login → sincronización inicial → alta de movimiento offline → detalle de existencias funcionando de punta a punta en el emulador contra el backend real del usuario. Quedan ajustes de UI menores por pulir (reportados por el usuario, sin especificar todavía).

### Docs
`Roadmap_Ecosistema.md` actualizado: F1.5 y Tropera (Fase 1 completa) pasan a ✅, la app móvil documentada como verificada en emulador real (no sólo "compila").

---

## [2026-08-28] — Farmacia → HCE: dispensa ligada a una consulta (F4.3)

Segundo punto de la lista de pendientes tras el MVP de Farmacia. Diseño acordado: la dispensa **no es una entidad nueva** — es un `movimientos_stock` de tipo `uso` con un `consulta_id` opcional cargado. Se reutiliza toda la lógica transaccional de movimientos que ya existía (ajuste de stock, rechazo si queda negativo) en vez de inventar un concepto paralelo.

### Backend
- `farmacia.movimientos_stock` suma la columna nullable `consulta_id` (FK a `hce.consultas`), agregada sin romper ningún movimiento existente (compras, mermas, vencimientos siguen sin consultaId).
- `MovimientosService.crear()` valida que la consulta exista y sea de la organización antes de insertar (mismo criterio de scoping que el resto de la app); `listar()` acepta un filtro opcional `consultaId` además del existente `productoId`.
- `GET /farmacia/movimientos?consultaId=...` — sin este filtro, sigue devolviendo todo el historial de la organización.

### Web
- `PacienteDetallePage.tsx`: cada fila de la tabla de consultas tiene un botón "Dispensar" que abre un panel inline (`DispensaPanel`) con lo ya dispensado en esa consulta y un formulario para cargar una dispensa nueva (producto + cantidad + observaciones), usando el mismo endpoint que ya usa `FarmaciaPage.tsx`.

### Fuera de alcance (sigue igual que en el MVP de Farmacia)
La FK real desde `hce.vacunaciones.vademecum_id` hacia `farmacia.productos` — dispensar sigue ligado a la consulta, no a una vacunación puntual.

### Migración
`0003_farmacia_dispensa.sql`: `ALTER TABLE farmacia.movimientos_stock ADD COLUMN consulta_id uuid` + FK. Cuarta migración seguida sin fricción de numeración desde el squash del journal. Probada contra un PGlite temporal (`db:local-init` completo, las 4 migraciones aplican limpio) y luego aplicada a mano contra `apps/backend/pgdata` (mismo procedimiento ya establecido: backend detenido, DDL idempotente, integridad de conteos verificada antes/después, backend reiniciado).

### Verificado
Por curl contra un backend aislado: compra (+50) y dispensa ligada a consulta (−10, tipo `uso` con `consultaId`) ajustan bien el stock (queda en 40); `GET /farmacia/movimientos?consultaId=X` devuelve sólo esa dispensa; un `consultaId` de otra organización o inexistente se rechaza con 404 sin tocar stock; un movimiento sin `consultaId` (merma) sigue funcionando igual que antes. Build limpio de backend y web.

---

## [2026-08-28] — Farmacia: MVP básico (vademécum + stock + movimientos)

Primer módulo de Farmacia. Igual que pasó con Tropera al arrancar, no había ningún diseño previo de esta vertical — el roadmap sólo tenía un esqueleto de fases (F4.1–F4.4) y `hce.vacunaciones.vademecum_id` como referencia lógica suelta, sin tabla del otro lado. Alcance acordado con el usuario: "algo básico en la línea que venimos llevando" — se tradujo en mirroreara **exactamente** la estructura de Tropera (catálogo + cantidad actual con corrección directa + movimientos transaccionales con historial), sin las partes más complejas.

### Fuera de alcance a propósito
- **Facturación** (el otro tema del punto 4 original): el roadmap ya la marca como "reservada" por la integración con ARCA (ex-AFIP) — no encaja en "básico", no se tocó.
- **Dispensa ligada a una consulta** (F4.3, descontar stock automáticamente al aplicar un producto en una consulta/vacunación) y la **FK real** de `hce.vacunaciones.vademecum_id` hacia `farmacia.productos`: quedan para cuando haya que integrar de verdad HCE con Farmacia, no es parte de este MVP.

### Backend — nuevo schema `farmacia`
- `productos` (vademécum): CRUD simple, `categoria` es texto libre (un vademécum real es demasiado variado para un enum cerrado, a diferencia de las 6 categorías fijas de hacienda en Tropera).
- `stock`: una fila por producto con la cantidad actual. `GET /farmacia/stock` devuelve **todos** los productos activos con su cantidad (0 si nunca se cargó, vía `LEFT JOIN` con `coalesce`) en una sola llamada — más simple que el equivalente de Tropera porque acá no hay "por establecimiento" de por medio. `PATCH /farmacia/stock/:productoId` es la corrección directa sin historial (mismo criterio que `tropera.existencias`).
- `movimientos_stock`: ledger transaccional — `compra` (alta) / `uso`, `vencimiento`, `merma` (baja, rechaza si deja stock negativo) — mismo patrón exacto que `tropera.movimientos`.
- Roles de escritura: `propietario`, `admin`, `veterinario` (sin `capataz`/`recepcion` — es clínico, no de mostrador ni de campo).

### Web
- Nueva página `FarmaciaPage.tsx`, mismo patrón list→detail que `TroperaPage.tsx`: listado de productos con stock a la vista → detalle con corrección directa + alta de movimiento + historial.
- Pestaña "Farmacia" en la nav, visible para `propietario`/`admin`/`veterinario`.

### Migraciones — mismo cuidado que las veces anteriores
`db:generate` volvió a salir limpio y bien numerado (`0002_farmacia.sql`, tercera vez seguida sin fricción desde el squash del journal). Y **otra vez** hizo falta aplicar el schema nuevo a mano contra `apps/backend/pgdata` (la base real del usuario) — el patrón ya es previsible: cualquier tabla nueva necesita este paso aparte, `nest start --watch` sólo recarga código, no aplica DDL. Se hizo con el backend detenido (mismo procedimiento que con Tropera) y se verificó integridad antes/después.

### Verificado
Build limpio de backend y web. Por curl contra un backend aislado: producto sin stock cargado viene en 0, compra (+100) y uso (−30) ajustan bien, un intento de descontar de más se rechaza con 400 sin tocar el stock, la corrección directa funciona, y el historial de movimientos lista bien. Después, migración aplicada a la base real del usuario con integridad verificada y el backend real respondiendo 401 (no 404/500) en las rutas nuevas.

---

## [2026-08-28] — Tropera: panel consolidado de stock (F1.6)

El usuario eligió F1.6 (panel consolidado) antes que F1.5 (offline) para esta iteración — offline no tiene forma de probarse de verdad todavía porque la app móvil sigue siendo un scaffold sin conectar.

### Backend
- `ExistenciasService.listarTodas(organizacionId)`: existencias de **todos** los establecimientos de la organización en una sola consulta (sin completar categorías en 0 — eso lo arma el front cruzando con la lista de establecimientos).
- Nuevo `ExistenciasResumenController` en `GET /tropera/existencias` (ruta separada de `GET /tropera/establecimientos/:id/existencias`, a propósito — evita cualquier ambigüedad de ruteo entre el segmento literal `existencias` y el param `:id`).

### Web
- `TroperaPage.tsx`: nueva sección "Stock consolidado" arriba del listado de establecimientos — matriz establecimiento × categoría con totales por fila y por columna. Sólo se muestra con 2+ establecimientos (con uno solo no aporta nada que no se vea ya en su propia ficha).

### Verificado
Build limpio de backend y web. Por curl contra un backend aislado: dos establecimientos con existencias distintas, `GET /tropera/existencias` trae las filas de ambos en una sola llamada — los totales que arma el front (por fila, por columna y gran total) se verificaron a mano contra esos datos.

---

## [2026-08-28] — Seed de especies driver-agnóstico (`db:seed`)

Cierra el gap que había quedado abierto en la entrada anterior (`especies` vacía después de `drizzle-kit migrate`). Nuevo `apps/backend/scripts/seed-especies.mjs`: mismo criterio de driver que `database/drizzle.provider.ts` (`DATABASE_DRIVER=pglite` usa `DATABASE_PATH`, `node-postgres` usa `DATABASE_URL`), idempotente. `init-local-db.mjs` se refactorizó para importarlo (`sembrarEspecies()`) en vez de duplicar el `INSERT`. Nuevo script `pnpm --filter backend db:seed`. README actualizado con el paso que faltaba en "Puesta en marcha (producción)".

### Dos bugs propios encontrados y corregidos en el camino
1. **El fix de `pgcrypto` de la entrada anterior rompía PGlite.** La extensión no está disponible en la build WASM de `@electric-sql/pglite` (`gen_random_uuid()` ya es nativo ahí, no la necesita) — `CREATE EXTENSION IF NOT EXISTS "pgcrypto"` fallaba con "extension not available" y abortaba toda la migración. Se envolvió en `DO $$ BEGIN EXECUTE '...' EXCEPTION WHEN OTHERS THEN NULL END $$` — best-effort: si la extensión no está disponible pero la función ya es nativa (PGlite, Postgres 13+), sigue sin problema.
2. **`seed-especies.mjs` nunca ejecutaba `main()`** en este repo. El chequeo estándar de "¿me invocaron directo?" (`import.meta.url === 'file://' + process.argv[1]`) falla cuando el path del repo tiene espacios (`.../01- Projects/...`): `import.meta.url` los codifica como `%20`, `process.argv[1]` no — nunca son iguales. Corregido comparando con `fileURLToPath(import.meta.url) === process.argv[1]` (paths de archivo, no strings de URL).

### Verificado
`db:local-init` (PGlite) vuelve a andar de punta a punta con la migración corregida. Contra Postgres real: `db:migrate` + `db:seed` corridos dos veces seguidas — 8 especies, sin duplicar ni fallar la segunda vez.

---

## [2026-08-28] — Primera prueba real de la migración contra Postgres (no PGlite)

Hasta esta entrada, `db/migrations/0000_ecosistema_base.sql` sólo se había probado con `init-local-db.mjs` contra PGlite. Se probó por primera vez el camino real de producción: `drizzle-kit migrate` contra un Postgres de verdad (v12, instalado en esta máquina — se creó una base aislada `ecosistema_migracion_test` para la prueba, se destruyó al terminar).

### Bug real encontrado y corregido: `gen_random_uuid()` no existe en Postgres < 13
Todas las columnas `uuid().defaultRandom()` de Drizzle generan `DEFAULT gen_random_uuid()`. Esa función es nativa recién desde **Postgres 13** — en versiones anteriores hay que habilitar la extensión `pgcrypto`, que la provee. PGlite nunca mostró el problema porque trae la función disponible de entrada (usa una versión de Postgres más nueva internamente). Se agregó `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` al principio de `0000_ecosistema_base.sql` — no rompe el tracking de `drizzle-kit generate` (las extensiones no forman parte del modelo de schema que Drizzle diffea).

### Gap encontrado, sin resolver todavía: no hay seed de `especies` para Postgres real
`init-local-db.mjs` siembra las 8 especies base, pero es un script **específico de PGlite** (importa `@electric-sql/pglite` directamente) — `drizzle-kit migrate` no siembra nada. Un despliegue real contra Postgres queda con `core.especies` vacía después de migrar, y toda la app depende de que existan especies (alta de animal, etc.). Hace falta un script de seed que funcione contra cualquier driver (o correr el `INSERT` a mano la primera vez). Se sembró manualmente para poder terminar de probar el resto del flujo.

### Verificado (contra Postgres real, con el fix aplicado)
Las dos migraciones aplican limpio con `drizzle-kit migrate`. Backend completo levantado con `DATABASE_DRIVER=node-postgres`: registro, login, refresh token, alta de animal, consulta, vacunación, **carnet PDF** (genera bien — `@react-pdf/renderer`/`qrcode` a veces tienen problemas con dependencias nativas, no fue el caso), establecimiento + movimiento de Tropera con ajuste de existencias, evento sanitario, y reseteo de contraseña. Todo funcionó igual que contra PGlite, salvo por el seed de especies (gap real, no un bug de la migración en sí).

---

## [2026-08-28] — Portal del dueño por magic-link: UI completa

El backend (`POST /portal/acceso/:personaId`, `GET /portal/resumen`, `POST /portal/turnos`, todo bajo `src/portal/`) ya existía entero desde antes de esta sesión, pero no tenía ningún caller en la web — sólo el portal público por código (`/c/:codigo`, una mascota, sin login) estaba conectado. Esto era más que "falta un botón": tampoco existía el lado del dueño (consumir el token y mostrar el resumen), y el mecanismo es distinto del portal público — el magic-link viaja como `?token=` en la URL pero se manda como header `X-Portal-Token` en cada request, no como query ni como `Authorization: Bearer`.

### Lado staff
`PersonasPage.tsx`: en "Ver mascotas" de cada dueño, botón "Generar acceso al portal" → `POST /portal/acceso/:personaId` → muestra el link (vale 30 días) para copiar y mandarle al dueño a mano (WhatsApp, email — no hay envío automático).

### Lado dueño
- `api/portalAcceso.ts`: cliente nuevo, separado de `api/portal.ts` (el del código público) — mismo criterio de "cada superficie pública mantiene su propio cliente" que ya se usa en el resto de la web.
- `pages/PortalAccesoPage.tsx`: a diferencia del portal público (una mascota), muestra **todas** las mascotas del dueño, cada una con sus vacunas/turnos/consultas, y un botón "Solicitar turno" por mascota (`POST /portal/turnos`).
- `main.tsx`: nueva detección de ruteo `?token=` → `PortalAccesoPage`, distinta de `?c=`/`/c/:codigo` → `PortalDuenoPage` (conviven sin pisarse, son query params distintos).

### Verificado
Build limpio de backend y web. Por curl contra un backend aislado: generar acceso, consumir el resumen con el token (trae la vacuna cargada), solicitar un turno, y las dos validaciones de error (sin token → 401, token inválido → 401).

---

## [2026-08-28] — Correcciones tras la primera pasada del protocolo de pruebas

El usuario corrió `docs/Protocolo_Pruebas.md` por primera vez contra su entorno real (no bases de prueba) y reportó varios hallazgos.

### Bug operativo grave: la base real nunca tenía el schema `tropera`
Todas las pruebas de Tropera de las iteraciones anteriores se hicieron contra bases PGlite temporales — nunca se aplicó la migración a `apps/backend/pgdata` (la base real de desarrollo). Resultado: 500 en cualquier acción de Tropera. Se aplicó el DDL de `tropera` (schema, 3 enums, 4 tablas, FKs) directamente contra la base real, de forma idempotente (`CREATE ... IF NOT EXISTS` / `DO $$ ... EXCEPTION WHEN duplicate_object`), con el backend detenido para evitar acceso concurrente al archivo PGlite. Se verificó integridad antes y después (organizaciones/usuarios/animales existentes intactos).

**Causa raíz de otro incidente relacionado:** durante esta sesión quedaron procesos de backend de prueba huérfanos ocupando el puerto 3000 más de una vez — arrancados como `node dist/src/main` (build compilado), no como `nest start --watch`, así que los `pkill -f "nest start --watch"` no los mataban. Uno de ellos apuntaba a una base temporal vacía y el usuario le estuvo hablando sin saberlo ("no puedo ingresar con mi cuenta de administrador"). Lección para sesiones futuras: matar por PID exacto (`lsof -t -i :3000 | xargs kill -9`), no por patrón de comando, cuando se levantan backends de prueba en paralelo al del usuario.

### Bug: buscador de pacientes en el turnero no asignaba la selección
`Field` (helper de layout de formularios en `TurnosPage.tsx`) envolvía sus `children` en un `<label>` real. Las sugerencias de búsqueda (divs clickeables) quedaban anidadas dentro de ese mismo `<label>`, junto al `<input>` de texto — el navegador intercepta clicks en hijos de un `<label>` para reenfocar su control asociado, pisando el click sobre la sugerencia. Se cambió `Field` para usar `<div>` en vez de `<label>` (el CSS no dependía de que fuera un label real). No se pudo confirmar en un navegador real (sin acceso); pendiente de que el usuario lo reconfirme.

### Bug: datos por especie ausentes en el alta de animal
Preexistente a esta sesión: `EditarPacienteForm` (edición) siempre tuvo `CamposEspecie`, pero `NuevoPacienteForm` (alta, en `PacientesPage.tsx`) nunca lo tuvo — se podía cargar raza/pelaje/etc. al editar pero no al crear. Agregado.

### Funcionalidad faltante (no bug): reseteo de contraseña
El backend ya tenía `PATCH /usuarios/:id/password` completo (contraseña específica o temporal autogenerada, con safeguard para que sólo un propietario resetee a otro propietario), pero **ninguna pantalla lo usaba** — ni `/admin` (gestiona organizaciones/miembros a nivel plataforma, no contraseñas) ni la app normal (no existía ninguna pantalla de "mi personal"). Se creó `UsuariosPage.tsx` (pestaña "Usuarios", visible sólo para `propietario`/`admin`): lista los miembros de la organización (`GET /usuarios`) y por fila permite resetear con una contraseña específica o generar una temporal (que se muestra una única vez, tal como la devuelve el backend).

### Verificado
Build limpio de backend y web. Reset de contraseña probado de punta a punta en un backend aislado (puerto 3001, sin tocar la base real del usuario): agregar miembro, generar contraseña temporal, login con esa temporal, resetear a una específica, login con la nueva, y confirmación de que la contraseña vieja queda invalidada.

---

## [2026-08-28] — Tropera: eventos sanitarios y reproductivos (F1.4)

### Backend — tabla `tropera.eventos`
- Nuevo enum `tipo_evento`: sanitarios (`vacunacion`, `desparasitacion`, `tratamiento`) + reproductivos (`servicio`, `diagnostico_prenez`, `destete`). Se dejó afuera `parto`: ya está cubierto por el movimiento `nacimiento` (F1.3) y modelarlo dos veces sería redundante mientras la hacienda sea conteo agregado.
- A diferencia de `movimientos`, **no ajusta `existencias`** — es sólo registro (vacunar 40 vacas no cambia cuántas vacas hay). `categoria`/`cantidad` son opcionales: un evento puede aplicar a toda la hacienda del establecimiento sin desglosar.
- `POST /tropera/eventos` / `GET /tropera/eventos?establecimientoId=`. Roles de escritura: `propietario`, `admin`, `capataz`, **y `veterinario`** (a diferencia de establecimientos/existencias/movimientos, acá sí tiene sentido que un veterinario cargue una vacunación).

### Web
- `TroperaPage.tsx` suma, en el detalle de cada establecimiento, un historial de eventos y el formulario "+ Nuevo evento".

### Migraciones — primera vez que sale redondo
`db:generate` generó un diff limpio y con la numeración correcta automáticamente (`0001_tropera_eventos.sql` después de `0000_ecosistema_base.sql`) — sin ningún ajuste manual. Confirma que el squash de la entrada anterior dejó el journal sano.

### Verificado
Build limpio de backend y web. Por curl: vacunación con categoría/cantidad/producto, un evento de servicio sin categoría ni cantidad (aplica a toda la hacienda), tipo inválido rechazado con 400, y confirmación de que `existencias` no se mueve al crear un evento.

---

## [2026-08-28] — Journal de migraciones: squash a una sola migración

Cierra el problema arrastrado desde la primera migración de Tropera (ver entradas de abajo): `0001_solicitudes.sql` y `0002_org_activo.sql` nunca habían quedado registradas en `meta/_journal.json`, así que cada `db:generate` había que revisarlo a mano y `drizzle-kit migrate` contra Postgres real se las hubiera saltado.

**Decisión (confirmada con el usuario, dos caminos posibles):** reconstruir a mano las dos entradas faltantes del journal (mantiene el historial incremental, pero exige escribir a mano los snapshots JSON internos de drizzle-kit — estructuras pensadas para generarse automáticamente, con riesgo real de quedar sutilmente mal) vs. **squash**: como todavía no hay ningún deploy real contra Postgres (`Aprovisionar VM` sigue ⏳ en el roadmap), no hay nada que preservar de un historial de migraciones ya aplicado en producción. Se eligió squash.

### Qué se hizo
- Se borraron las 5 migraciones existentes (`0000_stormy_domino.sql` … `0004_tropera_movimientos.sql`) y todo `meta/`.
- `drizzle-kit generate` contra el schema actual completo (core + hce + tropera: 3 schemas, 8 enums, 13 tablas) generó una única migración limpia, renombrada a `db/migrations/0000_ecosistema_base.sql` con el `tag` del journal a juego.
- El historial incremental sigue existiendo en `git log`/`git blame` de los commits viejos — sólo se sacó de la carpeta `db/migrations/` viva.

### Verificado
`init-local-db.mjs` aplica la migración única limpia desde cero contra una base PGlite temporal. Backend levantado contra esa base: refresh token, alta de `solicitudes` (la tabla que antes dependía de la migración fantasma), lectura con `organizaciones.activo` (la columna que antes dependía de la otra), una consulta de HCE, y un establecimiento + movimiento de Tropera — todo funcionando igual que antes del squash.

### A partir de ahora
El journal está 100% controlado por drizzle-kit otra vez: el próximo `db:generate` debería salir limpio sin pasos manuales — si vuelve a hacer falta renombrar un archivo o tocar el journal a mano, algo se rompió de nuevo y hay que investigar por qué, no asumir que es "lo de siempre".

---

## [2026-08-28] — Tropera: movimientos de hacienda (F1.3)

Sigue directo de la entrada de Tropera de abajo. Hasta ahora la cantidad por categoría sólo se podía corregir a mano (`PATCH existencias`, sin dejar rastro). Esta entrada agrega el registro de eventos reales: nacimientos, compras, muertes, ventas y traslados entre establecimientos.

### Backend — tabla `tropera.movimientos`
- Nuevo enum `tipo_movimiento`: `nacimiento`, `compra`, `muerte`, `venta`, `traslado`.
- `POST /tropera/movimientos`: crea el movimiento **y ajusta `existencias` en la misma transacción**. `nacimiento`/`compra` suman en `establecimientoId`; `muerte`/`venta` restan; `traslado` resta en `establecimientoId` y suma en `establecimientoDestinoId` (crea la fila de existencias si el destino no tenía esa categoría todavía).
- Valida que una baja no deje `cantidad` negativa (`BadRequestException` con el stock disponible) — y al estar todo en una transacción, si falla no queda ningún ajuste a medio aplicar.
- `GET /tropera/movimientos?establecimientoId=` lista el historial, filtrando por establecimiento de origen **o** destino (para que un traslado aparezca en el historial de ambos lados).
- Roles de escritura: `propietario`, `admin`, `capataz` (mismo criterio que establecimientos/existencias).

### Web
- `TroperaPage.tsx` suma, en el detalle de cada establecimiento, un historial de movimientos (fecha, tipo, categoría, cantidad con signo, y para traslados la flecha hacia/desde el otro establecimiento) y un formulario "+ Nuevo movimiento" que sólo pide el establecimiento de destino cuando el tipo es `traslado`.

### Migraciones — mismo cuidado que la vez pasada
`drizzle-kit generate` esta vez sí generó un diff limpio (sólo la tabla nueva, sin volver a traer `solicitudes`/`activo`) — confirma que arreglar el `tag` del journal en la entrada anterior funcionó. Igual hubo que renombrar el archivo a mano: salió como `0002_swift_luminals.sql` (drizzle-kit no sabe de `0001_solicitudes.sql`/`0002_org_activo.sql`, sigue arrancando su propio contador desde donde lo dejó el journal) y se renombró a `0004_tropera_movimientos.sql` para que ordene bien alfabéticamente, con el `tag` del journal actualizado a juego. **Este paso manual (generar → revisar el diff → renombrar con el número correcto → corregir el tag) va a hacer falta cada vez que se corra `db:generate`, hasta que se resuelva el journal roto de fondo.**

### Verificado
Build limpio de backend y web. Las 5 migraciones se aplican en orden desde cero contra una base temporal. Por curl: nacimiento y compra suman, venta resta, traslado resta en origen y crea la fila en destino si no existía, un intento de vender más de lo disponible da 400 **sin tocar existencias** (transacción revertida), traslado sin destino da 400, y el listado filtrado por establecimiento trae los movimientos correctos en cada lado.

---

## [2026-08-27] — Tropera: MVP de establecimientos + hacienda

Primer módulo de Tropera. **Antes de escribir código se confirmó con el usuario** (no había ningún diseño previo recuperable, ver la entrada de auditoría más abajo): alcance F1.1+F1.2 del roadmap (establecimientos + carga de hacienda), y hacienda registrada como **conteos agregados por categoría** — no una fila por cabeza en `core.animales`. Esto significa que el "principio articulador" que describe el Roadmap (mismo animal individual en Tropera y HCE) **no aplica** a este MVP; quedó así por decisión explícita, no es un olvido.

### Backend — nuevo schema `tropera`
- `establecimientos`: alta/listado/obtención/edición, acotado a la organización activa. Roles de escritura: `propietario`, `admin`, `capataz`.
- `existencias`: una fila por (establecimiento, categoría), con `cantidad` entera. 6 categorías fijas (enum `categoria_hacienda`): vaca, toro, ternero, ternera, vaquillona, novillo. `GET .../existencias` siempre devuelve las 6, completando en 0 las que no se cargaron; `PATCH .../existencias` hace upsert manual (busca antes de insertar — no hay constraint compuesta a nivel DB).
- Nested resource `tropera/establecimientos/:id/existencias`, mismo patrón que `carnet` bajo `animales/:id`.

### Web
- `TroperaPage.tsx`: listado de establecimientos + alta, y una vista de detalle con edición del establecimiento y una tabla editable de existencias (cantidad + botón guardar por categoría).
- Pestaña "Tropera" en la nav, visible sólo para `propietario`/`admin`/`capataz` (mismo criterio que la escritura en el backend).

### Hallazgo: `db/migrations` tenía un journal roto
Al generar la migración de Tropera, `drizzle-kit generate` volvió a incluir `core.solicitudes` y `organizaciones.activo` en el SQL nuevo — porque **`0001_solicitudes.sql` y `0002_org_activo.sql` nunca quedaron registrados en `meta/_journal.json`** (se agregaron por fuera de `drizzle-kit generate` en algún momento). Se corrigió a mano: la migración de Tropera quedó como `0003_tropera_establecimientos.sql` con sólo las sentencias de Tropera, y el journal apunta a ese nombre.
**Pendiente sin resolver, hay que decidirlo:** como esas dos migraciones nunca estuvieron en el journal, `drizzle-kit migrate` (el camino de producción contra Postgres real) nunca las aplicaría — sólo aplicaría `0000_stormy_domino`. Hoy nadie lo notó porque el desarrollo local usa `scripts/init-local-db.mjs`, que ignora el journal y aplica por orden alfabético de archivo. Si se llega a desplegar contra Postgres real con `db:migrate` tal como está, faltarían `solicitudes` y `organizaciones.activo`.

### Verificado
Build limpio de backend y web. Por curl contra una base PGlite temporal (sin tocar la de desarrollo): las 4 migraciones se aplican en orden desde cero sin errores; alta de establecimiento, existencias iniciales en 0 para las 6 categorías, carga y corrección de cantidades (el upsert actualiza, no duplica fila), edición del establecimiento, y categoría inválida rechazada con 400.

---

## [2026-08-27] — Refresh token

Cierra el pendiente de sesión: antes el access token expiraba a los 15 minutos (`JWT_EXPIRES_IN`) sin ninguna forma de renovarlo, así que cualquier uso real de la web (cargar varias consultas, una sesión de turnero larga) terminaba en un 401 sorpresivo.

### Backend
- `AuthService.emitirTokens()` (antes `emitirToken`, singular) devuelve `{ accessToken, refreshToken }`. El refresh token es un JWT con el mismo secreto pero payload `{ sub, tipo: 'refresh' }` y vencimiento `JWT_REFRESH_EXPIRES_IN` (ya existía la variable, no se usaba).
- Stateless a propósito: no hay tabla de refresh tokens ni revocación — se valida sólo por firma + expiración + el claim `tipo`. Coherente con que tampoco hay revocación de access tokens hoy. Login/registro devuelven ambos tokens; nuevo `POST /auth/refresh` los rota (uno vigente → par nuevo).
- `JwtAuthGuard` ahora rechaza un token con `tipo: 'refresh'` usado como Bearer — sin este chequeo, el refresh token (de vida más larga) hubiera funcionado como access token igual, total es el mismo secreto.

### Web
- `Sesion` suma `refreshToken`. `useSesion` suma `actualizarTokens()` para reemplazar sólo los tokens (persiste a localStorage) sin recrear toda la sesión.
- `api/client.ts` y `api/turnos.ts` (cada uno mantiene su propia sesión, ver `Estructura_Proyecto.md`) implementan el mismo mecanismo por separado: ante un 401, intentan `POST /auth/refresh` una vez, reintentan el pedido original con el token nuevo, y avisan a `App.tsx` (`configurarRefrescoSesion` / `configurarRefrescoSesionTurnos`) para persistir el cambio. Es transparente para el usuario — no hay ningún cartel de "sesión renovada".

### Verificado
Build limpio de backend y web. Por curl: refresh token rechazado como access token (401), `POST /auth/refresh` con un token real rota el par (nuevo `refreshToken` distinto al usarlo con más de un segundo de diferencia — con menos, el JWT sale idéntico porque `iat` tiene granularidad de segundo, no es un bug), el access token nuevo funciona, y un refresh token basura da 401.

---

## [2026-08-27] — Cierre de gaps de la HC: vacunaciones, recordatorios, consultas y alta rápida de dueño

Resuelve los bloqueantes que había marcado la auditoría del mismo día (ver entrada de abajo).

### Vacunaciones (nuevo en la web)
- `PacienteDetallePage.tsx`: sección "Vacunaciones" en la ficha del paciente — tabla de lo ya cargado + botón "+ Nueva vacuna" (producto, fecha de aplicación, próxima dosis, lote).
- `api/client.ts`: `vacunacionesDeAnimal()` y `registrarVacunacion()`, contra los endpoints del backend que ya existían.

### Recordatorios (ahora ruteada)
- `RecordatoriosPage.tsx` (ya existía, estaba huérfana) se agregó como pestaña "Recordatorios" en `App.tsx`, visible para los mismos roles que ven el turnero. Abrir un paciente desde ahí lleva a su ficha.

### Consultas: formulario completo + edición/borrado
- Backend: `UpdateConsultaDto` + `PATCH /consultas/:id` y `DELETE /consultas/:id` (soft delete) en `ConsultasController`/`ConsultasService`. `historiaPorAnimal` y `obtener` ahora filtran `deletedAt` (antes no lo hacían porque nada borraba una consulta).
- Web: `NuevaConsultaForm` se unificó en un solo `ConsultaForm` (alta y edición) que ahora expone **anamnesis**, **examen físico** y **temperatura**, antes sólo en el modelo y no en la UI. La tabla de consultas suma acciones "Editar"/"Borrar" por fila.

### Alta rápida de dueño al cargar un animal
- `PacientesPage.tsx` (alta de animal desde "Animales"): el selector de dueño suma la opción "＋ Crear dueño nuevo…", que despliega nombre/apellido/celular/DNI y crea la persona (`POST /personas`) antes de crear el animal — mismo patrón que ya usaba el alta rápida del turnero (`TurnosPage.tsx` / `crearPacienteRapido`), ahora también disponible en el alta directa de "Animales".

### Verificado
Build limpio de backend y web, y un flujo completo por curl (alta de dueño → animal → consulta con los campos nuevos → editar → borrar → confirmar que desaparece de la historia y da 404 al pedirla puntual).

---

## [2026-08-27] — Auditoría de estado real vs. documentado

Se releyó el código (no los docs) para corregir varias entradas que habían quedado atrasadas. No hay cambios de código en esta entrada, sólo puesta al día de la documentación.

### Confirmado como hecho (los docs decían pendiente o mock)
- **Carnet PDF**: `carnet.service.ts` ya consulta Drizzle real (animal + especie + dueño + vacunaciones) y arma el QR al portal — **ya no devuelve datos mock**, a pesar de lo que decían `CHANGELOG` y `CLAUDE.md` hasta ahora.
- **Portal del dueño**: implementado por **dos caminos** distintos, ambos operativos:
  - Público por código legible (`GET /portal/c/:codigo`, sin login — `src/hce/portal/`), consumido por `PortalDuenoPage.tsx` en `/c/{codigo}`.
  - Magic-link emitido por el staff (`POST /portal/acceso/:personaId`, `GET /portal/resumen`, `POST /portal/turnos` — `src/portal/`, con `PortalGuard`/`PortalTokenService`), para que el dueño solicite turnos sin cuenta propia.
  - **Ojo**: ambos módulos se llaman `PortalController`/`PortalService`/`PortalModule` en archivos distintos (`src/portal/` vs `src/hce/portal/`) — mismo nombre, features distintas. Fuente de confusión al buscar "el" PortalService.
- **Consola de administración** (`AdminPage.tsx`, ruteada en `/admin` vía `main.tsx`): login propio de super-admin, alta/baja de organizaciones y miembros, y aprobación/rechazo de `solicitudes`.
- **Alta de cuenta con aprobación**: la web ya no llama al registro directo; `LoginPage.tsx` crea una `solicitud` (`crearSolicitud`) que un super-admin aprueba desde `/admin`. El endpoint viejo (`AuthService.register`, alta+organización inmediata) sigue vivo en el backend pero sin ningún caller en la web.
- **Motor de sincronización offline** (`sync/`): `pull`/`push` completos, contrato compatible con `synchronize()` de WatermelonDB, multi-tenant forzado por `organizacionId`, última-escritura-gana por `updated_at`, soft delete. Probado por `test:sync-demo`. El roadmap lo listaba como ⏳ — está ✅ en el backend (falta el consumidor: la app móvil).

### Gaps reales detectados (no estaban anotados, o estaban subestimados)
- **Vacunaciones no tiene ninguna UI en la web.** El backend está completo (`registrar`, `historiaPorAnimal`, `recordatorios`), pero `api/client.ts` no tiene método para darla de alta y no existe ningún formulario. Es el hueco más grande para una HC funcional: hoy sólo se puede cargar una vacuna pegándole directo a la API.
- **`RecordatoriosPage.tsx` es código muerto**: 195 líneas, no está importada ni en `App.tsx` ni en `main.tsx`. Nadie puede ver recordatorios de vacunas desde la web aunque se resuelva el punto anterior.
- **Formulario de consulta incompleto respecto del modelo**: el DTO/schema soportan `anamnesis`, `examenFisico`, `temperaturaC` y `fecha` retroactiva; `NuevaConsultaForm` sólo expone motivo/diagnóstico/tratamiento/peso/observaciones.
- **Sin edición ni borrado de consultas**: `ConsultasController` sólo tiene crear + listar + obtener puntual.
- **Sin refresh token**: existe la variable `JWT_REFRESH_EXPIRES_IN` en `configuration.ts` pero no hay endpoint ni lógica de refresh en `core/auth/`. El access token expira a los 15 minutos (default) sin renovación silenciosa.

---

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
