import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations';

/**
 * v1 → v2: suma personas/animales/consultas/vacunaciones/turnos (HCE).
 * v2 → v3: seguimiento individual de Fase E — 8 tablas nuevas de tropera
 * + 5 columnas nuevas en `eventos` (ver nota en schema.ts sobre lo que
 * quedó afuera: plantilla_items/protocolo_iatf_pasos/evaluaciones_andrologicas).
 * v3 → v4: `personas.domicilio`.
 * Sólo creación de tablas nuevas — nada de lo existente (tropera.*) cambia.
 */
export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'personas',
          columns: [{ name: 'domicilio', type: 'string', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'eventos',
          columns: [
            { name: 'animal_campo_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'retiro_hasta', type: 'string', isOptional: true },
            { name: 'hallazgo_id', type: 'string', isOptional: true },
            { name: 'resultado_reproductivo', type: 'string', isOptional: true },
            { name: 'toro_virtual_id', type: 'string', isOptional: true },
          ],
        }),
        createTable({
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
        createTable({
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
        createTable({
          name: 'hallazgos',
          columns: [
            { name: 'organizacion_id', type: 'string', isIndexed: true },
            { name: 'nombre', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
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
        createTable({
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
        createTable({
          name: 'plantillas_tareas',
          columns: [
            { name: 'organizacion_id', type: 'string', isIndexed: true },
            { name: 'nombre', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'protocolos_iatf',
          columns: [
            { name: 'organizacion_id', type: 'string', isIndexed: true },
            { name: 'nombre', type: 'string' },
            { name: 'descripcion', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
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
      ],
    },
    {
      toVersion: 2,
      steps: [
        createTable({
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
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
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
        createTable({
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
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
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
        createTable({
          name: 'turnos',
          columns: [
            { name: 'organizacion_id', type: 'string', isIndexed: true },
            { name: 'animal_id', type: 'string', isOptional: true, isIndexed: true },
            { name: 'persona_id', type: 'string', isOptional: true },
            { name: 'veterinario_id', type: 'string', isOptional: true },
            { name: 'fecha_hora', type: 'number' },
            { name: 'estado', type: 'string' },
            { name: 'motivo', type: 'string', isOptional: true },
            { name: 'canal', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
  ],
});
