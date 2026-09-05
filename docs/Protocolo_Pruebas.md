# 🧪 Protocolo de pruebas manuales (desde la interfaz)

> Checklist para validar a mano, en el navegador (y desde el bloque 15, en el celular), todo lo que está construido hasta el 2026-09-05. No reemplaza los tests automáticos (`test:*-demo` en `apps/backend`) — es el complemento para lo que sólo se ve andando la app real. Pensado para tacharse paso a paso; si algo falla, anotá el paso exacto y el mensaje de error tal cual aparece.
>
> El lote del 2026-09-03 (Home de facturación, solicitud+plan, wizard, portal, Huella operativo — bloques 8.6–8.8, 10.0, 10b, 13.5b–13.7, 14, y los ajustes en 1/3/4/7) ya se corrió una vez de punta a punta con Chromium headless (no clic a clic de una persona, pero sí un navegador real) y encontró 2 bugs reales, ambos corregidos — ver `CHANGELOG.md`. Sigue valiendo la pena una pasada humana: la automatizada no cubre "¿esto se ve/siente bien?", sólo "¿esto funciona?".
>
> Un segundo lote del mismo día (rango de fechas en Turnos — 6.7; descartar/filtrar recordatorios — 4.6/4.7; foto en la ficha — 2.7; "⚙ Agendas" movido a Usuarios — 10.7; auto-cierre de caja — 14.9; ingreso de stock desde Home + su egreso — 11.9b/13.8) sólo tiene verificación automática (`tsc`/build/los 18 `test:*-demo`) — **todavía no una pasada en el navegador**, ni headless ni humana.
>
> **Lote 2026-09-04/05** (analítica de uso — 8.9/15.10; catálogos de referencia con búsqueda — 3.1c/4.1b/11.1b; landing page — 1.0; recuperar contraseña — 1.8/1.8b/15.9; y todo el bloque 15 nuevo de mobile) fue usado y verificado por el usuario en su propio dispositivo Android físico durante el desarrollo, pero **sin una pasada formal punto por punto contra este checklist todavía** — priorizarlo en la próxima sesión de pruebas, junto con lo que quedó pendiente del lote anterior.

**Convención:** 🌐 = pasos en el navegador. 💻 = pasos en la terminal (para armar el entorno o revisar algo que la UI no muestra).

---

## 0. Preparación (una sola vez por sesión de pruebas)

1. 💻 Desde la raíz del repo: `./dev.sh` (o `pnpm --filter backend start:dev` y `pnpm --filter web dev` en dos terminales). Esperar el log `Backend del ecosistema escuchando en http://localhost:3000`.
2. 🌐 Abrir **http://localhost:5173**.
3. Confirmar en `apps/backend/.env` que `SUPERADMIN_EMAILS` tiene el email que vas a usar para entrar a `/admin` (hoy: `ridelernesto@gmail.com`). Sin esto, el bloque 8 (Administración) no se puede probar.
4. Vas a necesitar **al menos dos pestañas o navegadores** en algún momento (el bloque 7 requiere estar deslogueado de la sesión de staff para simular al dueño accediendo por su cuenta).

---

## 1. Cuenta y sesión

- [ ] **1.0 — Landing page pública:** deslogueado, abrir **http://localhost:5173/** (sin `/login`) → debe verse la landing de marketing (hero, pasos, features, precios), no el formulario de login. Los precios deben coincidir con los planes reales cargados en `/admin`. Click en cualquier plan → debe llevar a `/login?plan=<id>` con el modo "Solicitar acceso" ya activo y ese plan preseleccionado en el selector.
- [ ] **1.1 — Alta de cuenta (solicitud):** en la pantalla de login, "¿No tenés cuenta?" → "Solicitar acceso". El form ya no ofrece elegir entre "crear"/"unirse" — sólo cuenta nueva. Completá nombre/apellido/teléfono/DNI (ahora los cuatro obligatorios) y los datos de la institución (nombre/tipo obligatorios, dirección/localidad/provincia/teléfono/email opcionales). Elegí un **plan** — debajo debe aparecer qué incluye (cupos por rol) y el bloque colapsable "¿Qué puede hacer cada rol?". Tildar términos y enviar. Debe aparecer "Solicitud enviada" — **no** te loguea directo (a propósito: pasa por aprobación, ver bloque 8).
- [ ] **1.1b — Datos completos visibles al aprobar:** en el bloque 8.1, la tarjeta de la solicitud debe mostrar el DNI junto al email/teléfono, el plan solicitado, y una línea aparte con la dirección/localidad/provincia/teléfono/email de la institución (si se cargaron).
- [ ] **1.1c — Un plan deshabilitado no aparece para elegir:** desde 8.8 dejá un plan "deshabilitado para altas nuevas" → volver al form de solicitud (recargar la página) → ese plan no debe aparecer en el selector.
- [ ] **1.2 — Login sin aprobar:** intentar entrar con ese mismo email/contraseña antes de aprobar la solicitud → debe rechazar (no existe usuario todavía, la solicitud es una tabla aparte hasta que se aprueba).
- [ ] **1.3 — Aprobar la solicitud:** ir al bloque 8.1 y volver acá.
- [ ] **1.4 — Login post-aprobación:** ahora sí debería entrar. Fijate qué pantalla de inicio te muestra (Turnos si el rol es propietario/admin/recepción/veterinario; Animales si es capataz).
- [ ] **1.5 — Persistencia de sesión:** recargar la página (F5) estando logueado → no debería pedir login de nuevo (sesión en localStorage).
- [ ] **1.6 — Cerrar sesión:** botón "Cerrar sesión" arriba a la derecha → vuelve al login.
- [ ] **1.7 — Refresh token (opcional, no bloqueante):** es difícil de ver a simple vista porque es silencioso — el access token dura 15 minutos. Si querés confirmarlo sin esperar: dejá la pestaña abierta y logueada, esperá 16+ minutos sin recargar, después hacé cualquier acción (abrir "Animales"). Si sigue andando sin pedirte login de nuevo, el refresh funcionó solo.
- [ ] **1.8 — Olvidé mi contraseña:** deslogueado, en el login, "¿Olvidaste tu contraseña?" → cargar el email de un usuario real → "Enviar link de recuperación" → debe mostrar el mismo mensaje genérico ("revisá tu email") esté o no registrado ese email (probar una vez con uno que exista y otra con uno inventado — el mensaje no debe cambiar). Con `RESEND_API_KEY` sin configurar, el link queda logueado en la consola del backend — copiarlo de ahí. Abrir ese link (`?resetToken=...`) → debe pedir una contraseña nueva (con confirmación) → guardar → loguearse con la contraseña nueva debe andar, y con la vieja debe rechazar.
- [ ] **1.8b — Link vencido/reusado:** intentar usar el mismo link del 1.8 una segunda vez, después de ya haber cambiado la contraseña con él → debe rechazar ("el enlace es inválido o venció").

---

## 2. Animales y dueños

- [ ] **2.1 — Alta de animal con dueño existente:** "Animales" → "+ Nuevo animal". Completá nombre + especie, elegí un dueño ya cargado (si no hay ninguno, cargá uno primero desde "Dueños" → "+ Nuevo dueño"). Guardar. Debe aparecer en el listado con su código legible generado.
- [ ] **2.2 — Alta de animal con dueño nuevo (quick-create):** "+ Nuevo animal" de nuevo, en "Dueño" elegí "＋ Crear dueño nuevo…" y completá nombre/apellido (celular y DNI opcionales) ahí mismo, sin salir del formulario. Guardar. Verificar en "Dueños" que la persona quedó creada.
- [ ] **2.3 — Datos por especie:** al elegir una especie en el alta, deberían aparecer campos extra específicos (raza, pelaje, etc. según `config/especieDatos.ts`). Cargar alguno y guardar.
- [ ] **2.4 — Búsqueda:** en "Animales", escribir en el buscador por nombre, por especie y por nombre de dueño — los tres deberían filtrar la tabla.
- [ ] **2.5 — Editar animal:** abrir la ficha ("Ver ficha →") → "Editar" → cambiar algo (sexo, estado, un dato de especie) → "Guardar cambios". Confirmar que se refleja en la ficha.
- [ ] **2.6 — Editar dueño:** desde "Dueños", editar un dueño existente y guardar.
- [ ] **2.7 — Foto en la ficha:** en la ficha del animal, click en el avatar (junto al nombre, muestra 🐾 si no hay foto todavía) → elegir una imagen. Debe subir, comprimirse en el cliente y mostrarse en el avatar sin recargar la página. Recargar y volver a la ficha: la foto debe persistir. Si el animal ya tiene una foto subida por el dueño desde el portal (bloque 7), debe verse la misma acá — es el mismo campo.

---

## 3. Historia clínica (consultas)

Parado en la ficha de un animal (bloque 2):

- [ ] **3.1 — Alta de consulta completa:** "+ Nueva consulta" → completar motivo, anamnesis, examen físico, diagnóstico, tratamiento, peso, temperatura, observaciones y **costo** (ahora obligatorio). Guardar. Debe aparecer en la tabla de historia clínica, con el costo visible en su columna.
- [ ] **3.1b — Costo obligatorio:** intentar guardar una consulta nueva dejando "Costo" vacío → debe rechazar sin llegar a mandar el formulario (mensaje pidiendo cargarlo, aclarando que 0 es válido para una cortesía).
- [ ] **3.1c — Diagnóstico con sugerencias:** al escribir en el campo "Diagnóstico" del alta, deben aparecer sugerencias del catálogo de referencia por especie a medida que se tipea (nada debe aparecer con el campo vacío o recién enfocado). Elegir una sugerencia sólo debe completar el texto — confirmar que después se puede seguir editando libremente, no queda bloqueado a esa opción.
- [ ] **3.2 — Alta de consulta mínima:** otra consulta con sólo motivo y costo (0, por ejemplo), dejando el resto vacío. No debería fallar (el resto de los campos siguen siendo opcionales).
- [ ] **3.3 — Editar consulta:** en la tabla, click "Editar" en una fila → cambia a un formulario inline con los datos precargados → modificar el diagnóstico → "Guardar cambios". Confirmar que se actualiza en la tabla.
- [ ] **3.4 — Borrar consulta:** click "Borrar" en una fila → confirmar el diálogo → la fila debe desaparecer de la tabla.
- [ ] **3.5 — Consistencia:** después de borrar, recargar la página y volver a la ficha — la consulta borrada no debe reaparecer.
- [ ] **3.6 — Dispensa de fármacos ligada a la consulta (F4.3):** requiere tener al menos un producto con stock cargado (ver bloque 11). En una fila de la tabla, click "Dispensar" → se abre un panel con lo ya dispensado (vacío la primera vez) y un formulario. Elegir producto + cantidad → "Dispensar". Debe aparecer en la lista del panel, y el stock de ese producto en "Farmacia" debe bajar la cantidad dispensada.
- [ ] **3.7 — Dispensa sin productos cargados:** si todavía no hay ningún producto en Farmacia, el panel de dispensa debe avisarlo ("No hay productos cargados en Farmacia") en vez de dejar guardar un formulario vacío.

---

## 4. Vacunaciones y recordatorios

Seguís en la ficha de un animal:

- [ ] **4.1 — Alta de vacuna:** bajar a "Vacunaciones" → "+ Nueva vacuna" → cargar producto (ej. "Rabia"), fecha de aplicación, próxima dosis (poné una fecha dentro de los próximos 30 días para el paso siguiente), lote opcional. Guardar. Debe aparecer en la tabla.
- [ ] **4.1b — Producto con sugerencias (catálogo de vacunas):** en el campo "Producto" del alta de vacuna, mismo comportamiento que 3.1c — sugerencias sólo al tipear, nunca restringe a lo sugerido.
- [ ] **4.2 — Ver en Recordatorios:** ir a la pestaña "Recordatorios" (sólo visible para propietario/admin/recepción/veterinario). La vacuna del paso anterior debería aparecer en "Vacunas por vencer o vencidas" si la próxima dosis cae dentro de la ventana (30/60/90 días, seleccionable con los chips).
- [ ] **4.3 — Contacto desde Recordatorios:** si el dueño tiene celular cargado, debe verse un botón "WhatsApp" (abre `wa.me` con un mensaje prearmado) y "Llamar" (`tel:`). Si no tiene celular, debe decir "Sin contacto" en vez de romper.
- [ ] **4.3b — Enviar acceso al portal:** en la misma fila, botón "Enviar portal" → con celular cargado debe abrir WhatsApp con el link del portal precargado en el mensaje (confirmar que el popup NO queda bloqueado por el navegador); sin celular, debe decir "Copiar link portal" y copiarlo al portapapeles (probar pegarlo en algún lado). Repetir para una fila de "Próximos turnos".
- [ ] **4.4 — Abrir paciente desde Recordatorios:** click en el nombre del animal en la lista → debe llevarte directo a su ficha.
- [ ] **4.5 — Próximos turnos en Recordatorios:** si hay un turno cargado dentro de la ventana (bloque 6), también debería listarse en la sección "Próximos turnos" de esta misma pantalla.
- [ ] **4.6 — Descartar recordatorio:** en una fila de "Vacunas por vencer o vencidas", click "Descartar" → la fila debe desaparecer de la lista sin recargar la página. Recargar y volver a Recordatorios: no debe reaparecer (quedó descartada del lado del backend, no es sólo un ocultamiento local).
- [ ] **4.7 — Filtro por animal:** con recordatorios de 2+ animales distintos en la ventana actual, debe aparecer un selector "Todos los animales" junto al título de la sección. Elegir uno → la lista debe filtrarse a sólo ese animal (y el contador de la derecha del título debe reflejar el número filtrado, no el total).

---

## 5. Carnet PDF

- [ ] **5.1 — Descargar carnet:** en la ficha del animal, botón "Descargar carnet" → debe abrir un PDF en una pestaña nueva.
- [ ] **5.2 — Datos reales:** confirmar que el PDF trae el nombre/especie/sexo/dueño reales (no "—" en todo) y que la(s) vacuna(s) cargada(s) en el bloque 4 aparecen en el carnet.
- [ ] **5.3 — QR:** el carnet debe traer un código QR — no hace falta escanearlo, pero debe estar presente (apunta al portal público, bloque 7).

---

## 6. Turnero

- [ ] **6.1 — Alta desde mostrador con paciente existente:** "Turnos" → "＋ Nuevo turno" → buscar por nombre un animal ya cargado → elegirlo → elegir fecha/hora y (opcional) profesional → confirmar.
- [ ] **6.2 — Alta con paciente nuevo:** "＋ Nuevo turno" de nuevo, buscar un nombre que no exista, usar la opción para crear el paciente ahí mismo (con su dueño, existente o nuevo) sin salir del modal.
- [ ] **6.3 — Calendario del mes:** confirmar que el mes clickeable a la derecha marca con un punto los días que tienen turnos, y que clickear un día cambia la agenda de la izquierda a ese día.
- [ ] **6.4 — Cambios de estado:** sobre un turno cargado, probar **confirmar**, **reprogramar** (cambia fecha/hora), **cancelar** y **atender** (por lo menos dos de estos cuatro). Confirmar que el contador por estado (arriba) se actualiza.
- [ ] **6.5 — Atender abre la ficha:** al marcar "atender" un turno, debería llevarte a la ficha del paciente con el formulario de "Nueva consulta" ya abierto.
- [ ] **6.6 — "Mis turnos" (si tu rol es veterinario):** debería haber un filtro para ver sólo los turnos asignados a vos.
- [ ] **6.7 — Rango de fechas:** en la cabecera, completar el campo "hasta" con una fecha posterior a "hoy" → la tabla debe pasar a mostrar los turnos de todos los días del rango, no sólo el de hoy. Confirmar que "Hoy", las flechas ‹/›, un click en el calendario, reprogramar o crear un turno nuevo vuelven la vista a un solo día (el rango no debe quedar "pegado" después de esas acciones).

---

## 7. Portal del dueño

Hay **dos caminos** de acceso, ambos con UI completa desde el 2026-08-28. Desde el 2026-09-03 comparten los mismos estilos que el resto de la app (antes tenían una paleta propia, ligeramente distinta).

### 7a. Acceso público por código (una mascota)

- [ ] **7.1 — Acceso público por código:** copiá el "Código" (no el microchip) de la ficha de un animal (bloque 2, campo `Dato etiqueta="Código"`, formato tipo `CAN-AR-000001-D`). En una pestaña **sin sesión de staff** (ventana privada o cerrando sesión primero), andá a `http://localhost:5173/c/<ese-código>`.
- [ ] **7.2 — Contenido del portal:** debe mostrar el resumen del animal: datos básicos, vacunas, historia clínica (motivo/diagnóstico, sin datos sensibles de más), y turnos próximos — sin haber iniciado sesión en ningún momento.
- [ ] **7.3 — Código inexistente:** probar `http://localhost:5173/c/CODIGO-QUE-NO-EXISTE` → debe mostrar un mensaje de "no encontrado", no un error roto en blanco.

### 7b. Acceso por magic-link (todas las mascotas del dueño)

- [ ] **7.4 — Generar el enlace:** en "Dueños", "Ver mascotas" sobre un dueño con al menos una mascota cargada → "Generar acceso al portal". Debe aparecer un link (`http://localhost:5173/?token=...`) para copiar.
- [ ] **7.5 — Abrir el enlace:** pegalo en una pestaña **sin sesión de staff**. Debe mostrar el nombre del dueño y **todas** sus mascotas (a diferencia del portal por código, que muestra una sola), cada una con sus vacunas/turnos/consultas.
- [ ] **7.6 — Solicitar turno:** en una de las mascotas, "Solicitar turno" → elegir fecha preferida (+ motivo opcional) → enviar. Debe confirmar "Solicitud enviada".
- [ ] **7.7 — Verificar del lado staff:** el turno solicitado debe aparecer en "Turnos" con estado "solicitado" y canal "portal".
- [ ] **7.8 — Enlace inválido:** entrar con `?token=esto-no-es-un-token` → debe mostrar un mensaje de "enlace inválido o vencido", no un error en blanco.
- [ ] **7.9 — Subir foto de perfil:** en cualquiera de las mascotas del magic-link (7.5), botón "+ Agregar foto" → elegir una imagen del dispositivo (probar con una pesada, varios MB, para confirmar que igual sube rápido) → debe aparecer como avatar de esa mascota. Volver a entrar con el mismo link (o refrescar) → la foto tiene que seguir ahí.
- [ ] **7.9b — La foto no está disponible en el portal por código:** confirmar que el acceso público por código (7a) sólo *muestra* la foto si ya se cargó desde el magic-link — no tiene botón para subirla (a propósito: ese acceso no tiene ningún token, sólo el código impreso del carnet).

---

## 8. Administración de plataforma

Requiere que tu usuario esté en `SUPERADMIN_EMAILS` (ver bloque 0.3). Es un login **separado** del de la app normal — no reutiliza la sesión de staff.

- [ ] **8.1 — Login admin + aprobar solicitud:** ir a `http://localhost:5173/admin`, loguearte con tu cuenta super-admin. Arriba debería aparecer "Solicitudes pendientes" con la del bloque 1.1. Aprobarla (no hace falta elegir nada más). Confirmar que desaparece de la bandeja, y que la organización creada ya tiene asignado el plan solicitado y una "Fecha de activación" (hoy) en su tarjeta de Acceso — sin tener que cargarlos a mano.
- [ ] **8.2 — Rechazar una solicitud:** crear otra solicitud de prueba desde el login normal y rechazarla desde acá. Confirmar que también desaparece (y que esa persona sigue sin poder loguearse).
- [ ] **8.3 — Nueva veterinaria manual:** columna "Veterinarias" → "Nueva veterinaria" → crear una sin pasar por el flujo de solicitud. Debe aparecer en la lista al instante.
- [ ] **8.4 — Miembros de una veterinaria:** click en una veterinaria de la lista → columna derecha debería mostrar sus miembros, con opción de agregar uno nuevo y de activar/desactivar.
- [ ] **8.5 — Desactivar una organización:** si hay un botón para eso, probarlo con la veterinaria de prueba del 8.3 (no con una que estés usando para el resto del protocolo) y confirmar que un usuario de esa organización no puede loguearse mientras está inactiva.
- [ ] **8.6 — Home: fecha de activación y próximo vencimiento:** columna "Organizaciones" → elegí una veterinaria → tarjeta "Acceso" → cargar una "Fecha de activación" y guardar. Volver a la pestaña "Home": la fila de esa organización debe mostrar esa fecha y un "Próximo vencimiento" calculado con el mismo día del mes.
- [ ] **8.7 — Home: registrar un pago:** en la tabla de Home, "Registrar pago" sobre una organización → cargar un monto → guardar. La fila debe pasar a "pagó" (este mes) y la tarjeta "Ganancias acumuladas" debe sumar ese monto en el mes en curso.
- [ ] **8.9 — Analítica de uso:** antes de este paso, andar un poco por la app con tu usuario de staff (abrir un par de pantallas distintas, dar de alta algo en Tropera y en Farmacia, atender un turno). Después, en `/admin`, pestaña "Analítica" → deben verse tarjetas de totales y las tablas de "top pantallas"/"top acciones" reflejando lo que acabás de hacer (los nombres de pantalla/acción no van a ser 1:1 con lo que clickeaste, son identificadores internos tipo `tropera-establecimiento-crear` — confirmar que aparece *algo* nuevo, no que el texto coincide literal). Cambiar el rango de fechas a uno que no incluya hoy → los números deben bajar a 0 o a lo que hubiera en ese rango.
- [ ] **8.8 — Planes: deshabilitar para altas nuevas:** pestaña "Planes" → en un plan, "Deshabilitar para altas nuevas". Volver a "Organizaciones" → tarjeta "Acceso" de cualquier veterinaria → intentar asignarle ese plan → debe rechazarlo. Una organización que ya tenía ese plan asignado antes de deshabilitarlo no debe verse afectada.

---

## 9. Tropera

Sólo visible en la nav para roles `propietario`/`admin`/`capataz`.

- [ ] **9.1 — Alta de establecimiento:** "Tropera" → "+ Nuevo establecimiento" → nombre (obligatorio) + ubicación/superficie (opcionales). Guardar.
- [ ] **9.2 — Segundo establecimiento:** crear uno más — lo vas a necesitar para probar traslados (9.6) y el panel consolidado (9.2b).
- [ ] **9.2b — Panel consolidado:** con 2+ establecimientos creados, arriba del listado debe aparecer "Stock consolidado": una tabla con una fila por establecimiento, una columna por categoría, y una fila/columna de totales. Con ambos en 0 todavía, todos los números deben dar 0. Volvé a este punto después de 9.5/9.6 (cargar existencias) para confirmar que los totales se actualizan.
- [ ] **9.3 — Ver hacienda:** "Ver hacienda →" sobre el primer establecimiento. Debe mostrar las 6 categorías (vacas, toros, terneros, terneras, vaquillonas, novillos) todas en 0.
- [ ] **9.4 — Corrección directa de existencias:** cambiar la cantidad de "Vacas" a mano en el input y "Guardar" (esto es la corrección sin historial, distinta de un movimiento). Confirmar que se actualiza.
- [ ] **9.5 — Movimiento de alta:** "Movimientos" → "+ Nuevo movimiento" → tipo "Compra", categoría "Toros", cantidad 5. Guardar. Confirmar que ahora hay 5 toros en existencias y que el movimiento aparece en el historial con signo "+".
- [ ] **9.6 — Traslado entre establecimientos:** "+ Nuevo movimiento" → tipo "Traslado", elegir categoría y cantidad, y el segundo establecimiento (9.2) como destino. Guardar. Confirmar: baja en el establecimiento de origen, aparece (con fila nueva si no tenía esa categoría) en el destino, y que en el historial del destino se ve como "← <nombre origen>" y en el de origen como "→ <nombre destino>".
- [ ] **9.7 — Baja rechazada por stock insuficiente:** "+ Nuevo movimiento" → tipo "Venta" → una cantidad mayor a la que hay disponible en esa categoría. Debe rechazar con un mensaje de error visible, **sin** cambiar el número de existencias.
- [ ] **9.8 — Evento sanitario:** "Eventos sanitarios y reproductivos" → "+ Nuevo evento" → tipo "Vacunación", categoría y cantidad opcionales, producto (ej. "Aftosa"). Guardar. Confirmar que aparece en el historial de eventos **y que las existencias no cambiaron** (a diferencia de un movimiento).
- [ ] **9.9 — Evento sin categoría:** otro evento de tipo "Servicio" sin elegir categoría ("Toda la hacienda"). Debe guardar igual.
- [ ] **9.10 — Editar establecimiento:** "Editar" sobre el establecimiento → cambiar la ubicación o superficie → guardar.

---

## 10. Usuarios (alta y reseteo de contraseña)

Sólo visible en la nav para roles `propietario`/`admin`.

- [ ] **10.0 — Alta de usuario:** "+ Nuevo usuario" → cargar email, contraseña, nombre/apellido y tildar al menos un rol → "Agregar usuario". Debe aparecer en el listado al instante. Si el plan tiene cupo definido para algún rol, los checkboxes de los roles sin cupo disponible deben verse deshabilitados con el conteo "(usados/límite)".
- [ ] **10.1 — Listado:** "Usuarios" → debe mostrar el personal de tu organización con nombre y rol.
- [ ] **10.2 — Contraseña temporal:** "Resetear contraseña" sobre un miembro (no vos mismo) → dejar el campo vacío → "Generar contraseña temporal". Debe mostrar la contraseña generada en un recuadro, aclarando que no se vuelve a mostrar.
- [ ] **10.3 — Verificar la temporal:** con esa contraseña, loguearse como ese usuario (en otra pestaña o después de cerrar tu sesión) — debe entrar.
- [ ] **10.4 — Contraseña específica:** volver a "Resetear contraseña" sobre el mismo usuario, esta vez escribiendo una contraseña propia (mínimo 6 caracteres) → guardar. Confirmar que el mensaje ya no muestra ninguna contraseña (sólo la temporal autogenerada se expone).
- [ ] **10.5 — La vieja ya no sirve:** intentar loguearse con la contraseña anterior (la temporal del 10.2) → debe rechazar.
- [ ] **10.6 — Protección de propietario:** si tenés un usuario con rol "Propietario" además del tuyo, y tu cuenta es "Administrador" (no propietario), intentar resetearle la contraseña debería rechazar (sólo un propietario puede resetear a otro propietario).
- [ ] **10.7 — "⚙ Agendas" (movido desde Turnos):** en "Usuarios", botón "⚙ Agendas" junto a "+ Nuevo usuario" → debe abrir el mismo panel de gestión de agendas de siempre (crear/editar agendas y sus bloques horarios). Confirmar que **ya no** está en la cabecera de "Turnos".

---

## 10b. Wizard de configuración rápida (primer login del propietario)

Se dispara solo, una única vez, al loguearse por primera vez con la cuenta `propietario` de una organización recién aprobada (bloque 8.1). Para volver a verlo hay que borrar la clave `ecosistema.wizard.visto.<usuarioId>` de localStorage.

- [ ] **10b.1 — Se dispara solo:** loguearse por primera vez con el usuario aprobado en 8.1 → antes de ver la app normal, debe aparecer la pantalla de bienvenida del wizard (no el rail de navegación).
- [ ] **10b.2 — Paso usuarios:** "Empezar" → dar de alta uno o dos usuarios (con distintos roles) → deben aparecer como chips "agregados" en la misma pantalla, y también quedar visibles después en "Usuarios".
- [ ] **10b.3 — Paso agenda de veterinario:** elegir un veterinario (tiene que ser uno de los que tenga rol veterinario o sea el propio propietario), tildar algunos días, cargar horario → "+ Crear esta agenda". Debe aparecer como chip "✓ agenda creada" y, después de terminar el wizard, verse en "Turnos → ⚙ Agendas" con sus bloques horarios correctos.
- [ ] **10b.4 — Paso peluquería (opcional):** igual que 10b.3 pero sin elegir profesional — la agenda resultante debe quedar "sin profesional" en "⚙ Agendas".
- [ ] **10b.5 — Saltar un paso:** en cualquier paso, "Saltar por ahora" debe cerrar el wizard entero y dejar entrar a la app normal.
- [ ] **10b.6 — No se repite solo:** cerrar sesión y volver a entrar con el mismo usuario → el wizard NO debe volver a aparecer.
- [ ] **10b.7 — No aplica a otros roles:** loguearse con un usuario `admin`/`veterinario`/etc. (no propietario) → nunca debe aparecer el wizard, ni siquiera la primera vez.

---

## 11. Farmacia y stock (vademécum + insumos generales)

Sólo visible en la nav para roles `propietario`/`admin`/`veterinario`. Desde 2026-09-01 cubre explícitamente cualquier insumo de mostrador (alimento, accesorios, forraje), no sólo medicamentos.

- [ ] **11.1b — Nombre con sugerencias del vademécum SENASA:** al tipear en el campo "Nombre" del alta de producto, deben aparecer sugerencias del vademécum SENASA (7003 productos reales) sólo después de tipear algo — probar con un nombre comercial conocido (ej. "Ivomec"). Elegir una sugerencia sólo prellena el nombre, se puede seguir editando.
- [ ] **11.1 — Alta de producto (no medicamento):** "Farmacia y stock" → "+ Nuevo producto" → nombre (obligatorio) + presentación/unidad (opcionales, `<select>` de lista cerrada) + categoría (opcional, buscador de lista cerrada — tipear "alim" y elegir "Alimento" de las sugerencias). **No** tildar "Es medicamento" → el subform de concentración/dosis no debe aparecer. Guardar. Debe aparecer en el listado con stock en 0 y **sin** campo de precio en este formulario (el precio se carga aparte, ver 11.9).
- [ ] **11.2 — Alta de producto (medicamento):** repetir el alta tildando "Es medicamento" → debe aparecer el subform "Datos para la calculadora de dosificación" (concentración/unidad de concentración/dosis sugerida, todos opcionales).
- [ ] **11.3 — Ver detalle:** "Ver →" sobre un producto → debe mostrar sus datos (incluyendo Medicamento/Fraccionable Sí/No y Precio de compra/venta si ya se cargaron), un campo de stock, y el historial de movimientos.
- [ ] **11.4 — Movimiento de compra:** desde el detalle, "+ Nuevo movimiento" → tipo "Compra", cantidad (ej. 100) → guardar. El stock debe subir y el movimiento aparecer en el historial con signo "+".
- [ ] **11.5 — Calculadora de bultos (en el movimiento):** al elegir tipo "Compra" debe aparecer "¿Entró en bultos?" con "Bultos recibidos" × "Contenido por bulto" → el total calculado y "Usar esta cantidad" debe completar el campo Cantidad.
- [ ] **11.6 — Movimiento de uso:** otro movimiento, tipo "Uso", cantidad menor a la disponible → el stock debe bajar y el historial mostrarlo con signo "−".
- [ ] **11.7 — Baja rechazada por stock insuficiente:** tipo "Merma" con una cantidad mayor a la disponible → debe rechazar con un mensaje de error, **sin** cambiar el stock.
- [ ] **11.8 — Corrección directa:** cambiar el número de "Stock" a mano y "Guardar corrección" (esto no deja historial, a diferencia de un movimiento). Confirmar que se actualiza.
- [ ] **11.9 — Ingresos (alta de stock con precios):** "Farmacia y stock" → "+ Ingresos" → buscar un producto ya existente, cargar cantidad (con la misma calculadora de bultos), precio de compra al proveedor (opcional) y precio de venta al cliente (obligatorio) → "Registrar ingreso". Debe subir el stock y actualizar ambos precios del producto (visibles en su ficha, "por [unidad]").
- [ ] **11.9b — El precio de compra genera un egreso:** repetir 11.9 cargando un precio de compra > 0 → antes de guardar debe verse el aviso "Esto va a sumar $X como egreso en Caja". Después de guardar, ir a "Caja" → el egreso debe estar en la caja del día, por el monto precioCompra × cantidad, con el nombre del producto en el concepto.
- [ ] **11.10 — Filtro por categoría:** con productos en más de una categoría, debe aparecer un selector "Categoría" arriba del listado que filtra la tabla.
- [ ] **11.11 — Editar producto:** "Editar" sobre un producto → cambiar categoría (buscador), tildar/destildar "Es medicamento"/"Es fraccionable", ajustar precios → guardar. Un valor de categoría previo a la lista cerrada (cargado por API, no por este form) debe seguir apareciendo como opción al editar, no perderse.
- [ ] **11.12 — Dispensa desde una consulta (F4.3):** ver 3.6/3.7 — se prueba desde la ficha del paciente, no desde acá, pero el movimiento que genera (tipo "Uso" con la consulta asociada) debe aparecer en el historial de este producto igual que cualquier otro movimiento.

---

## 12. Tutorial guiado

- [ ] **12.1 — Primer login:** con un usuario que nunca inició sesión en este navegador, entrar → debe aparecer solo el tour (sin tener que pedirlo), con el paso de bienvenida centrado en pantalla.
- [ ] **12.2 — Recorrido completo:** "Siguiente" hasta el final → cada paso debe resaltar el ítem de nav correcto (o el botón "+ Nuevo ..." en los pasos de Turnos/Animales/Tropera) y, si el paso está en otra sección, la pantalla de atrás debe cambiar sola antes de mostrar el tooltip.
- [ ] **12.3 — Volver atrás:** en algún paso intermedio, "Atrás" → debe volver al paso anterior (cambiando de sección si hace falta) sin romperse.
- [ ] **12.4 — Saltar:** "Saltar" en cualquier paso → debe cerrar el tour sin errores.
- [ ] **12.5 — No se repite solo:** recargar la página (o volver a loguearse) → el tour **no** debe reaparecer solo.
- [ ] **12.6 — Reabrir manualmente:** botón "❓ Ayuda" (arriba a la derecha) → debe arrancar el tour de nuevo desde el paso 1, en cualquier momento.
- [ ] **12.7 — Por rol:** repetir 12.1 con un usuario de cada rol (veterinario, recepción, capataz) → el contenido del tour debe ser distinto (más corto, enfocado en lo que ese rol realmente usa) — comparar contra lo que ve un propietario/admin.

---

## 13. Home — Centro de operaciones (Huella)

Home de Huella (pestaña "Home" en el rail). Cada acceso rápido sólo debe aparecer para los roles indicados.

- [ ] **13.1 — Nueva consulta** (`propietario`/`admin`/`veterinario`): tarjeta "Nueva consulta" → modal de búsqueda de paciente → elegir uno existente **o** "No aparece: crear paciente nuevo" (con alta de dueño inline si hace falta) → debe navegar directo a la ficha del paciente con "Historia clínica" ya abierta en modo alta.
- [ ] **13.2 — Registro de vacuna** (`propietario`/`admin`/`veterinario`): igual que 13.1 pero debe abrir el drawer "Nueva vacuna" en la ficha del paciente.
- [ ] **13.3 — Venta común** (`propietario`/`admin`/`recepcion`): tarjeta "Venta común" → buscar un producto (buscador, no `<select>`), cargar cantidad, el precio unitario debe precargarse con el precio actual del producto y el total recalcularse solo. Si se cambia el precio unitario, debe avisar que el precio general del producto va a quedar así, y al guardar el producto debe quedar con ese nuevo precio (verificar en Farmacia). Ya no hace falta tener la caja abierta de antemano (ver 13.7).
- [ ] **13.4 — Nuevo turno** (`propietario`/`admin`/`veterinario`/`recepcion`): tarjeta "Nuevo turno" → mismo picker de paciente que 13.1 → elegir una agenda (si hay alguna configurada) debe mostrar los horarios disponibles como botones (los ocupados, tachados/deshabilitados) en vez del campo de hora libre; sin agenda, campo de hora libre. Crear el turno y confirmar que aparece en "Turnos de hoy" si la fecha es hoy.
- [ ] **13.5 — Turnos de hoy:** debajo de las tarjetas, tabla con los turnos de hoy (no cancelados/atendidos) — un turno de otro día no debe aparecer. Click en una fila abre la ficha de ese paciente. Botón "Ver todos los turnos →" navega a la pestaña Turnos.
- [ ] **13.5b — Botón "Atender" (rol veterinario/propietario):** en un turno con estado "Confirmado" o "Reprogramado", debe aparecer un botón "Atender" en la fila (no interfiere con el click de la fila, que sigue abriendo la ficha sin marcar nada). Al usarlo: el turno pasa a "Atendido" (verificar en Turnos), desaparece de esta tabla, y se abre la ficha del paciente con "Nueva consulta" ya desplegada.
- [ ] **13.5c — Sin botón para otros roles/estados:** un turno "Solicitado" no debe mostrar el botón "Atender" (no está en el estado correcto); un usuario `recepción` no debe verlo en ningún turno.
- [ ] **13.6 — Sin accesos para el rol:** con un usuario que no tenga ninguno de los roles anteriores, el panel debe mostrar "No tenés accesos rápidos disponibles para tu rol" en vez de tarjetas vacías.
- [ ] **13.7 — Venta común sin caja abierta:** con la caja del día cerrada, "Venta común" desde Home → completar una venta → ya no debe bloquear con "Ir a Caja": la venta se registra y la caja queda abierta sola (confirmar en la pestaña Caja, con monto inicial $0).
- [ ] **13.8 — Ingreso de stock** (`propietario`/`admin`/`veterinario`): en la columna derecha, debajo de las 3 tarjetas de KPI, tarjeta "Ingreso de stock" → mismo formulario que "+ Ingresos" de Farmacia (11.9), en un modal. Completarlo con un precio de compra → confirmar que también genera el egreso en Caja (11.9b) y que el modal se cierra solo al terminar.

---

## 14. Caja (`propietario`/`admin`/`recepción` — auditoría/honorarios/estadísticas sólo `propietario`/`admin`)

No había checklist para este módulo todavía — agregado junto con la apertura rápida y las estadísticas.

- [ ] **14.1 — Apertura rápida con el primer cobro:** con la caja del día cerrada, ir directo a "Caja del día" → "Nuevo cobro" ya no debería existir sin abrir antes (esa pantalla todavía pide abrir a mano, ver 14.2) — para probar la apertura *automática* usar 13.7 (Venta común) en su lugar, o el mostrador después de abrirla manualmente una vez.
- [ ] **14.2 — Apertura manual sigue andando:** con la caja cerrada, entrar a "Caja del día" → debe pedir el formulario de apertura (monto inicial) como siempre.
- [ ] **14.3 — Cobro y egreso:** con la caja abierta, cargar un cobro (concepto + monto + método de pago) y un egreso → deben aparecer en sus tablas respectivas, y las tarjetas de "Cobros"/"Egresos"/"Total calculado" arriba deben actualizarse solas.
- [ ] **14.4 — Egreso sin caja abierta:** con la caja cerrada, no debería ni aparecer la opción de cargar un egreso (a diferencia de un cobro, un egreso no abre la caja sola).
- [ ] **14.5 — Cierre con arqueo:** "Cerrar caja" → declarar un monto → si coincide con lo calculado, el cierre debe quedar aceptado automáticamente; si no coincide, debe avisar que quedó pendiente de auditoría.
- [ ] **14.6 — Auditoría de cierres:** con un cierre pendiente (14.5 con diferencia), pestaña "Auditoría de cierres" → debe listarlo. Aceptar o marcar "en revisión"/"rechazado" (estos dos piden una observación obligatoria).
- [ ] **14.7 — Honorarios:** pestaña "Honorarios" → elegir un profesional y un rango de fechas → debe listar sus cobros imputados con el total pendiente de liquidar. "Marcar como liquidado" → los cobros del rango pasan a liquidados y el total pendiente baja.
- [ ] **14.8 — Estadísticas (nuevo):** pestaña "Estadísticas" → por defecto trae los últimos 30 días. Deben verse tarjetas de Cobros/Egresos/Neto/cantidad de cobros/cantidad de cajas, una tabla "Por día" y un desglose "Por método de pago". Cambiar el rango de fechas y "Actualizar" → los números tienen que cambiar según lo cargado en ese rango.
- [ ] **14.9 — Auto-cierre de una caja olvidada (difícil de probar sin tocar la fecha del sistema o la base a mano):** si una caja quedó abierta de un día anterior, la próxima vez que alguien entre a "Caja del día", cargue un cobro o un egreso, debe cerrarse sola (sin pedir arqueo) y aparecer en "Auditoría de cierres" como pendiente, con la observación "Cerrada automáticamente...". La acción que la disparó (ver Caja, cobrar, o cargar el egreso) no debe bloquearse — sigue funcionando sobre una caja nueva del día actual.

---

## 15. App móvil (Android)

Requiere el APK de desarrollo instalado en un dispositivo físico o emulador, con Metro corriendo (`npx expo run:android` la primera vez tras un cambio nativo, `npx expo start` para el resto) y `EXPO_PUBLIC_API_URL` apuntando a la IP de LAN del backend (no `localhost` — el celular no es la misma máquina). No hay build de release todavía (ver "Resumen de límites conocidos"), así que esto se prueba en el propio dispositivo de desarrollo.

- [ ] **15.1 — Login + sync inicial:** loguearse con un usuario real → debe entrar directo a Home (si `huellaActiva`) o Establecimientos (si sólo `troperaActiva`). La sincronización debe correr sola, sin ningún botón de "sincronizar" visible.
- [ ] **15.2 — Tabs según la organización:** confirmar que sólo aparecen las pestañas de las soluciones activas para esa organización (si no tiene Tropera, no debe verse esa pestaña).
- [ ] **15.3 — Home, accesos rápidos:** probar "Nueva consulta" y "Registro de vacuna" (buscar o crear paciente inline) → deben llevar a la ficha con el formulario correspondiente ya abierto. Probar "Venta común" e "Ingreso de stock" (ver 15.6).
- [ ] **15.4 — Ficha: consulta con campos colapsables:** en "Nueva consulta", los campos (Diagnóstico, Tratamiento, Peso, Observaciones, Monto cobrado) deben verse colapsados con un indicador de lleno/vacío — tocar uno debe desplegarlo para completarlo. El monto cobrado debe traer 0 por defecto. Guardar → confirmar que el botón "Guardar consulta" es alcanzable sin que el teclado lo tape.
- [ ] **15.5 — Ficha: vacunación con calendario nativo:** en "Nueva vacunación", el campo "Próxima dosis" debe abrir un selector de fecha nativo (no un teclado para tipear texto) al tocarlo. Elegir una fecha → debe verse formateada en el campo. Guardar y confirmar que se ve en el historial.
- [ ] **15.5b — Foto del paciente:** en la ficha, tocar el avatar → debe ofrecer "Tomar foto" o "Elegir de galería" → subir una → debe verse en el avatar sin salir de la pantalla. Volver a entrar a la ficha (o cerrar y reabrir la app) → la foto debe persistir.
- [ ] **15.6 — Venta rápida / Ingreso de stock, con alta de producto inline:** en cualquiera de los dos, buscar un producto que no exista → "＋ No aparece: crear producto nuevo" → cargar sólo el nombre → debe continuar el flujo con ese producto recién creado (cantidad/precio, según el formulario).
- [ ] **15.7 — Turnos, filtro y atender:** pestaña "Turnos" → probar los tres chips (Hoy/Próximos/Todos) y confirmar que la lista cambia. Sobre un turno `confirmado`/`reprogramado`, botón "Atender" (sólo veterinario/propietario) → debe marcarlo como atendido y abrir la ficha del paciente en la sección de consulta.
- [ ] **15.8 — Tropera (si la organización la tiene activa):** alta de movimiento offline (podés probar en modo avión) → debe guardarse localmente sin error. Reactivar la red → debe sincronizar solo y verse reflejado si se consulta la misma organización desde la web.
- [ ] **15.9 — Olvidé mi contraseña:** en el login, el link correspondiente sólo debe pedir el email y confirmar el envío — no debe ofrecer cambiar la contraseña ahí mismo (eso pasa abriendo el link del mail en el navegador del celular, ver 1.8).
- [ ] **15.10 — Analítica (verificación indirecta):** después de las pantallas/acciones de arriba, revisar 8.9 desde la web — deberían aparecer eventos con nombres reconocibles del mobile (`home-consulta`, `turno-atender`, `stock-venta`, etc.) mezclados con los de la web.

---

## Resumen de límites conocidos (no son bugs, son alcance no construido todavía)

- Tropera: los conteos agregados por categoría siguen siendo el modelo principal; el seguimiento individual (Fase E, fichas de campo/`animales_campo`) convive con ellos sin reemplazarlos — no confundir "hay seguimiento individual" con "todo pasó a ser individual". El modo offline sí está implementado (`sync/`), verificado primero en un emulador Android y desde el 2026-09-04 en un dispositivo físico real.
- Facturación (ARCA/WSFE): no existe — cada organización sigue facturando a sus clientes fuera del sistema. (No confundir con el "Home de facturación" de `/admin`, que es el control de pagos entre la plataforma y sus organizaciones clientes — eso sí está.)
- Farmacia: el vademécum de SENASA ya está poblado como **catálogo de referencia con búsqueda** (bloque 11.1b), pero sigue sin haber una carga masiva que cree productos reales en el stock de cada organización — cada clínica sigue eligiendo a mano qué de ese catálogo efectivamente stockea. Sin fecha de vencimiento por lote ni alertas de stock bajo/vencimiento. La dispensa ligada a consulta (F4.3) ya existe (panel en la ficha del paciente), pero sigue siendo manual (el usuario elige el producto) — no hay un vínculo automático con lo cargado en una vacunación puntual.
- Notificaciones proactivas (email/WhatsApp automático): no existen — "Recordatorios" hay que ir a mirarlo, no avisa solo.
- App móvil: ya no es un scaffold — ver el bloque 15 nuevo. Gap real: no hay ningún build de release firmado (todo lo probado hasta ahora corrió como debug vía `expo run:android`), así que un tercero todavía no puede instalarla por su cuenta.
- Recuperar contraseña: el flujo entero funciona (bloque 1.8), pero el email real todavía no le llega a un usuario ajeno a la cuenta de Resend — falta verificar un dominio propio (ver `docs/Plan_Despliegue.md`).
