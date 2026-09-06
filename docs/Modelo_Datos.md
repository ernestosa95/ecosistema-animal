# 🗃️ Modelo de datos — relaciones entre schemas

> No existía este documento. `Estructura_Proyecto.md` ya lo señalaba: se había pensado un
> `db/schema/esquema_ecosistema.sql` como DDL de referencia de todos los schemas, pero nunca se
> creó — la fuente de verdad real siempre fue (y sigue siendo) el código Drizzle en
> `apps/backend/src/database/schema/*.ts` (`core.ts`, `hce.ts`, `tropera.ts`, `farmacia.ts`,
> `caja.ts`, `plataforma.ts`). Este documento es una **foto derivada** de esos archivos para
> entender rápido qué se relaciona con qué — si hay una duda puntual sobre un campo, tipo o
> default exacto, el `.ts` manda. Generado el 2026-09-05; si el schema cambia de forma
> significativa (tabla nueva, FK nueva, un patrón de referencia lógica nuevo), conviene
> actualizar este archivo en el mismo cambio — igual que se hace con `CHANGELOG.md`.

---

## 1. El patrón que se repite en todos lados

- **Multi-tenant por `organizacion_id`**: casi toda tabla de negocio (no los catálogos globales,
  ver más abajo) tiene una columna `organizacion_id` con `ON DELETE CASCADE` hacia
  `core.organizaciones`. El aislamiento entre organizaciones no depende de que cada query se
  acuerde de filtrar — lo fuerza `TenantGuard` en el borde HTTP (header `X-Organizacion-Id`,
  nunca en el body) antes de que el request llegue al service.
- **Soft delete + `updated_at` en casi todo**: `deleted_at` nullable en vez de `DELETE` real, y
  `updated_at` que se toca en cada `UPDATE`. No es sólo estilo — es lo que el motor de
  `sync/` (pull/push offline del mobile) necesita para saber qué cambió desde la última
  sincronización. Las pocas tablas sin esto (`cobros`, `egresos`, `pagos`,
  `evaluaciones_andrologicas`, `plantilla_items`, `protocolo_iatf_pasos`, `mensajes_leidos`,
  `eventos_uso`, `vademecum_senasa`) son ledgers que nunca se editan ni se borran una vez
  creados, o tablas fuera del alcance de `/sync` hoy.
- **Patrón "agregado + ledger"**: se repite en `tropera` (`existencias` = conteo actual,
  `movimientos` = historial que lo ajusta en la misma transacción) y en `farmacia` (`stock` +
  `movimientos_stock`, mismo criterio). La corrección directa sobre el agregado (sin pasar por
  el ledger) es una acción distinta y deliberadamente sin auditoría — no confundirlas.
- **Catálogos GLOBALES, sin `organizacion_id`**: `core.especies`, `hce.catalogo_vacunas`,
  `hce.catalogo_diagnosticos`, `farmacia.vademecum_senasa`. Son compartidos por toda la
  plataforma, de sólo lectura para las organizaciones, y en los tres casos de HCE/Farmacia son
  **sugerencias para autocompletar un campo de texto libre**, nunca una restricción ni una FK
  real desde la tabla que los usa.
- **Referencias lógicas (sin FK real a nivel DB)**: cuando dos schemas se importarían en
  círculo, o cuando el vínculo es deliberadamente flojo, la columna existe pero no hay
  `.references()` — ver la tabla de la sección 4. Esto importa para pruebas: la base **no** va a
  rechazar un `plan_id` inventado, hay que confiar en que el service lo validó.
- **Roles apilables**: `core.membresias.roles` es un arreglo de `core.rol_membresia`
  (`propietario`/`admin`/`capataz`/`veterinario`/`recepcion`), no una tabla intermedia — un
  usuario puede tener más de un rol en la misma organización sin cuentas separadas.

---

## 2. Mapa general (a nivel schema)

```mermaid
flowchart LR
  ORG[("core.organizaciones")]

  subgraph CORE["core"]
    USR[usuarios]
    MEM[membresias]
    PER[personas]
    ANI[animales]
    ESP["especies (global)"]
    SOL[solicitudes]
  end

  subgraph HCE["hce"]
    CONS[consultas]
    VAC[vacunaciones]
    TUR[turnos]
    AGE[agendas]
  end

  subgraph TROPERA["tropera"]
    EST[establecimientos]
  end

  subgraph FARMACIA["farmacia"]
    PRO[productos]
  end

  subgraph CAJA["caja"]
    CJA[cajas]
  end

  subgraph PLATAFORMA["plataforma"]
    PLN[planes]
    PAG[pagos]
    GRP[grupos_organizaciones]
  end

  ORG === MEM
  ORG === PER
  ORG === ANI
  ORG -->|"organizacion_id\nON DELETE CASCADE\n(todas las tablas del schema)"| CONS
  ORG -->|ídem| EST
  ORG -->|ídem| PRO
  ORG -->|ídem| CJA
  ORG -.->|"plan_id / grupo_id\nreferencia LÓGICA, sin FK"| PLN
  ORG -.->|ídem| GRP
  PLN -->|"organizacion_id\nON DELETE CASCADE"| PAG
```

Detalle real (todas las FK, con cardinalidad) por schema en las secciones 3 a 8.

---

## 3. `core` — tronco común

```mermaid
erDiagram
  ORGANIZACIONES ||--o{ MEMBRESIAS : "organizacion_id"
  USUARIOS ||--o{ MEMBRESIAS : "usuario_id"
  ORGANIZACIONES ||--o{ PERSONAS : "organizacion_id"
  USUARIOS |o--o{ PERSONAS : "usuario_id (opcional)"
  ORGANIZACIONES ||--o{ ANIMALES : "organizacion_id"
  PERSONAS |o--o{ ANIMALES : "persona_id (opcional, dueño)"
  ESPECIES ||--o{ ANIMALES : "especie_id"
  USUARIOS |o--o{ SOLICITUDES : "resolved_por (opcional)"

  ORGANIZACIONES {
    uuid id PK
    text nombre
    boolean huella_activa
    boolean tropera_activa
    text logo_url "sin dueño de mascota, marca Huella por default"
    uuid plan_id "referencia LOGICA a plataforma.planes"
    uuid grupo_id "referencia LOGICA a plataforma.grupos_organizaciones"
    timestamp acceso_hasta "null = sin vencimiento"
    timestamp fecha_activacion "base del cálculo de facturación"
  }
  USUARIOS {
    uuid id PK
    text email UK
    text password_hash
    timestamp password_changed_at "invalida links de reset viejos"
  }
  MEMBRESIAS {
    uuid id PK
    uuid usuario_id FK
    uuid organizacion_id FK
    rol_membresia rol "array — roles apilables"
    boolean activo
  }
  PERSONAS {
    uuid id PK
    uuid organizacion_id FK
    uuid usuario_id FK "opcional"
    text dni
    text nombre
  }
  ESPECIES {
    uuid id PK
    text codigo UK
    text nombre
  }
  ANIMALES {
    uuid id PK
    uuid organizacion_id FK
    uuid persona_id FK "opcional, dueño"
    uuid especie_id FK
    text codigo_legible UK
    text microchip UK
    jsonb datos_especificos "catálogo por especie, sólo en el frontend"
  }
  SOLICITUDES {
    uuid id PK
    text estado "pendiente/aprobada/rechazada"
    uuid plan_id "referencia LOGICA a plataforma.planes"
    uuid resolved_por FK "usuarios.id, opcional"
  }
```

**Nota**: `ESPECIES` es global (sin `organizacion_id`) — todas las organizaciones comparten el
mismo catálogo de especies, sembrado una vez (`db:seed`).

---

## 4. Referencias lógicas (sin FK real) — la lista completa

Estas columnas existen y se usan, pero Postgres **no** las valida — la integridad depende del
service. Todas nacen del mismo motivo: evitar un ciclo de imports entre los `schema/*.ts`
(un archivo que ya importa de otro no puede a la vez ser importado por él con una FK real hacia
atrás), salvo la última, que es una decisión de acoplamiento flojo explícita.

| Columna | "Apunta" a | Por qué no hay FK real |
|---|---|---|
| `core.organizaciones.plan_id` | `plataforma.planes.id` | `plataforma.ts` importa de `core.ts`; una FK en sentido inverso crearía un ciclo. |
| `core.organizaciones.grupo_id` | `plataforma.grupos_organizaciones.id` | Ídem. |
| `core.solicitudes.plan_id` | `plataforma.planes.id` | Ídem — se traslada tal cual a `organizaciones.plan_id` al aprobar. |
| `hce.vacunaciones.vademecum_id` | `farmacia.productos.id` | Ídem (y además: dispensar quedó ligado a la consulta, no a la vacunación puntual — ver F4.3 en `hce/`). |

Al probar algo que dependa de una de estas columnas, tené presente que la base **va a aceptar
un UUID que no existe** — sólo el código (`AdminService`, `SolicitudesService`) lo valida antes
de guardar.

---

## 5. `hce` — historia clínica electrónica

```mermaid
erDiagram
  ORGANIZACIONES ||--o{ CONSULTAS : "organizacion_id"
  ANIMALES ||--o{ CONSULTAS : "animal_id"
  USUARIOS |o--o{ CONSULTAS : "veterinario_id"

  ANIMALES ||--o{ VACUNACIONES : "animal_id"
  USUARIOS |o--o{ VACUNACIONES : "veterinario_id"

  ESPECIES ||--o{ CATALOGO_VACUNAS : "especie_id"
  ESPECIES ||--o{ CATALOGO_DIAGNOSTICOS : "especie_id"

  ORGANIZACIONES ||--o{ MACROS : "organizacion_id"

  ORGANIZACIONES ||--o{ INDICACIONES : "organizacion_id"
  CONSULTAS ||--o{ INDICACIONES : "consulta_id"
  ANIMALES ||--o{ INDICACIONES : "animal_id (denormalizado)"
  PRODUCTOS |o--o{ INDICACIONES : "producto_id (si origen=stock_interno)"

  ORGANIZACIONES ||--o{ AGENDAS : "organizacion_id"
  USUARIOS |o--o{ AGENDAS : "usuario_id (null = sin profesional)"
  AGENDAS ||--o{ AGENDA_BLOQUES : "agenda_id"
  AGENDAS ||--o{ AGENDA_EXCEPCIONES : "agenda_id"

  ORGANIZACIONES ||--o{ TURNOS : "organizacion_id"
  ANIMALES |o--o{ TURNOS : "animal_id"
  PERSONAS |o--o{ TURNOS : "persona_id (solicitante)"
  AGENDAS |o--o{ TURNOS : "agenda_id (opcional)"

  CONSULTAS {
    uuid id PK
    uuid organizacion_id FK
    uuid animal_id FK
    uuid veterinario_id FK "opcional"
    numeric costo "obligatorio a nivel DTO, no genera cobro automático en caja"
  }
  VACUNACIONES {
    uuid id PK
    uuid animal_id FK
    text producto "texto libre — ya cubre desparasitaciones, no hay `tipo` separado"
    uuid vademecum_id "referencia LOGICA, ver sección 4"
    date proxima_dosis
    timestamp recordatorio_descartado_en
  }
  INDICACIONES {
    uuid id PK
    uuid consulta_id FK
    uuid animal_id FK "denormalizado, el portal consulta sin pasar por consultas"
    origen_indicacion origen "stock_interno | receta_externa"
    uuid producto_id FK "sólo si origen=stock_interno"
  }
  AGENDAS {
    uuid id PK
    uuid usuario_id FK "opcional, null = agenda no médica (ej. peluquería)"
  }
  TURNOS {
    uuid id PK
    uuid animal_id FK "opcional"
    uuid persona_id FK "opcional"
    uuid agenda_id FK "opcional — turno sin agenda queda 100% libre"
    estado_turno estado
  }
```

`CATALOGO_VACUNAS`/`CATALOGO_DIAGNOSTICOS` son catálogos globales (por especie, no por
organización) — sólo alimentan sugerencias en `vacunaciones.producto`/`consultas.diagnostico`,
que siguen siendo texto libre sin FK hacia el catálogo.

---

## 6. `tropera` — ganadería

```mermaid
erDiagram
  ORGANIZACIONES ||--o{ ESTABLECIMIENTOS : "organizacion_id"
  ESTABLECIMIENTOS ||--o{ POTREROS : "establecimiento_id"
  ESTABLECIMIENTOS ||--o{ EXISTENCIAS : "establecimiento_id"
  ESTABLECIMIENTOS |o--o{ MOVIMIENTOS : "establecimiento_origen_id"
  ESTABLECIMIENTOS |o--o{ MOVIMIENTOS : "establecimiento_destino_id"
  ESTABLECIMIENTOS ||--o{ ANIMALES_CAMPO : "establecimiento_id"
  POTREROS |o--o{ ANIMALES_CAMPO : "potrero_id (opcional)"
  ORGANIZACIONES ||--o{ HALLAZGOS : "organizacion_id"
  ORGANIZACIONES ||--o{ TOROS_VIRTUALES : "organizacion_id"
  ESTABLECIMIENTOS ||--o{ EVENTOS : "establecimiento_id"
  ANIMALES_CAMPO |o--o{ EVENTOS : "animal_campo_id (opcional)"
  HALLAZGOS |o--o{ EVENTOS : "hallazgo_id (opcional)"
  TOROS_VIRTUALES |o--o{ EVENTOS : "toro_virtual_id (opcional)"
  ESTABLECIMIENTOS ||--o{ MUESTRAS : "establecimiento_id"
  ANIMALES_CAMPO |o--o{ MUESTRAS : "animal_campo_id (opcional)"
  ANIMALES_CAMPO ||--o{ EVALUACIONES_ANDROLOGICAS : "animal_campo_id"
  ORGANIZACIONES ||--o{ PLANTILLAS_TAREAS : "organizacion_id"
  PLANTILLAS_TAREAS ||--o{ PLANTILLA_ITEMS : "plantilla_id"
  ORGANIZACIONES ||--o{ PROTOCOLOS_IATF : "organizacion_id"
  PROTOCOLOS_IATF ||--o{ PROTOCOLO_IATF_PASOS : "protocolo_id"
  ESTABLECIMIENTOS ||--o{ TAREAS : "establecimiento_id"
  ANIMALES_CAMPO |o--o{ TAREAS : "animal_campo_id (opcional)"
  PROTOCOLOS_IATF |o--o{ TAREAS : "protocolo_id (opcional)"

  EXISTENCIAS {
    uuid id PK
    uuid establecimiento_id FK
    categoria_hacienda categoria
    integer cantidad "agregado — no hay fila por cabeza"
  }
  MOVIMIENTOS {
    uuid id PK
    tipo_movimiento tipo "nacimiento/compra/muerte/venta/traslado"
    integer cantidad
    uuid establecimiento_origen_id FK "opcional"
    uuid establecimiento_destino_id FK "opcional"
  }
  ANIMALES_CAMPO {
    uuid id PK
    uuid establecimiento_id FK
    text caravana "arranca TEMP-N hasta conciliar"
    boolean caravana_definitiva
    uuid potrero_id FK "opcional"
  }
  EVENTOS {
    uuid id PK
    uuid establecimiento_id FK
    tipo_evento tipo "sanitarios y reproductivos"
    uuid animal_campo_id FK "opcional — NO ajusta existencias"
  }
```

`EXISTENCIAS` (agregado por categoría) y `ANIMALES_CAMPO` (seguimiento individual, Fase E)
conviven **sin reconciliación automática entre ambos** — es un modelo híbrido deliberado, no una
inconsistencia: cargar un animal individual no descuenta el conteo agregado de su categoría.

---

## 7. `farmacia` — vademécum y stock

```mermaid
erDiagram
  ORGANIZACIONES ||--o{ PRODUCTOS : "organizacion_id"
  PRODUCTOS ||--o{ STOCK : "producto_id"
  ORGANIZACIONES ||--o{ STOCK : "organizacion_id"
  PRODUCTOS ||--o{ MOVIMIENTOS_STOCK : "producto_id"
  ORGANIZACIONES ||--o{ MOVIMIENTOS_STOCK : "organizacion_id"
  CONSULTAS |o--o{ MOVIMIENTOS_STOCK : "consulta_id (opcional — F4.3 dispensa)"

  PRODUCTOS {
    uuid id PK
    text categoria "texto libre — closed-list sólo en la UI"
    boolean es_medicamento
    numeric precio
    numeric precio_compra
  }
  MOVIMIENTOS_STOCK {
    uuid id PK
    tipo_movimiento_stock tipo "compra/uso/vencimiento/merma/venta"
    integer cantidad
    uuid consulta_id FK "opcional — 'uso' + consulta_id ES la dispensa"
  }
  VADEMECUM_SENASA {
    uuid id PK
    text certificado "SIN unicidad — ~245 duplicados legítimos en la fuente"
    text nombre_comercial
  }
```

`VADEMECUM_SENASA` es global (7003 filas del registro nacional real), sin relación de datos con
`PRODUCTOS` — es sólo un buscador que autocompleta el nombre al dar de alta un producto propio.

---

## 8. `caja` — mostrador

```mermaid
erDiagram
  ORGANIZACIONES ||--o{ CAJAS : "organizacion_id"
  USUARIOS |o--o{ CAJAS : "abierta_por / cerrada_por / auditada_por_usuario_id"
  CAJAS ||--o{ COBROS : "caja_id"
  USUARIOS |o--o{ COBROS : "usuario_id (quién cobró) / veterinario_id (a quién se imputa)"
  PRODUCTOS |o--o{ COBROS : "producto_id (opcional, venta de mostrador)"
  CONSULTAS |o--o{ COBROS : "consulta_id (trazabilidad opcional)"
  CAJAS ||--o{ EGRESOS : "caja_id"
  USUARIOS |o--o{ EGRESOS : "usuario_id"

  CAJAS {
    uuid id PK
    estado_caja estado "abierta | cerrada"
    estado_auditoria_caja estado_auditoria "null mientras está abierta"
    numeric diferencia "declarado vs. calculado, al cerrar"
  }
  COBROS {
    uuid id PK
    uuid caja_id FK
    uuid veterinario_id FK "opcional — honorarios"
    boolean liquidado
  }
  EGRESOS {
    uuid id PK
    uuid caja_id FK
    text concepto "libre, sin categorías"
  }
```

`COBROS` y `EGRESOS` viven separados a propósito — nunca se listan juntos ni comparten tabla.

---

## 9. `plataforma` — la plataforma en sí, no una organización puntual

```mermaid
erDiagram
  ORGANIZACIONES ||--o{ PAGOS : "organizacion_id (FK real, a diferencia de plan_id/grupo_id)"
  USUARIOS |o--o{ PAGOS : "registrado_por / revisado_por"
  ORGANIZACIONES |o--o{ MENSAJES : "organizacion_id (si destinatario_tipo=organizacion)"
  GRUPOS_ORGANIZACIONES |o--o{ MENSAJES : "grupo_id (si destinatario_tipo=grupo)"
  USUARIOS |o--o{ MENSAJES : "creado_por"
  MENSAJES ||--o{ MENSAJES_LEIDOS : "mensaje_id"
  USUARIOS ||--o{ MENSAJES_LEIDOS : "usuario_id"
  ORGANIZACIONES ||--o{ EVENTOS_USO : "organizacion_id"
  USUARIOS |o--o{ EVENTOS_USO : "usuario_id (ON DELETE SET NULL)"

  PLANES {
    uuid id PK
    jsonb limites_roles "ej. veterinario=2 — rol ausente = sin límite"
    boolean activo "= disponible para altas nuevas"
  }
  PAGOS {
    uuid id PK
    uuid organizacion_id FK
    text estado "pendiente | confirmado | rechazado"
    text comprobante_url "sólo en pagos self-service"
  }
  MENSAJES {
    uuid id PK
    text destinatario_tipo "todas | organizacion | grupo"
  }
  EVENTOS_USO {
    uuid id PK
    tipo_evento_uso tipo "pantalla | accion"
    text nombre "libre, sin catálogo cerrado"
  }
```

Ojo con la asimetría: `plataforma.pagos.organizacion_id` **sí** tiene FK real hacia
`core.organizaciones` (es `plataforma.ts` el que importa de `core.ts`, no al revés) — a
diferencia de `organizaciones.plan_id`/`grupo_id`, que van en sentido contrario y por eso son
lógicas (sección 4). Es fácil confundirlas porque ambas terminan relacionando las mismas dos
tablas.

---

## 10. Dónde mirar si esto no alcanza

- **Un campo puntual, tipo exacto, default**: el `.ts` del schema correspondiente en
  `apps/backend/src/database/schema/`.
- **Qué migración agregó qué**: `db/migrations/*.sql` (nombrados `000N_descripcion.sql`,
  aplicados en orden por `meta/_journal.json`) — o `CHANGELOG.md`, que suele explicar el *por
  qué* de cada uno.
- **Reglas de negocio que no se ven en el schema** (ej. "no se puede dejar la organización sin
  propietario activo", "un movimiento que deja stock negativo se rechaza"): viven en los
  `*.service.ts`, no en la definición de tablas — este documento es sólo de relaciones de datos.
