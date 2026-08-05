-- =====================================================================
--  ECOSISTEMA DE SALUD ANIMAL — Esquema de base de datos (PostgreSQL)
--  Tronco común (core) + módulos: tropera, hce, farmacia, stock, facturacion
--
--  Principios de diseño:
--   1) Multi-tenant  : todo dato operativo cuelga de una organizacion_id.
--   2) Offline-first : PK UUID (generables en cliente) + created_at /
--                      updated_at / deleted_at para la sync de WatermelonDB
--                      (soft-delete; nunca se borra físicamente lo sincronizable).
--   3) ID unívoca    : core.animales usa UUID interno + codigo_legible + microchip.
--
--  Nota sobre UUID: se usa gen_random_uuid() por portabilidad. Si corrés
--  PostgreSQL 18+, podés cambiar el DEFAULT a uuidv7() para IDs ordenables
--  por tiempo. WatermelonDB genera los IDs en el cliente igualmente.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- emails case-insensitive

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS tropera;
CREATE SCHEMA IF NOT EXISTS hce;
CREATE SCHEMA IF NOT EXISTS farmacia;
CREATE SCHEMA IF NOT EXISTS stock;
CREATE SCHEMA IF NOT EXISTS facturacion;

-- ---------------------------------------------------------------------
--  Función común: mantiene updated_at en cada UPDATE (se engancha al final)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION core.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
--  Tipos enumerados (conjuntos cerrados y estables)
-- ---------------------------------------------------------------------
CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento', 'clinica', 'mixta');
CREATE TYPE core.rol_membresia     AS ENUM ('propietario', 'admin', 'capataz', 'veterinario', 'recepcion');
CREATE TYPE core.sexo_persona      AS ENUM ('masculino', 'femenino', 'otro');
CREATE TYPE core.sexo_animal       AS ENUM ('macho', 'hembra', 'indefinido');
CREATE TYPE core.estado_animal     AS ENUM ('activo', 'inactivo', 'fallecido');

CREATE TYPE tropera.tipo_movimiento   AS ENUM ('alta', 'baja', 'traslado');
CREATE TYPE tropera.motivo_movimiento AS ENUM ('nacimiento', 'compra', 'muerte', 'venta',
                                               'traslado_interno', 'traslado_externo', 'ajuste');

CREATE TYPE hce.estado_turno AS ENUM ('solicitado', 'confirmado', 'reprogramado',
                                      'cancelado', 'atendido', 'ausente');

CREATE TYPE stock.tipo_producto  AS ENUM ('farmaco', 'insumo', 'alimento', 'otro');
CREATE TYPE stock.tipo_mov_stock AS ENUM ('entrada', 'salida', 'ajuste');

CREATE TYPE facturacion.tipo_comprobante  AS ENUM ('presupuesto', 'remito',
                                                   'factura_a', 'factura_b', 'factura_c');
CREATE TYPE facturacion.estado_comprobante AS ENUM ('borrador', 'emitido', 'anulado');


-- =====================================================================
--  SCHEMA core  — el tronco compartido por todas las soluciones
-- =====================================================================

-- Tenant: la cuenta/negocio (un campo, una clínica, o ambas cosas)
CREATE TABLE core.organizaciones (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      text NOT NULL,
    tipo        core.tipo_organizacion NOT NULL DEFAULT 'clinica',
    cuit        text,
    activo      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);

-- Identidad de acceso (autenticación propia — reemplaza Supabase Auth)
CREATE TABLE core.usuarios (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email             citext NOT NULL UNIQUE,
    password_hash     text NOT NULL,
    nombre            text,
    apellido          text,
    email_verificado  boolean NOT NULL DEFAULT false,
    ultimo_login      timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz
);

-- Un usuario puede pertenecer a varias organizaciones, con un rol en cada una
CREATE TABLE core.membresias (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id       uuid NOT NULL REFERENCES core.usuarios(id) ON DELETE CASCADE,
    organizacion_id  uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    rol              core.rol_membresia NOT NULL,
    activo           boolean NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at       timestamptz,
    UNIQUE (usuario_id, organizacion_id)
);

-- Personas / dueños (los humanos). No todos son usuarios del sistema.
CREATE TABLE core.personas (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id  uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    usuario_id       uuid REFERENCES core.usuarios(id),  -- si además tiene acceso
    dni              text,
    nombre           text NOT NULL,
    apellido         text NOT NULL,
    sexo             core.sexo_persona,
    fecha_nacimiento date,
    celular          text,
    telefono         text,
    email            citext,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at       timestamptz,
    UNIQUE (organizacion_id, dni)
);

-- Catálogo de especies (lookup para no atarse a un ENUM que haya que migrar)
CREATE TABLE core.especies (
    id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo  text NOT NULL UNIQUE,   -- ej. CAN, FEL, BOV, EQU, AVE
    nombre  text NOT NULL
);

-- ANIMAL / PACIENTE — la ficha base compartida (Tropera y HCE la comparten)
CREATE TABLE core.animales (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- ID interno unívoco
    organizacion_id   uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    persona_id        uuid REFERENCES core.personas(id),           -- dueño
    especie_id        uuid NOT NULL REFERENCES core.especies(id),
    -- Identificadores externos (ver algoritmo de ID):
    codigo_legible    text UNIQUE,        -- ESP-PAIS-SECUENCIA-DV (dígito Luhn)
    microchip         text UNIQUE,        -- ISO 11784/11785 (15 dígitos), si existe
    -- Datos base (set mínimo del llenado progresivo):
    nombre            text NOT NULL,
    sexo              core.sexo_animal,
    fecha_nacimiento  date,
    fecha_nac_estimada boolean NOT NULL DEFAULT false,
    foto_url          text,
    estado            core.estado_animal NOT NULL DEFAULT 'activo',
    -- Datos que dependen de la especie (perro, vaca, loro...): esquema flexible
    datos_especificos jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz
);


-- =====================================================================
--  SCHEMA tropera  — gestión ganadera
-- =====================================================================

-- Campos / establecimientos ganaderos (específicos de Tropera)
CREATE TABLE tropera.establecimientos (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id  uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    nombre           text NOT NULL,
    ubicacion        text,
    hectareas        numeric(10,2),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at       timestamptz
);

-- Potreros / lotes dentro de un campo
CREATE TABLE tropera.lotes (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    establecimiento_id  uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
    nombre              text NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);

-- Categorías de hacienda (lookup: vaca, toro, ternero/a, vaquillona, novillo...)
CREATE TABLE tropera.categorias (
    id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo  text NOT NULL UNIQUE,
    nombre  text NOT NULL
);

-- Existencia actual por (establecimiento, lote, categoría) — foto del stock
CREATE TABLE tropera.existencias (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    establecimiento_id  uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
    lote_id             uuid REFERENCES tropera.lotes(id),
    categoria_id        uuid NOT NULL REFERENCES tropera.categorias(id),
    cantidad            integer NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz,
    UNIQUE (establecimiento_id, lote_id, categoria_id)
);

-- Movimientos (ledger): altas, bajas y traslados con metadata
CREATE TABLE tropera.movimientos (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    establecimiento_id     uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
    tipo                   tropera.tipo_movimiento NOT NULL,
    motivo                 tropera.motivo_movimiento NOT NULL,
    categoria_id           uuid REFERENCES tropera.categorias(id),
    cantidad               integer NOT NULL,
    lote_origen_id         uuid REFERENCES tropera.lotes(id),
    lote_destino_id        uuid REFERENCES tropera.lotes(id),
    establecimiento_destino_id uuid REFERENCES tropera.establecimientos(id),
    animal_id              uuid REFERENCES core.animales(id),  -- seguimiento individual (opcional)
    fecha                  date NOT NULL DEFAULT current_date,
    observaciones          text,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),
    deleted_at             timestamptz
);

-- Eventos sanitarios (vacunaciones, tratamientos de rodeo)
CREATE TABLE tropera.eventos_sanitarios (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    establecimiento_id  uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
    tipo                text NOT NULL,               -- ej. vacunacion_aftosa, brucelosis
    producto            text,
    dosis               text,
    categoria_id        uuid REFERENCES tropera.categorias(id),
    lote_id             uuid REFERENCES tropera.lotes(id),
    animal_id           uuid REFERENCES core.animales(id),
    fecha               date NOT NULL DEFAULT current_date,
    observaciones       text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);

-- Eventos reproductivos (entoramiento, tactos)
CREATE TABLE tropera.eventos_reproductivos (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    establecimiento_id  uuid NOT NULL REFERENCES tropera.establecimientos(id) ON DELETE CASCADE,
    tipo                text NOT NULL,               -- ej. entoramiento_inicio, tacto
    categoria_id        uuid REFERENCES tropera.categorias(id),
    animal_id           uuid REFERENCES core.animales(id),
    fecha_inicio        date,
    fecha_fin           date,
    observaciones       text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);


-- =====================================================================
--  SCHEMA hce  — Historia Clínica Electrónica veterinaria
-- =====================================================================

-- Consultas: cada entrada de la historia clínica del paciente
CREATE TABLE hce.consultas (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id   uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    animal_id         uuid NOT NULL REFERENCES core.animales(id),      -- paciente
    veterinario_id    uuid REFERENCES core.usuarios(id),
    fecha             timestamptz NOT NULL DEFAULT now(),
    motivo            text,
    anamnesis         text,
    examen_fisico     text,
    diagnostico       text,
    tratamiento       text,
    peso_kg           numeric(6,2),
    temperatura_c     numeric(4,1),
    observaciones     text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz
);

-- Adjuntos de una consulta (fotos, estudios)
CREATE TABLE hce.consulta_adjuntos (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    consulta_id  uuid NOT NULL REFERENCES hce.consultas(id) ON DELETE CASCADE,
    url          text NOT NULL,
    tipo         text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    deleted_at   timestamptz
);

-- Vacunaciones aplicadas al paciente (con próxima dosis para recordatorios)
CREATE TABLE hce.vacunaciones (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id  uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    animal_id        uuid NOT NULL REFERENCES core.animales(id),
    veterinario_id   uuid REFERENCES core.usuarios(id),
    producto         text,
    vademecum_id     uuid,   -- FK lógica a farmacia.vademecum (se define abajo)
    fecha            date NOT NULL DEFAULT current_date,
    proxima_dosis    date,
    lote_producto    text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at       timestamptz
);

-- Turnero: solicitudes de cita (el dueño las pide desde el portal)
CREATE TABLE hce.turnos (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id  uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    animal_id        uuid REFERENCES core.animales(id),
    persona_id       uuid REFERENCES core.personas(id),   -- solicitante
    veterinario_id   uuid REFERENCES core.usuarios(id),
    fecha_hora       timestamptz NOT NULL,
    estado           hce.estado_turno NOT NULL DEFAULT 'solicitado',
    motivo           text,
    canal            text,   -- portal, telefono, mostrador
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at       timestamptz
);


-- =====================================================================
--  SCHEMA farmacia  — vademécum y dispensa
-- =====================================================================

-- Vademécum: catálogo de referencia (SENASA). Compartido, NO por tenant.
CREATE TABLE farmacia.vademecum (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_senasa        text UNIQUE,
    nombre_comercial     text NOT NULL,
    principio_activo     text,
    familia_farmacologica text,
    laboratorio          text,
    presentacion         text,
    especies_destino     text[],   -- especies para las que está indicado
    indicaciones         text,
    prospecto_url        text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

-- FK diferida de hce.vacunaciones al vademécum (una vez que la tabla existe)
ALTER TABLE hce.vacunaciones
    ADD CONSTRAINT fk_vacunacion_vademecum
    FOREIGN KEY (vademecum_id) REFERENCES farmacia.vademecum(id);

-- Dispensa: uso/entrega de un fármaco, ligado a la consulta y al stock
CREATE TABLE farmacia.dispensas (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id   uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    consulta_id       uuid REFERENCES hce.consultas(id),
    animal_id         uuid REFERENCES core.animales(id),
    producto_stock_id uuid,   -- FK lógica a stock.productos (definida abajo)
    vademecum_id      uuid REFERENCES farmacia.vademecum(id),
    cantidad          numeric(10,2) NOT NULL,
    fecha             date NOT NULL DEFAULT current_date,
    veterinario_id    uuid REFERENCES core.usuarios(id),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz
);


-- =====================================================================
--  SCHEMA stock  — existencias generales (insumos y fármacos)
-- =====================================================================

CREATE TABLE stock.productos (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id  uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    nombre           text NOT NULL,
    tipo             stock.tipo_producto NOT NULL DEFAULT 'insumo',
    vademecum_id     uuid REFERENCES farmacia.vademecum(id),  -- si es un fármaco del vademécum
    unidad           text,               -- ml, comprimido, unidad...
    stock_minimo     numeric(10,2) DEFAULT 0,
    precio_venta     numeric(12,2),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at       timestamptz
);

-- FK diferida de farmacia.dispensas al producto de stock
ALTER TABLE farmacia.dispensas
    ADD CONSTRAINT fk_dispensa_producto
    FOREIGN KEY (producto_stock_id) REFERENCES stock.productos(id);

-- Lotes/partidas con vencimiento
CREATE TABLE stock.lotes_stock (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id  uuid NOT NULL REFERENCES stock.productos(id) ON DELETE CASCADE,
    lote         text,
    vencimiento  date,
    cantidad     numeric(10,2) NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    deleted_at   timestamptz
);

-- Movimientos de stock (entradas, salidas, ajustes)
CREATE TABLE stock.movimientos_stock (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id    uuid NOT NULL REFERENCES stock.productos(id) ON DELETE CASCADE,
    lote_stock_id  uuid REFERENCES stock.lotes_stock(id),
    tipo           stock.tipo_mov_stock NOT NULL,
    cantidad       numeric(10,2) NOT NULL,
    motivo         text,
    referencia_id  uuid,   -- dispensa_id / comprobante_id que originó el movimiento
    fecha          timestamptz NOT NULL DEFAULT now(),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    deleted_at     timestamptz
);


-- =====================================================================
--  SCHEMA facturacion  — comprobantes (interno + ARCA a futuro)
-- =====================================================================

CREATE TABLE facturacion.comprobantes (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id  uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
    persona_id       uuid REFERENCES core.personas(id),   -- cliente
    tipo             facturacion.tipo_comprobante NOT NULL DEFAULT 'presupuesto',
    estado           facturacion.estado_comprobante NOT NULL DEFAULT 'borrador',
    fecha            date NOT NULL DEFAULT current_date,
    punto_venta      integer,
    numero           integer,
    total            numeric(14,2) NOT NULL DEFAULT 0,
    cae              text,        -- CAE de ARCA (ex-AFIP) cuando corresponda
    cae_vencimiento  date,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at       timestamptz
);

CREATE TABLE facturacion.comprobante_items (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    comprobante_id   uuid NOT NULL REFERENCES facturacion.comprobantes(id) ON DELETE CASCADE,
    producto_id      uuid REFERENCES stock.productos(id),
    descripcion      text NOT NULL,
    cantidad         numeric(10,2) NOT NULL DEFAULT 1,
    precio_unitario  numeric(12,2) NOT NULL DEFAULT 0,
    subtotal         numeric(14,2) NOT NULL DEFAULT 0,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at       timestamptz
);


-- =====================================================================
--  ÍNDICES  (claves de tenant, FKs de join y columnas de sincronización)
-- =====================================================================
CREATE INDEX idx_membresias_org        ON core.membresias(organizacion_id);
CREATE INDEX idx_personas_org          ON core.personas(organizacion_id);
CREATE INDEX idx_animales_org          ON core.animales(organizacion_id);
CREATE INDEX idx_animales_persona      ON core.animales(persona_id);
CREATE INDEX idx_animales_especie      ON core.animales(especie_id);
CREATE INDEX idx_animales_updated      ON core.animales(updated_at);     -- sync
CREATE INDEX idx_animales_datos_gin    ON core.animales USING gin (datos_especificos);

CREATE INDEX idx_estab_org             ON tropera.establecimientos(organizacion_id);
CREATE INDEX idx_mov_estab             ON tropera.movimientos(establecimiento_id);
CREATE INDEX idx_mov_updated           ON tropera.movimientos(updated_at);
CREATE INDEX idx_evsan_estab           ON tropera.eventos_sanitarios(establecimiento_id);

CREATE INDEX idx_consultas_org         ON hce.consultas(organizacion_id);
CREATE INDEX idx_consultas_animal      ON hce.consultas(animal_id);
CREATE INDEX idx_consultas_updated     ON hce.consultas(updated_at);
CREATE INDEX idx_turnos_org            ON hce.turnos(organizacion_id);
CREATE INDEX idx_turnos_fecha          ON hce.turnos(fecha_hora);
CREATE INDEX idx_vacunaciones_animal   ON hce.vacunaciones(animal_id);

CREATE INDEX idx_vademecum_activo      ON farmacia.vademecum(principio_activo);
CREATE INDEX idx_dispensas_org         ON farmacia.dispensas(organizacion_id);

CREATE INDEX idx_productos_org         ON stock.productos(organizacion_id);
CREATE INDEX idx_movstock_producto     ON stock.movimientos_stock(producto_id);

CREATE INDEX idx_comprobantes_org      ON facturacion.comprobantes(organizacion_id);


-- =====================================================================
--  TRIGGERS  — enganchar set_updated_at() a toda tabla con updated_at
-- =====================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema IN ('core','tropera','hce','farmacia','stock','facturacion')
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I.%I
         FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();',
      r.table_schema, r.table_name);
  END LOOP;
END $$;


-- =====================================================================
--  DATOS SEMILLA  (mínimos para arrancar)
-- =====================================================================
INSERT INTO core.especies (codigo, nombre) VALUES
    ('CAN', 'Canino'), ('FEL', 'Felino'), ('BOV', 'Bovino'),
    ('EQU', 'Equino'), ('AVE', 'Ave'), ('POR', 'Porcino'),
    ('OVI', 'Ovino'), ('CAP', 'Caprino')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tropera.categorias (codigo, nombre) VALUES
    ('VACA', 'Vaca'), ('TORO', 'Toro'), ('TERN', 'Ternero/a'),
    ('VAQ', 'Vaquillona'), ('NOV', 'Novillo')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================================
--  FIN DEL ESQUEMA
-- =====================================================================
