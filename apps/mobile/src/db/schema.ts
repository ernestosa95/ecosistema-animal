import { appSchema, tableSchema } from '@nozbe/watermelondb';

// Espeja las tablas registradas en el motor de sync del backend
// (apps/backend/src/sync/sync.core.ts): personas/animales/consultas/
// vacunaciones/turnos de core+hce (v1→v2), las 4 de `tropera` F1.1-F1.6 (v1)
// y el seguimiento individual de Fase E (v2→v3: animales_campo/potreros/
// hallazgos/toros_virtuales/muestras/tareas/plantillas_tareas/protocolos_iatf
// + columnas nuevas en `eventos`).
// NO están acá (y por lo tanto no sincronizan a mobile): `plantilla_items`,
// `protocolo_iatf_pasos` y `evaluaciones_andrologicas` — les falta
// updated_at/deleted_at en el schema del backend (son filas hijas
// inmutables), y el motor de sync genérico asume esas columnas en toda
// tabla registrada. Sumarlas requeriría antes esa migración de backend,
// que es una decisión de alcance aparte, no sólo "capa de datos".
// Farmacia se sumó en v5 (ver más abajo). Caja sigue afuera (desk/online por
// diseño, no tiene un flujo rápido offline equivalente) al igual que
// `hce.macros`/indicaciones (ayuda de escritorio, bajo valor offline).
// v3→v4: `personas.domicilio` (agregado al backend a pedido del usuario).
// v4→v5: Farmacia (productos/stock/movimientos_stock) — antes deliberadamente
// afuera ("desk/online por diseño"), se suma para el flujo de Venta rápida
// offline del Home. Caja sigue afuera (no tiene equivalente de captura rápida
// offline todavía).
// v5→v6: `consultas.costo` (monto cobrado, por defecto 0) — mismo campo que
// ya era obligatorio en el alta web desde 2026-09-03, le faltaba a este
// schema y al alta offline del Home/ficha.
// v6→v7: `turnos.agenda_id` + tabla nueva `agendas` (sólo lectura en la
// práctica — mobile no tiene UI para crear/editar agendas, se sincroniza
// nada más para poder saber si la agenda de un turno tiene profesional
// asignado — "Atender" en `(app)/turnos.tsx` sólo abre la ficha con
// "Nueva consulta" para agendas médicas, no para una "no médica" como
// peluquería). No se suman `agenda_bloques`/`agenda_excepciones`: mobile no
// necesita horarios/slots, sólo saber si HAY un profesional.
// Nombres de columna en snake_case porque así los serializa
// `serializeRow`/`valoresParaEscribir` (contrato = objeto WatermelonDB, no
// el camelCase de Drizzle).
export const schema = appSchema({
  version: 7,
  tables: [
    tableSchema({
      name: 'personas',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'dni', type: 'string', isOptional: true },
        { name: 'nombre', type: 'string' },
        { name: 'apellido', type: 'string' },
        { name: 'sexo', type: 'string', isOptional: true },
        { name: 'fecha_nacimiento', type: 'string', isOptional: true },
        { name: 'celular', type: 'string', isOptional: true },
        { name: 'telefono', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'domicilio', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'animales',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'persona_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'especie_id', type: 'string', isIndexed: true },
        { name: 'codigo_legible', type: 'string', isOptional: true },
        { name: 'microchip', type: 'string', isOptional: true },
        { name: 'nombre', type: 'string' },
        { name: 'sexo', type: 'string', isOptional: true },
        { name: 'fecha_nacimiento', type: 'string', isOptional: true },
        { name: 'fecha_nac_estimada', type: 'boolean' },
        { name: 'foto_url', type: 'string', isOptional: true },
        { name: 'estado', type: 'string' },
        { name: 'datos_especificos', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'consultas',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'animal_id', type: 'string', isIndexed: true },
        { name: 'veterinario_id', type: 'string', isOptional: true },
        { name: 'fecha', type: 'number' },
        { name: 'motivo', type: 'string', isOptional: true },
        { name: 'anamnesis', type: 'string', isOptional: true },
        { name: 'examen_fisico', type: 'string', isOptional: true },
        { name: 'diagnostico', type: 'string', isOptional: true },
        { name: 'tratamiento', type: 'string', isOptional: true },
        { name: 'peso_kg', type: 'number', isOptional: true },
        { name: 'temperatura_c', type: 'number', isOptional: true },
        { name: 'observaciones', type: 'string', isOptional: true },
        { name: 'costo', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'vacunaciones',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'animal_id', type: 'string', isIndexed: true },
        { name: 'veterinario_id', type: 'string', isOptional: true },
        { name: 'producto', type: 'string', isOptional: true },
        { name: 'vademecum_id', type: 'string', isOptional: true },
        { name: 'fecha', type: 'string' },
        { name: 'proxima_dosis', type: 'string', isOptional: true },
        { name: 'lote_producto', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'turnos',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'animal_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'persona_id', type: 'string', isOptional: true },
        { name: 'veterinario_id', type: 'string', isOptional: true },
        { name: 'agenda_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'fecha_hora', type: 'number' },
        { name: 'estado', type: 'string' },
        { name: 'motivo', type: 'string', isOptional: true },
        { name: 'canal', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'agendas',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'nombre', type: 'string' },
        // null = agenda sin profesional asignado ("no médica", ej. peluquería).
        { name: 'usuario_id', type: 'string', isOptional: true },
        { name: 'duracion_turno_minutos', type: 'number' },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'activa', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'establecimientos',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'ubicacion', type: 'string', isOptional: true },
        { name: 'superficie_ha', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'existencias',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'establecimiento_id', type: 'string', isIndexed: true },
        { name: 'categoria', type: 'string' },
        { name: 'cantidad', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'movimientos',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'tipo', type: 'string' },
        { name: 'categoria', type: 'string' },
        { name: 'cantidad', type: 'number' },
        { name: 'establecimiento_origen_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'establecimiento_destino_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'fecha', type: 'string' },
        { name: 'observaciones', type: 'string', isOptional: true },
        { name: 'usuario_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'eventos',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'establecimiento_id', type: 'string', isIndexed: true },
        { name: 'tipo', type: 'string' },
        { name: 'categoria', type: 'string', isOptional: true },
        { name: 'cantidad', type: 'number', isOptional: true },
        { name: 'producto', type: 'string', isOptional: true },
        { name: 'fecha', type: 'string' },
        { name: 'observaciones', type: 'string', isOptional: true },
        { name: 'usuario_id', type: 'string', isOptional: true },
        // Fase E (v3).
        { name: 'animal_campo_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'retiro_hasta', type: 'string', isOptional: true },
        { name: 'hallazgo_id', type: 'string', isOptional: true },
        { name: 'resultado_reproductivo', type: 'string', isOptional: true },
        { name: 'toro_virtual_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    // ---- Fase E: seguimiento individual (v3) ----
    tableSchema({
      name: 'animales_campo',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'establecimiento_id', type: 'string', isIndexed: true },
        { name: 'caravana', type: 'string' },
        { name: 'caravana_definitiva', type: 'boolean' },
        { name: 'categoria', type: 'string' },
        { name: 'potrero_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'sexo', type: 'string', isOptional: true },
        { name: 'estado', type: 'string' },
        { name: 'fecha_alta', type: 'string' },
        { name: 'observaciones', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'potreros',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'establecimiento_id', type: 'string', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'superficie_ha', type: 'number', isOptional: true },
        { name: 'capacidad_cabezas', type: 'number', isOptional: true },
        { name: 'observaciones', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'hallazgos',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'toros_virtuales',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'raza', type: 'string', isOptional: true },
        { name: 'proveedor', type: 'string', isOptional: true },
        { name: 'observaciones', type: 'string', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'muestras',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'establecimiento_id', type: 'string', isIndexed: true },
        { name: 'animal_campo_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'caravana', type: 'string', isOptional: true },
        { name: 'tubo_numero', type: 'number' },
        { name: 'tipo_muestra', type: 'string', isOptional: true },
        { name: 'fecha', type: 'string' },
        { name: 'observaciones', type: 'string', isOptional: true },
        { name: 'usuario_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'plantillas_tareas',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'protocolos_iatf',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'tareas',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'establecimiento_id', type: 'string', isIndexed: true },
        { name: 'animal_campo_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'protocolo_id', type: 'string', isOptional: true },
        { name: 'descripcion', type: 'string' },
        { name: 'producto', type: 'string', isOptional: true },
        { name: 'fecha_programada', type: 'string' },
        { name: 'estado', type: 'string' },
        { name: 'observaciones', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    // ---- Farmacia (v5) ----
    tableSchema({
      name: 'productos',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'nombre', type: 'string' },
        { name: 'presentacion', type: 'string', isOptional: true },
        { name: 'unidad', type: 'string', isOptional: true },
        { name: 'categoria', type: 'string', isOptional: true },
        { name: 'es_medicamento', type: 'boolean' },
        { name: 'es_fraccionable', type: 'boolean' },
        { name: 'concentracion', type: 'number', isOptional: true },
        { name: 'unidad_concentracion', type: 'string', isOptional: true },
        { name: 'dosis_sugerida_mg_kg', type: 'number', isOptional: true },
        { name: 'precio', type: 'number', isOptional: true },
        { name: 'precio_compra', type: 'number', isOptional: true },
        { name: 'activo', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'stock',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'producto_id', type: 'string', isIndexed: true },
        { name: 'cantidad', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'movimientos_stock',
      columns: [
        { name: 'organizacion_id', type: 'string', isIndexed: true },
        { name: 'producto_id', type: 'string', isIndexed: true },
        { name: 'tipo', type: 'string' },
        { name: 'cantidad', type: 'number' },
        { name: 'fecha', type: 'string' },
        { name: 'observaciones', type: 'string', isOptional: true },
        { name: 'consulta_id', type: 'string', isOptional: true },
        { name: 'usuario_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
