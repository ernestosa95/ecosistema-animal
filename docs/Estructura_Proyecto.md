# 📁 Estructura del proyecto — Ecosistema de Salud Animal

Organización en **monorepo**: una sola raíz con las aplicaciones (`apps/`) y, a futuro, código compartido (`packages/`). El tronco común (`core`) se escribe una vez y lo reutilizan todas las soluciones.

Gestor de workspaces: **pnpm workspaces** (también funciona con npm workspaces).

**Última actualización:** 2026-09-05. Leyenda: ✅ existe · ⏳ planeado.

> Este documento se auditó contra el código real (no al revés). Versiones previas describían un backend/web más chico que ya quedó atrás — ver `CHANGELOG.md` para el detalle de lo que cambió en cada pasada.
>
> **Nota sobre drift:** entre el 2026-08-30 y el 2026-09-03 el árbol de `apps/web/src/` había quedado desactualizado sin que este documento lo reflejara. Se corrigió esa vez, y en esta pasada (2026-09-05) se sumaron los módulos nuevos de backend/web y **se reescribió por completo la sección de `apps/mobile`**, que hasta ahora describía el scaffold vacío original pese a que la app llevaba semanas siendo un proyecto real (drift de varias semanas, no detectado hasta esta auditoría). **Si algo de acá abajo no coincide con lo que ves en el repo, confiá en el repo, no en este documento**, y considerá pasar `find`/`grep` antes de dar por buena una ruta que citás en una respuesta — la sección de mobile en particular ya demostró que puede quedar desactualizada por mucho tiempo sin que nadie lo note.

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
│   ├── Protocolo_Pruebas.md   # ✅ checklist de pruebas manuales end-to-end desde el navegador
│   ├── Plan_Despliegue.md     # ✅ (2026-09-03) arquitectura de VPS, recursos recomendados, variables
│   │                          #    de entorno de prod, checklist de deploy paso a paso
│   ├── Comercial_Huella.md    # ✅ ficha comercial de Huella (no técnica)
│   └── Comercial_Tropera.md   # ✅ ficha comercial de Tropera (no técnica)
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
│   ├── main.ts                       # ✅ Bootstrap (ValidationPipe, CORS, useStaticAssets para /uploads
│   │                                  #    — ver portal/ más abajo, relativo a process.cwd())
│   ├── app.module.ts                 # ✅ Módulo raíz (registra todos los módulos)
│   │
│   ├── common/
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts      # ✅ Autenticación (Bearer)
│   │   │   ├── tenant.guard.ts        # ✅ Aísla por organizacion_id (multi-tenant)
│   │   │   └── roles.guard.ts         # ✅ Autorización por rol de membresía
│   │   ├── decorators/
│   │   │   ├── current-context.decorator.ts  # ✅ @CurrentUser / @CurrentOrg
│   │   │   └── roles.decorator.ts             # ✅ @Roles(...)
│   │   ├── verificar-limites-roles.ts # ✅ (movido acá 2026-09-03, antes vivía en admin/) función
│   │   │                              #    compartida: rechaza si un alta/cambio de rol superaría el
│   │   │                              #    cupo del plan. La usan admin/ (AdminService) Y core/usuarios/
│   │   │                              #    (alta self-service) — por eso salió de admin/, que core/ no
│   │   │                              #    tenía por qué depender de.
│   │   └── mail/                      # ✅ (nuevo 2026-09-05) mail.service.ts — primer servicio de email
│   │                                  #    del proyecto (Resend SDK, RESEND_API_KEY/MAIL_FROM). Sin API
│   │                                  #    key, loguea el link en vez de enviarlo. Usado hoy sólo por
│   │                                  #    core/auth/ (forgot-password), queda genérico por si hace
│   │                                  #    falta para otra notificación.
│   │
│   ├── config/
│   │   └── configuration.ts          # ✅ Carga de entorno (driver de base, jwt, etc.)
│   │
│   ├── database/
│   │   ├── drizzle.provider.ts        # ✅ Provider DRIZZLE (dev PGlite / prod Postgres)
│   │   └── schema/
│   │       ├── core.ts                # ✅ organizaciones (incl. fechaActivacion), usuarios, membresías,
│   │       │                          #    personas, especies, animales
│   │       ├── hce.ts                 # ✅ consultas (incl. costo), vacunaciones, turnos
│   │       ├── plataforma.ts          # ✅ planes, pagos (2026-09-03), grupos_organizaciones, mensajes
│   │       ├── caja.ts                # ✅ cajas, cobros, egresos
│   │       ├── tropera.ts             # ✅ establecimientos, existencias, movimientos, eventos + Fase E
│   │       ├── farmacia.ts            # ✅ productos, stock, movimientos_stock
│   │       └── index.ts               # ✅ punto único de import de schemas
│   │
│   ├── core/                          # === SCHEMA core ===
│   │   ├── auth/                      # ✅ registro, login, JWT + refresh token (POST /auth/refresh,
│   │   │                              #    stateless, payload {sub, tipo:'refresh'}). Exporta JwtService.
│   │   │                              #    Desde 2026-09-05: POST /auth/forgot-password / reset-password
│   │   │                              #    ("olvidé mi contraseña", públicos) — token JWT con
│   │   │                              #    scope:'reset_password', 30min, invalidado comparando su iat
│   │   │                              #    contra usuarios.password_changed_at (columna nueva). Usa
│   │   │                              #    common/mail/ para el envío.
│   │   ├── especies/                  # ✅ catálogo (GET /especies)
│   │   ├── personas/                  # ✅ dueños (CRUD: crear, listar, obtener, actualizar, /animales)
│   │   ├── animales/                  # ✅ pacientes + codigo-legible.util (CRUD, datosEspecificos JSONB,
│   │   │                              #    fotoUrl — sólo se escribe desde portal/, ver abajo)
│   │   │   └── dto/                   # ✅ create-animal.dto.ts, update-animal.dto.ts
│   │   └── usuarios/                  # ✅ miembros de la org (GET /usuarios) — para asignar turnos y
│   │       └── dto/                   #    para UsuariosPage.tsx. PATCH /usuarios/:id/password (reset,
│   │                                  #    propietario/admin, UI desde 2026-08-28). POST /usuarios
│   │                                  #    (2026-09-03, dto/agregar-miembro.dto.ts): alta SELF-SERVICE de
│   │                                  #    un miembro por la propia organización — respeta el cupo del
│   │                                  #    plan (common/verificar-limites-roles.ts). Distinto del alta
│   │                                  #    vía /admin (super-admin, cualquier organización). GET
│   │                                  #    /usuarios/limites-plan expone cupo/usados por rol (wizard).
│   │
│   ├── hce/                            # === SCHEMA hce ===
│   │   ├── consultas/                 # ✅ historia clínica: alta, historial, edición (PATCH) y borrado
│   │   │                              #    (DELETE, soft delete) por animal. anamnesis/examenFisico/
│   │   │                              #    temperaturaC/costo (obligatorio en el alta desde 2026-09-03,
│   │   │                              #    0 = cortesía) ya expuestos en el formulario web.
│   │   ├── vacunaciones/              # ✅ registro + recordatorios, con UI en la ficha del paciente
│   │   ├── turnos/                    # ✅ turnero (agenda, estados, veterinarioId)
│   │   ├── carnet/                    # ✅ PDF del paciente (@react-pdf/renderer), datos reales vía Drizzle
│   │   ├── catalogo-vacunas/          # ✅ (nuevo 2026-09-04) GET /hce/catalogo-vacunas?especieId= — catálogo
│   │   │                              #    de referencia global (sugerencias, no restringe el campo libre
│   │   │                              #    "producto" de vacunaciones). Sin módulo propio, registrado
│   │   │                              #    flat en hce.module.ts.
│   │   ├── catalogo-diagnosticos/     # ✅ (nuevo 2026-09-04) ídem, para "diagnóstico" de consultas
│   │   │                              #    (GET /hce/catalogo-diagnosticos?especieId=).
│   │   └── portal/                    # ✅ portal PÚBLICO por código legible: GET /portal/c/:codigo, sin
│   │                                  #    guards, sólo lectura (incl. fotoUrl si ya se cargó desde el
│   │                                  #    magic-link — este camino no tiene endpoint de subida, a
│   │                                  #    propósito). OJO: se llama PortalController/Service/Module
│   │                                  #    igual que src/portal/ (abajo) — dos features distintas, mismo nombre.
│   │
│   ├── portal/                        # ✅ portal por MAGIC-LINK: staff emite acceso
│   │   │                              #    (POST /portal/acceso/:personaId, botón en PersonasPage.tsx/
│   │   │                              #    RecordatoriosPage.tsx), el dueño lo usa para ver su resumen
│   │   │                              #    (GET /portal/resumen, TODAS sus mascotas, incl. fotoUrl) y
│   │   │                              #    solicitar turno (POST /portal/turnos). Auth por header
│   │   │                              #    X-Portal-Token (PortalGuard) — no Bearer, no query — aunque
│   │   │                              #    el link en sí lleva el token como ?token= en la URL.
│   │   │                              #    POST /portal/animales/:animalId/foto (2026-09-03, multipart,
│   │   │                              #    multer diskStorage) sube/reemplaza la foto de perfil — verifica
│   │   │                              #    propiedad igual que solicitarTurno(). Guarda en uploads/animales/
│   │   │                              #    relativo a process.cwd() (NO __dirname — en dev, `nest start
│   │   │                              #    --watch` corre el JS de dist/, así que __dirname ahí adentro
│   │   │                              #    apunta a dist/ y el archivo se perdería en el próximo rebuild;
│   │   │                              #    bug real, corregido 2026-09-03, ver CHANGELOG). Servido estático
│   │   │                              #    en /uploads/... (main.ts). BACKEND_PUBLIC_URL (env var) es lo
│   │   │                              #    que queda grabado en fotoUrl — tiene que ser el origen público
│   │   │                              #    real en prod, no localhost.
│   │   └── (mismo aviso de nombre duplicado que hce/portal/ arriba)
│   │
│   ├── admin/                          # ✅ consola de plataforma (SuperAdminGuard / SUPERADMIN_EMAILS):
│   │   │                              #    alta/baja de organizaciones y miembros. resumenPagos()/
│   │   │                              #    gananciasPorPeriodo() (2026-09-03) para la pestaña "Home".
│   │   ├── planes/                    # ✅ CRUD de planes (nombre/precio/límites por rol/activo — activo
│   │   │                              #    dobla como "disponible para altas nuevas", exigido de verdad
│   │   │                              #    desde 2026-09-03 en setAcceso() y en SolicitudesService.crear())
│   │   └── dto/                       # ✅ incl. registrar-pago.dto.ts (2026-09-03)
│   │
│   ├── solicitudes/                    # ✅ alta de cuenta/organización con aprobación: reemplaza el registro
│   │                                  #    directo en el flujo de la web (crear solicitud → aprobar desde
│   │                                  #    /admin). Desde 2026-09-03 el DTO sólo acepta tipo:'crear' (la
│   │                                  #    web sacó la opción "unirse a organización existente" de la UI;
│   │                                  #    el backend conserva la data/aprobación de 'unirse' por si algo
│   │                                  #    quedó pendiente de antes), pide planId obligatorio (valida
│   │                                  #    contra planes.activo) y nombre/apellido/telefono/dni completos.
│   │                                  #    GET /solicitudes/planes (público) lista los disponibles. Al
│   │                                  #    aprobar, planId + fechaActivacion quedan aplicados solos en la
│   │                                  #    organización nueva.
│   │
│   ├── caja/                           # === SCHEMA caja === ✅ (Fase D del spec UI/UX)
│   │   ├── cajas/                     #    una caja diaria por organización; abrir() rechaza si ya hay
│   │   │                              #    una abierta; cerrar() calcula lo esperado vs. arqueo declarado
│   │   │                              #    y decide auditoría automática. GET /caja/cajas/estadisticas
│   │   │                              #    (2026-09-03, propietario/admin): totales del período, por
│   │   │                              #    método de pago, por día — agregado en JS, no SQL.
│   │   ├── cobros/                    #    ingresos; veterinarioId opcional (honorarios). Desde 2026-09-03,
│   │   │                              #    crear() ya NO exige una caja abierta — la abre sola (apertura
│   │   │                              #    rápida, monto inicial $0) si hace falta.
│   │   └── egresos/                   #    aislados de los cobros a propósito, nunca se listan juntos.
│   │                                  #    A diferencia de cobros/, SIGUE exigiendo una caja ya abierta.
│   │
│   ├── sync/                           # ✅ motor de sync offline pull/push, contrato compatible con
│   │                                  #    WatermelonDB synchronize(). Registry (sync.core.ts) cubre
│   │                                  #    personas/animales/consultas/vacunaciones/turnos, TODO
│   │                                  #    tropera.* (establecimientos/existencias/movimientos/eventos +
│   │                                  #    Fase E), y farmacia.* (productos/stock/movimientos_stock) —
│   │                                  #    los `afterCreate` de movimientos/movimientos_stock aplican el
│   │                                  #    mismo ajuste transaccional que el alta online. Consumidor real:
│   │                                  #    apps/mobile, verificado en un dispositivo físico.
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
│       ├── movimientos/                # ✅ ledger compra (alta) / uso, vencimiento, merma (baja,
│       │                              #    rechaza si deja negativo) — ajusta stock EN LA MISMA
│       │                              #    TRANSACCIÓN, mismo patrón que tropera/movimientos/. Roles
│       │                              #    de escritura: propietario/admin/veterinario (sin
│       │                              #    capataz/recepción — es clínico, no de campo ni mostrador).
│       │                              #    `consulta_id` opcional (F4.3, 2026-08-28): un 'uso' con
│       │                              #    consultaId ES la dispensa — no hay entidad nueva. Filtro
│       │                              #    GET /farmacia/movimientos?consultaId=... además del ya
│       │                              #    existente por productoId.
│       └── vademecum-senasa/           # ✅ (nuevo 2026-09-04, módulo propio VademecumSenasaModule)
│                                      #    GET /farmacia/vademecum-senasa?buscar= — catálogo de
│                                      #    referencia global (7003 filas desde un CSV real de SENASA),
│                                      #    sólo sugerencias sobre el campo "nombre" del alta de
│                                      #    producto, nunca restringe a lo que ya está cargado.
│       # Fuera de alcance a propósito: la FK real de hce.vacunaciones.vademecum_id hacia
│       # farmacia.productos.id (hoy sin constraint) — dispensar queda ligado a la consulta, no a
│       # una vacunación puntual.
│
│   ├── analitica/                      # ✅ (nuevo 2026-09-04, schema plataforma) POST /analitica/eventos
│   │                                  #    — insert liso en eventos_uso (tipo pantalla|accion, nombre
│   │                                  #    libre), fire-and-forget desde el cliente. AdminService la
│   │                                  #    agrega (resumenAnalitica()) para la pestaña "Analítica" de
│   │                                  #    AdminPage.tsx.
│   │
├── scripts/
│   ├── init-local-db.mjs             # ✅ crea la base local PGlite: aplica migraciones + siembra
│   │                                 #    (delega el seed en seed-especies.mjs, no lo duplica)
│   ├── seed-especies.mjs             # ✅ siembra core.especies — funciona contra pglite O
│   │                                 #    node-postgres (mismo criterio de DATABASE_DRIVER que
│   │                                 #    drizzle.provider.ts), idempotente. `pnpm db:seed`.
│   │                                 #    Es el paso que `drizzle-kit migrate` no hace por vos.
│   ├── seed-vademecum-senasa.mjs     # ✅ (nuevo 2026-09-04) siembra farmacia.vademecum_senasa desde
│   │                                 #    data/vademecum_senasa.csv. Idempotente (no hace nada si la
│   │                                 #    tabla ya tiene filas). `pnpm db:seed:vademecum`.
│   ├── seed-catalogo-vacunas.mjs     # ✅ (nuevo 2026-09-04) siembra hce.catalogo_vacunas desde
│   │                                 #    data/catalogo-vacunas.json. `pnpm db:seed:vacunas`.
│   └── seed-catalogo-diagnosticos.mjs # ✅ (nuevo 2026-09-04) ídem para hce.catalogo_diagnosticos,
│                                     #    desde data/catalogo-diagnosticos.json. `pnpm db:seed:diagnosticos`.
├── data/                              # ✅ (nuevo 2026-09-04) fuentes de los 3 seeds de arriba, committeadas
│   │                                 #    tal cual las aportó el usuario: vademecum_senasa.csv (CSV real
│   │                                 #    de SENASA), catalogo-vacunas.json, catalogo-diagnosticos.json.
│   └── (vademecum_senasa.csv, catalogo-vacunas.json, catalogo-diagnosticos.json)
├── test/                             # ✅ demos de flujo contra PGlite real
├── drizzle.config.ts                 # ✅
├── .env.example                      # ✅ (creado 2026-09-03 junto con Plan_Despliegue.md — no
│                                     #    existía antes pese a que este documento lo daba por hecho)
└── package.json                      # ✅
```

> Los módulos que usan guards (`JwtAuthGuard`) deben importar `AuthModule` (que exporta `JwtService`). Ej.: `usuarios`, `animales`, `turnos`.

---

## 💻 `apps/web` — React + Vite ✅

Panel de gestión. **CSS propio** (sin framework de estilos). El estado real hoy es por páginas (`pages/`), no por features. La sesión se registra desde `App.tsx` y alimenta a los clientes de API. `main.tsx` rutea por URL, sin librería: `/admin` → consola de plataforma, `?token=` → portal del dueño por magic-link (todas sus mascotas), `/c/{codigo}` (o `?c=`) → portal público del dueño (una mascota), resto → app interna (`App.tsx`).

```
apps/web/
├── src/
│   ├── main.tsx                      # ✅ punto de entrada + ruteo por URL: / → App.tsx, /admin →
│   │                                 #    AdminPage, ?token= → PortalAccesoPage (magic-link), /c/:codigo
│   │                                 #    (o ?c=) → PortalDuenoPage (público, una mascota), ?resetToken=
│   │                                 #    (nuevo 2026-09-05) → ResetPasswordPage ("olvidé mi contraseña")
│   ├── App.tsx                       # ✅ navegación interna (rail por solución Huella/Tropera) + sesión +
│   │                                 #    home según rol + gate del wizard de configuración rápida
│   │                                 #    (bloqueante, primer login del propietario) + TutorialGuiado
│   │                                 #    (overlay no bloqueante, primer login de cualquiera). Sin
│   │                                 #    sesión: /login → LoginPage, resto → LandingPage.tsx (nuevo
│   │                                 #    2026-09-04, marketing pública con precios dinámicos). También
│   │                                 #    dispara la analítica de pantalla centralizada (registrarEvento
│   │                                 #    en un useEffect sobre el nombre de la Vista actual).
│   ├── styles.css                    # ✅ estilos propios (tokens en :root — --verde, --border, --card,
│   │                                 #    etc. — reusados también por el portal, ver pages/portalEstilos.ts)
│   ├── nav/
│   │   └── config.ts                 # ✅ items del rail por solución + los sets ROLES_* (ROLES_CAJA,
│   │                                 #    ROLES_ATIENDEN, ROLES_TURNERO, ...) que gatean nav y componentes
│   ├── api/
│   │   ├── client.ts                 # ✅ cliente HTTP (token + X-Organizacion-Id) — vacunaciones,
│   │   │                            #    consultas (incl. costo), caja/cobros/estadísticas, usuarios
│   │   │                            #    (alta self-service + límites de plan), refresh silencioso ante
│   │   │                            #    un 401 (POST /auth/refresh + reintento único)
│   │   ├── turnos.ts                 # ✅ cliente de turnos + alta rápida de paciente + profesionales +
│   │   │                            #    agendas/bloques/slots + resumen mensual. Mantiene su PROPIA
│   │   │                            #    sesión y su PROPIO refresh silencioso, duplicados a propósito
│   │   │                            #    respecto de client.ts (ver nota)
│   │   ├── admin.ts                  # ✅ cliente de la consola /admin (organizaciones, planes, grupos,
│   │   │                            #    mensajes, resumen de pagos/ganancias)
│   │   ├── solicitudes.ts            # ✅ cliente de alta de cuenta con aprobación + listarPlanesPublicos()
│   │   ├── portal.ts                 # ✅ cliente del portal público por código (sin token ni sesión)
│   │   ├── portalAcceso.ts           # ✅ cliente del portal por magic-link (header X-Portal-Token),
│   │   │                            #    incl. subirFotoPortal()
│   │   └── types.ts                  # ✅ tipos (Sesion, Animal, Persona, Especie, Consulta, Caja,
│   │                                 #    EstadisticasCaja, ...)
│   ├── auth/
│   │   └── useSesion.ts              # ✅ sesión persistente (localStorage)
│   ├── config/
│   │   ├── especieDatos.ts           # ✅ catálogo editable de campos por especie (datosEspecificos)
│   │   └── rolesInfo.ts              # ✅ (2026-09-03) catálogo de qué incluye cada rol — fuente única,
│   │                                 #    reusado por LoginPage.tsx (form de solicitud) y AdminPage.tsx
│   │                                 #    (sección Planes)
│   ├── components/
│   │   ├── CamposEspecie.tsx         # ✅ inputs dinámicos según la especie
│   │   ├── Omnibox.tsx               # ✅ Ctrl+K/Cmd+K, fuzzy match sobre personas/animales (utils/fuzzy.ts)
│   │   ├── DrawerTabla.tsx           # ✅ drawer lateral genérico para el drill-down de tarjetas KPI
│   │   ├── TutorialGuiado.tsx        # ✅ tour interactivo por rol (react-joyride), no bloqueante
│   │   ├── TerminosModal.tsx         # ✅ modal de sólo lectura de términos y condiciones
│   │   ├── SelectorBusqueda.tsx      # ✅ combobox de búsqueda sobre una lista cerrada (reusable)
│   │   ├── BuscadorSenasa.tsx        # ✅ (2026-09-04) búsqueda-con-sugerencias sobre el vademécum SENASA
│   │   │                            #    (farmacia/vademecum-senasa) — campo de texto libre, sugerencias
│   │   │                            #    sólo aparecen si hay algo tipeado, elegir una sólo prellena el
│   │   │                            #    valor (nunca restringe). Mismo patrón que las dos de abajo.
│   │   ├── BuscadorCatalogoVacunas.tsx      # ✅ (2026-09-04) ídem sobre hce.catalogo_vacunas (por especie)
│   │   ├── BuscadorCatalogoDiagnosticos.tsx # ✅ (2026-09-04) ídem sobre hce.catalogo_diagnosticos
│   │   ├── SeleccionarAnimalModal.tsx # ✅ picker de paciente buscar-o-crear-inline, como modal standalone
│   │   ├── VentaRapidaModal.tsx      # ✅ "Venta común" del Home — ya NO exige una caja abierta de
│   │   │                            #    antemano (2026-09-03: el backend la abre sola con el primer cobro)
│   │   ├── NuevoTurnoRapidoModal.tsx # ✅ alta de turno inline desde el Home, sin navegar a Turnos
│   │   ├── FormAltaMiembro.tsx       # ✅ (2026-09-03) form de alta de usuario — checkboxes de rol se
│   │   │                            #    deshabilitan solos si el plan agotó el cupo de ese rol. Usado en
│   │   │                            #    UsuariosPage.tsx y en el paso 1 de WizardConfiguracionRapida.tsx
│   │   ├── InfoRoles.tsx             # ✅ (2026-09-03) bloque colapsable "¿Qué puede hacer cada rol?"
│   │   │                            #    sobre config/rolesInfo.ts
│   │   └── WizardConfiguracionRapida.tsx # ✅ (2026-09-03) wizard de pantalla completa y bloqueante, se
│   │                                #    dispara una vez al primer login de un propietario: alta de
│   │                                #    usuarios → agenda de veterinario(s) → agenda de peluquería →
│   │                                #    fin. Reusa POST /agendas + POST /agendas/:id/bloques ya existentes.
│   ├── utils/
│   │   ├── fuzzy.ts                  # ✅ substring + Levenshtein acotado, para el Omnibox
│   │   ├── columnasTabla.ts          # ✅ tipo ColumnaExport + valorDe(), usado por DrawerTabla.tsx
│   │   │                            #    (reemplazó a utils/exportar.ts, que ya no existe — el centro
│   │   │                            #    de exportación CSV/Excel/PDF se removió app-wide el 2026-09-01)
│   │   └── comprimirImagen.ts        # ✅ (2026-09-03) resize a 800px + recodifica JPEG calidad 0.75 en
│   │                                #    <canvas>, 100% cliente — no hay librería de imágenes en el
│   │                                #    backend, usado antes de subir la foto de perfil del portal
│   └── pages/
│       ├── LandingPage.tsx           # ✅ (nuevo 2026-09-04) marketing pública, mostrada sin sesión y
│       │                            #    fuera de /login (App.tsx). Hero + 3 pasos + features en tabs +
│       │                            #    precios armados dinámicamente desde listarPlanesPublicos() —
│       │                            #    cada plan linkea a /login?plan=<id>.
│       ├── LoginPage.tsx             # ✅ login + alta (crea una `solicitud`, no llama al registro
│       │                            #    directo). El form de alta sólo ofrece "cuenta nueva" (2026-09-03,
│       │                            #    se sacó "unirse a organización existente" de la UI), pide un
│       │                            #    plan obligatorio (con su cupo por rol + <InfoRoles />) y
│       │                            #    datos filiatorios completos. Lee ?plan= de la landing para
│       │                            #    preseleccionarlo. Modo 'olvide' (2026-09-05): sólo pide el
│       │                            #    email y llama a api.olvidePassword().
│       ├── ResetPasswordPage.tsx     # ✅ (nuevo 2026-09-05) atiende ?resetToken= (main.tsx) — formulario
│       │                            #    de contraseña nueva, mismo look que LoginPage.
│       ├── TurnosPage.tsx            # ✅ agenda diaria + calendario del mes + alta desde mostrador (con
│       │                            #    alta de paciente inline) + gestión de agendas/bloques ("⚙ Agendas")
│       ├── PacientesPage.tsx         # ✅ sección "Animales": lista + alta. Si el dueño no existe, se crea
│       │                            #    inline ("＋ Crear dueño nuevo…": nombre/apellido/celular/DNI)
│       │                            #    sin salir del formulario — mismo patrón que usa TurnosPage.
│       ├── PacienteDetallePage.tsx   # ✅ ficha + historia clínica (alta/edición/borrado, con anamnesis/
│       │                            #    examen físico/temperatura/costo, obligatorio desde 2026-09-03)
│       │                            #    + vacunaciones (alta) + datos por especie + carnet + dispensa de
│       │                            #    fármacos por consulta (F4.3, panel inline `DispensaPanel`)
│       ├── PersonasPage.tsx          # ✅ dueños: lista, alta, edición, ver animales, y "Generar acceso
│       │                            #    al portal" (magic-link, ver PortalAccesoPage.tsx)
│       ├── AdminPage.tsx             # ✅ consola de plataforma (ruteada en /admin, login propio de
│       │                            #    super-admin). Pestaña "Home" (2026-09-03, landing del panel):
│       │                            #    pago por organización + ganancias acumuladas por período.
│       │                            #    Pestaña "Planes" suma <InfoRoles /> y el toggle "disponible
│       │                            #    para altas nuevas". Las solicitudes pendientes muestran el
│       │                            #    plan pedido; aprobar refresca sola la lista de organizaciones
│       │                            #    (bug real corregido 2026-09-03 — antes hacía falta recargar la
│       │                            #    página para verla). Pestaña "Analítica" (nuevo 2026-09-04):
│       │                            #    date-range picker + top pantallas/acciones/organizaciones desde
│       │                            #    GET admin/analitica.
│       ├── PortalDuenoPage.tsx       # ✅ portal público del dueño (ruteada en /c/:codigo, una mascota,
│       │                            #    sólo lectura, incl. foto si ya se cargó desde el magic-link)
│       ├── PortalAccesoPage.tsx      # ✅ portal del dueño por magic-link (ruteada en ?token=, TODAS
│       │                            #    sus mascotas + solicitar turno + subir/cambiar foto de perfil
│       │                            #    de cada mascota, 2026-09-03)
│       ├── portalEstilos.ts          # ✅ (2026-09-03) CSS_PORTAL compartido por PortalDuenoPage.tsx y
│       │                            #    PortalAccesoPage.tsx — antes cada uno tenía su propio bloque
│       │                            #    con colores hardcodeados, ahora usan los tokens reales de styles.css
│       ├── RecordatoriosPage.tsx     # ✅ pestaña "Recordatorios" en App.tsx: vencimientos de vacunas +
│       │                            #    turnos próximos, con contacto directo (WhatsApp/llamar) y,
│       │                            #    desde 2026-09-03, "Enviar portal" (genera el magic-link y lo
│       │                            #    manda por WhatsApp o lo copia al portapapeles)
│       ├── TroperaPage.tsx           # ✅ pestaña "Tropera": panel "Stock consolidado" (matriz
│       │                            #    establecimiento × categoría con totales, visible con 2+
│       │                            #    establecimientos) + listado, y por establecimiento: hacienda
│       │                            #    por categoría (conteo agregado) + historial de movimientos
│       │                            #    (nacimiento/compra/muerte/venta/traslado) + historial de
│       │                            #    eventos sanitarios/reproductivos + seguimiento individual
│       │                            #    (Fase E). Visible sólo para propietario/admin/capataz. Sus 18
│       │                            #    puntos de escritura (2026-09-04) están instrumentados con
│       │                            #    api.registrarEvento() — referencia de la convención de nombres
│       │                            #    (`tropera-<entidad>-<verbo>`) si se agrega una acción nueva acá.
│       ├── UsuariosPage.tsx          # ✅ pestaña "Usuarios" (sólo propietario/admin): lista el personal
│       │                            #    de la organización (GET /usuarios), botón "+ Nuevo usuario"
│       │                            #    (2026-09-03, FormAltaMiembro.tsx — antes esta pantalla sólo
│       │                            #    reseteaba contraseñas) y reset de contraseña (específica o
│       │                            #    temporal autogenerada, mostrada una única vez).
│       ├── FarmaciaPage.tsx          # ✅ pestaña "Farmacia y stock" (propietario/admin/veterinario):
│       │                            #    mismo patrón list→detail que TroperaPage.tsx, cubre vademécum
│       │                            #    Y stock general (alimento/accesorios/forraje) + flujo "+ Ingresos"
│       │                            #    (alta de stock con calculadora de bultos + precios)
│       ├── HuellaHomeSection.tsx     # ✅ pestaña "Home" de Huella (reemplazó a DashboardPage.tsx,
│       │                            #    2026-09-01): centro de operaciones (accesos rápidos por rol) +
│       │                            #    "Turnos de hoy" (con botón "Atender" desde 2026-09-03, que
│       │                            #    marca el turno y abre la ficha con la consulta lista) + KPI cards
│       │                            #    con drill-down. `DashboardPage.tsx` YA NO EXISTE.
│       └── CajaPage.tsx              # ✅ pestaña "Caja" (propietario/admin/recepcion para "Caja del
│                                    #    día"; auditoría/honorarios/estadísticas sólo propietario/admin):
│                                    #    caja del día (cobros/egresos/cierre con arqueo), auditoría de
│                                    #    cierres, honorarios, y "Estadísticas" (2026-09-03: totales del
│                                    #    período, por método de pago, por día).
├── index.html                        # ✅
├── vite.config.ts                    # ✅
├── tsconfig.json                     # ✅
├── .env.example                      # ✅ VITE_API_URL
└── package.json                      # ✅
```

> La app le pega al backend vía `VITE_API_URL` (por defecto `http://localhost:3000`). El backend tiene CORS habilitado (abierto a cualquier origen hoy — ver `docs/Plan_Despliegue.md` para la recomendación de restringirlo en producción).

---

## 📱 `apps/mobile` — React Native + Expo 🟡

Ya **no** es el scaffold por defecto de `create-expo-app` — reescrito de punta a punta desde el 2026-08-28, con WatermelonDB conectado al `sync/` del backend, login propio, y (desde 2026-09-04) las pantallas de Huella completas además de Tropera. Verificado en un dispositivo Android físico real, no sólo emulador. Ver la sección **Mobile architecture** de `CLAUDE.md` para los patrones/gotchas no obvios (el redirect-shim de `(app)/index.tsx`, el gotcha de `npx expo install` corriendo `npm` en este monorepo pnpm, el patrón de analítica centralizada) — acá sólo el mapa de archivos. Tiene su propio `apps/mobile/CLAUDE.md`/`AGENTS.md`, que remite a leer la documentación versionada de Expo v57 antes de escribir código ahí.

```
apps/mobile/
├── src/
│   ├── app/                           # Expo Router (file-based)
│   │   ├── _layout.tsx                # ✅ Stack raíz: redirect no-autenticado → /login, autenticado
│   │   │                              #    fuera de (app)/establecimiento/paciente/animales → /(app).
│   │   │                              #    Analítica de pantalla centralizada acá (useSegments()).
│   │   ├── login.tsx                  # ✅ login + "¿Olvidaste tu contraseña?" (2026-09-05, sólo dispara
│   │   │                              #    el pedido — el reset en sí pasa por el navegador, ver auth/
│   │   │                              #    en CLAUDE.md)
│   │   ├── animales.tsx               # ✅ listado/búsqueda de pacientes (sin gate de rol propio)
│   │   ├── (app)/                     # Grupo de rutas con tabs — no aporta segmento de URL
│   │   │   ├── _layout.tsx            # ✅ <Tabs>: home/turnos/establecimientos, cada uno oculto
│   │   │   │                          #    (href: null) si la org no tiene huellaActiva/troperaActiva
│   │   │   ├── index.tsx              # ✅ REDIRECT-SHIM puro — ver CLAUDE.md, no es una pantalla real
│   │   │   ├── home.tsx               # ✅ "Centro de operaciones": accesos rápidos por rol (consulta,
│   │   │   │                          #    vacuna, venta, ingreso de stock, turno), todos instrumentados
│   │   │   ├── turnos.tsx             # ✅ filtro Hoy/Próximos/Todos + botón "Atender" (ROLES_ATIENDEN)
│   │   │   └── establecimientos.tsx   # ✅ listado de Tropera (antes era el index.tsx, renombrado — ver
│   │   │                              #    el bug de routing en CLAUDE.md)
│   │   ├── establecimiento/[id].tsx   # ✅ detalle de Tropera: existencias, movimientos, eventos
│   │   └── paciente/
│   │       ├── nuevo.tsx              # ✅ alta de paciente standalone (vía db/altaPaciente.ts)
│   │       └── [id].tsx               # ✅ ficha: foto (cámara/galería), consultas (campos colapsables,
│   │                                  #    costo con default 0), vacunaciones (con CampoFecha para
│   │                                  #    "próxima dosis", 2026-09-05)
│   ├── auth/
│   │   ├── SesionContext.tsx          # ✅ useSesionContext() — fuente de verdad de la sesión
│   │   └── useSesion.ts               # ✅ persistencia (expo-secure-store)
│   ├── api/
│   │   ├── client.ts                  # ✅ puerto del api/client.ts de la web (mismo pedir()-con-
│   │   │                              #    refresh-silencioso, mismo registrarEvento fire-and-forget).
│   │   │                              #    Incluye especies/catalogoVacunas/catalogoDiagnosticos/
│   │   │                              #    subirFotoAnimal (File.upload nativo, no fetch+FormData —
│   │   │                              #    ver CLAUDE.md) / olvidePassword / pull-push de sync.
│   │   └── useEspecies.ts             # ✅ hook de catálogo de especies
│   ├── db/                            # WatermelonDB — espejo del schema Drizzle del backend
│   │   ├── database.ts                # ✅ instancia de la base local
│   │   ├── schema.ts / migrations.ts  # ✅ schema versionado (v6 a la fecha — costo/vacunación sumaron
│   │   │                              #    columnas sin romper instalaciones viejas)
│   │   ├── sync.ts / SyncContext.tsx  # ✅ synchronize() automático (sin tab manual de "sincronizar")
│   │   ├── useQuery.ts                # ✅ hook de observación reactiva sobre una query WatermelonDB
│   │   ├── uuid.ts                    # ✅ UUID v4 real en el cliente — WatermelonDB genera ids propios
│   │   │                              #    de 16 caracteres, no UUID, y las columnas `id` del backend
│   │   │                              #    son uuid (bug real ya corregido, ver CHANGELOG 2026-08-28)
│   │   ├── altaPaciente.ts            # ✅ alta offline de paciente (+ dueño inline si hace falta),
│   │   │                              #    compartida entre paciente/nuevo.tsx y el acceso rápido del
│   │   │                              #    Home — un solo código para las dos entradas
│   │   ├── altaProducto.ts            # ✅ ídem para producto, desde Venta rápida/Ingreso de stock
│   │   └── models/                    # ✅ un archivo por tabla sincronizada (Animal, Persona, Consulta,
│   │                                  #    Vacunacion, Turno, Producto, Stock, MovimientoStock, y todo
│   │                                  #    Tropera: Establecimiento, Existencia, Movimiento, Evento,
│   │                                  #    AnimalCampo, Potrero, Hallazgo, Muestra, ToroVirtual,
│   │                                  #    PlantillaTarea, ProtocoloIatf, Tarea)
│   ├── components/
│   │   ├── SelectorDueno.tsx          # ✅ búsqueda-o-alta-inline de dueño, siempre resuelve a un id
│   │   │                              #    real o a NUEVO_DUENO + datos completos — dueño obligatorio
│   │   ├── BuscadorCatalogoVacunas.tsx      # ✅ búsqueda-con-sugerencias (mismo patrón que la web:
│   │   ├── BuscadorCatalogoDiagnosticos.tsx #    nada hasta tipear, nunca restringe el texto libre)
│   │   ├── CampoColapsable.tsx        # ✅ (2026-09-04) wrapper de campo colapsable con indicador
│   │   │                              #    lleno/vacío, usado en el formulario de consulta
│   │   ├── CampoFecha.tsx             # ✅ (2026-09-05) selector de fecha nativo
│   │   │                              #    (@react-native-community/datetimepicker)
│   │   ├── FotoAnimal.tsx             # ✅ cámara/galería + compresión + subida nativa
│   │   ├── SeleccionarAnimalModal.tsx # ✅ picker de paciente buscar-o-crear-inline (modal)
│   │   ├── VentaRapida.tsx            # ✅ "Venta común" — con "＋ crear producto nuevo" inline
│   │   ├── IngresoStock.tsx           # ✅ "Ingreso de stock" — ídem, calculadora de bultos
│   │   ├── NuevoTurnoRapido.tsx       # ✅ alta de turno inline
│   │   ├── EncabezadoApp.tsx          # ✅ header custom de los tabs
│   │   ├── OperacionButton.tsx / Card.tsx / Chip.tsx / Field.tsx / Button.tsx / Alerta.tsx / EmptyState.tsx
│   │   │                              # ✅ primitivas visuales compartidas
│   │   └── animated-icon.tsx (+.web.tsx) # ✅ splash animado
│   ├── nav/roles.ts                   # ✅ ROLES_CLINICO/ROLES_CAJA/ROLES_TURNERO/ROLES_ATIENDEN — gates
│   │                                  #    de UI, mismo criterio que la web
│   ├── constants/theme.ts             # ✅ paleta calcada 1:1 de styles.css (mismos hex)
│   └── utils/
│       ├── comprimirImagen.ts         # ✅ resize + recodifica, puerto del equivalente web (canvas → RN)
│       └── fuzzy.ts                   # ✅ mismo matching que la web (Omnibox/buscadores)
├── app.json                            # ✅ config plugins: expo-image-picker, datetimepicker
├── .npmrc                              # ✅ node-linker=hoisted — ver el gotcha de `expo install` en CLAUDE.md
└── package.json
```

---

## 📦 `packages/` — código compartido ⏳

Aún no creado. La idea: `shared-types` (tipos/DTOs backend↔frontends) y `validation` (esquemas reutilizables). Hoy los tipos de la web viven en `apps/web/src/api/types.ts`.

---

## 🗄️ `db/` — base de datos ✅

* **schema/**: vacío. Se referenciaba un `esquema_ecosistema.sql` como DDL de referencia de todos los schemas, pero nunca se creó — el schema real vive únicamente en `apps/backend/src/database/schema/*.ts` (Drizzle) y las migraciones generadas a partir de ahí.
* **migrations/**: generadas con `drizzle-kit generate` a partir de los schemas Drizzle (`000N_*.sql` + carpeta `meta/`). Se aplican con `drizzle-kit migrate` (prod) o con el script `init-local-db.mjs` (dev/PGlite). El `meta/_journal.json` tuvo que reconstruirse desde cero (squash) el 2026-08-28 en `0000_ecosistema_base.sql` porque dos migraciones viejas (`solicitudes`, `organizaciones.activo`) se habían agregado sin pasar por `drizzle-kit generate` y el journal nunca las tuvo registradas; ver `CHANGELOG.md` para el detalle. Desde el squash, `db:generate` viene comportándose normal — van 25 migraciones (`0001` a `0025`) sin volver a pedir el fix manual de journal/rename. Las más recientes (`0020`–`0025`, 2026-09-03) suman `organizaciones.fecha_activacion`, `plataforma.pagos`, `solicitudes.plan_id` y `hce.consultas.costo`, todas aditivas (columnas nullable / tablas nuevas).
  El archivo `0000_ecosistema_base.sql` empieza con `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` (agregado a mano, 2026-08-28) — `gen_random_uuid()` (lo que usan todos los `defaultRandom()` de Drizzle) es nativo recién desde Postgres 13; sin la extensión, `drizzle-kit migrate` falla en cualquier Postgres más viejo. PGlite nunca mostró el problema porque la trae disponible de entrada.
* **seeds**: `apps/backend/scripts/seed-especies.mjs` siembra `core.especies`, funciona contra cualquiera de los dos drivers (`DATABASE_DRIVER=pglite` o `node-postgres`), `pnpm --filter backend db:seed`. `drizzle-kit migrate` no siembra nada — hay que correr `db:seed` aparte después de migrar contra un Postgres real. `init-local-db.mjs` lo reusa (no duplica el `INSERT`).

---

## 🔗 Cómo se conecta todo (hoy)

1. **Backend** (`apps/backend`, puerto 3000): API + base. En dev usa PGlite (sin instalar Postgres); en prod, Postgres real vía `DATABASE_URL`. También sirve `apps/backend/uploads/` como estático en `/uploads/...` (fotos de perfil de mascota subidas desde el portal) — filesystem local, gitignoreado, relativo a `process.cwd()`.
2. **Web** (`apps/web`, puerto 5173): consume la API con el token y el header `X-Organizacion-Id`. La sesión (`{ token, refreshToken, organizacionId, roles }`) se registra en `App.tsx` y de ahí la toman `api/client.ts` y `api/turnos.ts`. Ante un 401, cada cliente intenta `POST /auth/refresh` una vez y avisa a `App.tsx` (`configurarRefrescoSesion`/`configurarRefrescoSesionTurnos`) para persistir el token nuevo — transparente para quien esté usando la app. El portal del dueño y `/admin` tienen sus propios flujos de acceso (código público / login de super-admin), independientes de `useSesion` y sin refresh (sesiones cortas por diseño).
3. **Offline:** el módulo `sync` (pull/push, contrato WatermelonDB) ya está implementado en el backend y usa `updated_at`/`deleted_at`. Lo único que falta para que el ciclo offline funcione es la app móvil consumiéndolo — hoy es un scaffold de Expo sin cliente propio.
4. **Producción:** todavía no hay ningún deploy real — hoy backend y web sólo corren en local (PGlite + dev server). El plan completo (arquitectura de VPS, dominios/subdominios, variables de entorno de producción, proceso de deploy) vive en `docs/Plan_Despliegue.md`.

---

## 🧭 Convenciones

* **Un módulo NestJS por carpeta**, agrupado por schema (`core/`, `hce/`, …).
* **Datos por especie:** se definen en `apps/web/src/config/especieDatos.ts` (frontend) y se guardan en `animales.datos_especificos` (JSONB). Agregar/quitar campos ahí alcanza para que aparezcan en alta, edición y ficha.
* **Roles:** `propietario`, `admin`, `capataz`, `veterinario`, `recepcion`. La organización viaja siempre en el header, nunca en el body.
