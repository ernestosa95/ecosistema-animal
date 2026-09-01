# 🧪 Protocolo de pruebas manuales (desde la interfaz)

> Checklist para validar a mano, en el navegador, todo lo que está construido hasta el 2026-08-28. No reemplaza los tests automáticos (`test:*-demo` en `apps/backend`) — es el complemento para lo que sólo se ve andando la web real. Pensado para tacharse paso a paso; si algo falla, anotá el paso exacto y el mensaje de error tal cual aparece.

**Convención:** 🌐 = pasos en el navegador. 💻 = pasos en la terminal (para armar el entorno o revisar algo que la UI no muestra).

---

## 0. Preparación (una sola vez por sesión de pruebas)

1. 💻 Desde la raíz del repo: `./dev.sh` (o `pnpm --filter backend start:dev` y `pnpm --filter web dev` en dos terminales). Esperar el log `Backend del ecosistema escuchando en http://localhost:3000`.
2. 🌐 Abrir **http://localhost:5173**.
3. Confirmar en `apps/backend/.env` que `SUPERADMIN_EMAILS` tiene el email que vas a usar para entrar a `/admin` (hoy: `ridelernesto@gmail.com`). Sin esto, el bloque 8 (Administración) no se puede probar.
4. Vas a necesitar **al menos dos pestañas o navegadores** en algún momento (el bloque 7 requiere estar deslogueado de la sesión de staff para simular al dueño accediendo por su cuenta).

---

## 1. Cuenta y sesión

- [ ] **1.1 — Alta de cuenta (solicitud):** en la pantalla de login, "¿No tenés cuenta?" → "Solicitar acceso". Elegí "Crear una veterinaria o campo nuevo", completá nombre/apellido/email/contraseña/DNI (opcional) y los datos de la institución (nombre/tipo/dirección/localidad/provincia/teléfono/email, todos opcionales salvo nombre y tipo). Enviar. Debe aparecer "Solicitud enviada" — **no** te loguea directo (a propósito: pasa por aprobación, ver bloque 8).
- [ ] **1.1b — Datos completos visibles al aprobar:** en el bloque 8.1, la tarjeta de la solicitud debe mostrar el DNI junto al email/teléfono, y una línea aparte con la dirección/localidad/provincia/teléfono/email de la institución (si se cargaron).
- [ ] **1.2 — Login sin aprobar:** intentar entrar con ese mismo email/contraseña antes de aprobar la solicitud → debe rechazar (no existe usuario todavía, la solicitud es una tabla aparte hasta que se aprueba).
- [ ] **1.3 — Aprobar la solicitud:** ir al bloque 8.1 y volver acá.
- [ ] **1.4 — Login post-aprobación:** ahora sí debería entrar. Fijate qué pantalla de inicio te muestra (Turnos si el rol es propietario/admin/recepción/veterinario; Animales si es capataz).
- [ ] **1.5 — Persistencia de sesión:** recargar la página (F5) estando logueado → no debería pedir login de nuevo (sesión en localStorage).
- [ ] **1.6 — Cerrar sesión:** botón "Cerrar sesión" arriba a la derecha → vuelve al login.
- [ ] **1.7 — Refresh token (opcional, no bloqueante):** es difícil de ver a simple vista porque es silencioso — el access token dura 15 minutos. Si querés confirmarlo sin esperar: dejá la pestaña abierta y logueada, esperá 16+ minutos sin recargar, después hacé cualquier acción (abrir "Animales"). Si sigue andando sin pedirte login de nuevo, el refresh funcionó solo.

---

## 2. Animales y dueños

- [ ] **2.1 — Alta de animal con dueño existente:** "Animales" → "+ Nuevo animal". Completá nombre + especie, elegí un dueño ya cargado (si no hay ninguno, cargá uno primero desde "Dueños" → "+ Nuevo dueño"). Guardar. Debe aparecer en el listado con su código legible generado.
- [ ] **2.2 — Alta de animal con dueño nuevo (quick-create):** "+ Nuevo animal" de nuevo, en "Dueño" elegí "＋ Crear dueño nuevo…" y completá nombre/apellido (celular y DNI opcionales) ahí mismo, sin salir del formulario. Guardar. Verificar en "Dueños" que la persona quedó creada.
- [ ] **2.3 — Datos por especie:** al elegir una especie en el alta, deberían aparecer campos extra específicos (raza, pelaje, etc. según `config/especieDatos.ts`). Cargar alguno y guardar.
- [ ] **2.4 — Búsqueda:** en "Animales", escribir en el buscador por nombre, por especie y por nombre de dueño — los tres deberían filtrar la tabla.
- [ ] **2.5 — Editar animal:** abrir la ficha ("Ver ficha →") → "Editar" → cambiar algo (sexo, estado, un dato de especie) → "Guardar cambios". Confirmar que se refleja en la ficha.
- [ ] **2.6 — Editar dueño:** desde "Dueños", editar un dueño existente y guardar.

---

## 3. Historia clínica (consultas)

Parado en la ficha de un animal (bloque 2):

- [ ] **3.1 — Alta de consulta completa:** "+ Nueva consulta" → completar motivo, anamnesis, examen físico, diagnóstico, tratamiento, peso, temperatura y observaciones (los 8 campos). Guardar. Debe aparecer en la tabla de historia clínica.
- [ ] **3.2 — Alta de consulta mínima:** otra consulta con sólo motivo, dejando el resto vacío. No debería fallar (todos los campos son opcionales salvo el paciente).
- [ ] **3.3 — Editar consulta:** en la tabla, click "Editar" en una fila → cambia a un formulario inline con los datos precargados → modificar el diagnóstico → "Guardar cambios". Confirmar que se actualiza en la tabla.
- [ ] **3.4 — Borrar consulta:** click "Borrar" en una fila → confirmar el diálogo → la fila debe desaparecer de la tabla.
- [ ] **3.5 — Consistencia:** después de borrar, recargar la página y volver a la ficha — la consulta borrada no debe reaparecer.
- [ ] **3.6 — Dispensa de fármacos ligada a la consulta (F4.3):** requiere tener al menos un producto con stock cargado (ver bloque 11). En una fila de la tabla, click "Dispensar" → se abre un panel con lo ya dispensado (vacío la primera vez) y un formulario. Elegir producto + cantidad → "Dispensar". Debe aparecer en la lista del panel, y el stock de ese producto en "Farmacia" debe bajar la cantidad dispensada.
- [ ] **3.7 — Dispensa sin productos cargados:** si todavía no hay ningún producto en Farmacia, el panel de dispensa debe avisarlo ("No hay productos cargados en Farmacia") en vez de dejar guardar un formulario vacío.

---

## 4. Vacunaciones y recordatorios

Seguís en la ficha de un animal:

- [ ] **4.1 — Alta de vacuna:** bajar a "Vacunaciones" → "+ Nueva vacuna" → cargar producto (ej. "Rabia"), fecha de aplicación, próxima dosis (poné una fecha dentro de los próximos 30 días para el paso siguiente), lote opcional. Guardar. Debe aparecer en la tabla.
- [ ] **4.2 — Ver en Recordatorios:** ir a la pestaña "Recordatorios" (sólo visible para propietario/admin/recepción/veterinario). La vacuna del paso anterior debería aparecer en "Vacunas por vencer o vencidas" si la próxima dosis cae dentro de la ventana (30/60/90 días, seleccionable con los chips).
- [ ] **4.3 — Contacto desde Recordatorios:** si el dueño tiene celular cargado, debe verse un botón "WhatsApp" (abre `wa.me` con un mensaje prearmado) y "Llamar" (`tel:`). Si no tiene celular, debe decir "Sin contacto" en vez de romper.
- [ ] **4.4 — Abrir paciente desde Recordatorios:** click en el nombre del animal en la lista → debe llevarte directo a su ficha.
- [ ] **4.5 — Próximos turnos en Recordatorios:** si hay un turno cargado dentro de la ventana (bloque 6), también debería listarse en la sección "Próximos turnos" de esta misma pantalla.

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

---

## 7. Portal del dueño

Hay **dos caminos** de acceso, ambos con UI completa desde el 2026-08-28.

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

---

## 8. Administración de plataforma

Requiere que tu usuario esté en `SUPERADMIN_EMAILS` (ver bloque 0.3). Es un login **separado** del de la app normal — no reutiliza la sesión de staff.

- [ ] **8.1 — Login admin + aprobar solicitud:** ir a `http://localhost:5173/admin`, loguearte con tu cuenta super-admin. Arriba debería aparecer "Solicitudes pendientes" con la del bloque 1.1. Aprobarla (elegí rol si es de tipo "unirse" a una organización existente; si es "crear organización nueva" no hace falta elegir nada más). Confirmar que desaparece de la bandeja.
- [ ] **8.2 — Rechazar una solicitud:** crear otra solicitud de prueba desde el login normal y rechazarla desde acá. Confirmar que también desaparece (y que esa persona sigue sin poder loguearse).
- [ ] **8.3 — Nueva veterinaria manual:** columna "Veterinarias" → "Nueva veterinaria" → crear una sin pasar por el flujo de solicitud. Debe aparecer en la lista al instante.
- [ ] **8.4 — Miembros de una veterinaria:** click en una veterinaria de la lista → columna derecha debería mostrar sus miembros, con opción de agregar uno nuevo y de activar/desactivar.
- [ ] **8.5 — Desactivar una organización:** si hay un botón para eso, probarlo con la veterinaria de prueba del 8.3 (no con una que estés usando para el resto del protocolo) y confirmar que un usuario de esa organización no puede loguearse mientras está inactiva.

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

## 10. Usuarios (reseteo de contraseña)

Sólo visible en la nav para roles `propietario`/`admin`.

- [ ] **10.1 — Listado:** "Usuarios" → debe mostrar el personal de tu organización con nombre y rol.
- [ ] **10.2 — Contraseña temporal:** "Resetear contraseña" sobre un miembro (no vos mismo) → dejar el campo vacío → "Generar contraseña temporal". Debe mostrar la contraseña generada en un recuadro, aclarando que no se vuelve a mostrar.
- [ ] **10.3 — Verificar la temporal:** con esa contraseña, loguearse como ese usuario (en otra pestaña o después de cerrar tu sesión) — debe entrar.
- [ ] **10.4 — Contraseña específica:** volver a "Resetear contraseña" sobre el mismo usuario, esta vez escribiendo una contraseña propia (mínimo 6 caracteres) → guardar. Confirmar que el mensaje ya no muestra ninguna contraseña (sólo la temporal autogenerada se expone).
- [ ] **10.5 — La vieja ya no sirve:** intentar loguearse con la contraseña anterior (la temporal del 10.2) → debe rechazar.
- [ ] **10.6 — Protección de propietario:** si tenés un usuario con rol "Propietario" además del tuyo, y tu cuenta es "Administrador" (no propietario), intentar resetearle la contraseña debería rechazar (sólo un propietario puede resetear a otro propietario).

---

## 11. Farmacia y stock (vademécum + insumos generales)

Sólo visible en la nav para roles `propietario`/`admin`/`veterinario`. Desde 2026-09-01 cubre explícitamente cualquier insumo de mostrador (alimento, accesorios, forraje), no sólo medicamentos.

- [ ] **11.1 — Alta de producto (no medicamento):** "Farmacia y stock" → "+ Nuevo producto" → nombre (obligatorio) + presentación/unidad (opcionales, `<select>` de lista cerrada) + categoría (opcional, buscador de lista cerrada — tipear "alim" y elegir "Alimento" de las sugerencias). **No** tildar "Es medicamento" → el subform de concentración/dosis no debe aparecer. Guardar. Debe aparecer en el listado con stock en 0 y **sin** campo de precio en este formulario (el precio se carga aparte, ver 11.9).
- [ ] **11.2 — Alta de producto (medicamento):** repetir el alta tildando "Es medicamento" → debe aparecer el subform "Datos para la calculadora de dosificación" (concentración/unidad de concentración/dosis sugerida, todos opcionales).
- [ ] **11.3 — Ver detalle:** "Ver →" sobre un producto → debe mostrar sus datos (incluyendo Medicamento/Fraccionable Sí/No y Precio de compra/venta si ya se cargaron), un campo de stock, y el historial de movimientos.
- [ ] **11.4 — Movimiento de compra:** desde el detalle, "+ Nuevo movimiento" → tipo "Compra", cantidad (ej. 100) → guardar. El stock debe subir y el movimiento aparecer en el historial con signo "+".
- [ ] **11.5 — Calculadora de bultos (en el movimiento):** al elegir tipo "Compra" debe aparecer "¿Entró en bultos?" con "Bultos recibidos" × "Contenido por bulto" → el total calculado y "Usar esta cantidad" debe completar el campo Cantidad.
- [ ] **11.6 — Movimiento de uso:** otro movimiento, tipo "Uso", cantidad menor a la disponible → el stock debe bajar y el historial mostrarlo con signo "−".
- [ ] **11.7 — Baja rechazada por stock insuficiente:** tipo "Merma" con una cantidad mayor a la disponible → debe rechazar con un mensaje de error, **sin** cambiar el stock.
- [ ] **11.8 — Corrección directa:** cambiar el número de "Stock" a mano y "Guardar corrección" (esto no deja historial, a diferencia de un movimiento). Confirmar que se actualiza.
- [ ] **11.9 — Ingresos (alta de stock con precios):** "Farmacia y stock" → "+ Ingresos" → buscar un producto ya existente, cargar cantidad (con la misma calculadora de bultos), precio de compra al proveedor (opcional) y precio de venta al cliente (obligatorio) → "Registrar ingreso". Debe subir el stock y actualizar ambos precios del producto (visibles en su ficha, "por [unidad]").
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
- [ ] **13.3 — Venta común** (`propietario`/`admin`/`recepcion`): tarjeta "Venta común" → si no hay caja abierta, debe ofrecer "Ir a Caja" en vez del formulario. Con caja abierta: buscar un producto (buscador, no `<select>`), cargar cantidad, el precio unitario debe precargarse con el precio actual del producto y el total recalcularse solo. Si se cambia el precio unitario, debe avisar que el precio general del producto va a quedar así, y al guardar el producto debe quedar con ese nuevo precio (verificar en Farmacia).
- [ ] **13.4 — Nuevo turno** (`propietario`/`admin`/`veterinario`/`recepcion`): tarjeta "Nuevo turno" → mismo picker de paciente que 13.1 → elegir una agenda (si hay alguna configurada) debe mostrar los horarios disponibles como botones (los ocupados, tachados/deshabilitados) en vez del campo de hora libre; sin agenda, campo de hora libre. Crear el turno y confirmar que aparece en "Turnos de hoy" si la fecha es hoy.
- [ ] **13.5 — Turnos de hoy:** debajo de las tarjetas, tabla con los turnos de hoy (no cancelados/atendidos) — un turno de otro día no debe aparecer. Click en una fila abre la ficha de ese paciente. Botón "Ver todos los turnos →" navega a la pestaña Turnos.
- [ ] **13.6 — Sin accesos para el rol:** con un usuario que no tenga ninguno de los roles anteriores, el panel debe mostrar "No tenés accesos rápidos disponibles para tu rol" en vez de tarjetas vacías.

---

## Resumen de límites conocidos (no son bugs, son alcance no construido todavía)

- Tropera: sin seguimiento individual por animal (todo es conteo agregado), sin modo offline.
- Farmacia: catálogo cargado a mano (sin importar el vademécum de SENASA), sin fecha de vencimiento por lote ni alertas de stock bajo/vencimiento. La dispensa ligada a consulta (F4.3) ya existe (panel en la ficha del paciente), pero sigue siendo manual (el usuario elige el producto) — no hay un vínculo automático con lo cargado en una vacunación puntual.
- Notificaciones proactivas (email/WhatsApp automático): no existen — "Recordatorios" hay que ir a mirarlo, no avisa solo.
- App móvil: scaffold sin conectar al backend — nada de este protocolo aplica ahí todavía.
