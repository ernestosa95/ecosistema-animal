-- 0001_solicitudes.sql
-- Auto-registro con aprobación: solicitudes de registro/acceso.
-- Idempotente: seguro de aplicar sobre una base existente.

CREATE TABLE IF NOT EXISTS core.solicitudes (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo                    text NOT NULL,                       -- 'crear' | 'unirse'
    estado                  text NOT NULL DEFAULT 'pendiente',   -- 'pendiente' | 'aprobada' | 'rechazada'
    nombre                  text NOT NULL,
    apellido                text NOT NULL,
    email                   text NOT NULL,
    password_hash           text NOT NULL,
    telefono                text,
    nombre_organizacion     text,                                -- para tipo 'crear'
    tipo_organizacion       text,                                -- para tipo 'crear'
    organizacion_solicitada text,                                -- para tipo 'unirse' (texto libre)
    motivo_rechazo          text,
    created_at              timestamptz NOT NULL DEFAULT now(),
    resolved_at             timestamptz,
    resolved_por            uuid REFERENCES core.usuarios(id)
);
