import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations';

/**
 * v1 → v2: suma personas/animales/consultas/vacunaciones/turnos (HCE).
 * Sólo creación de tablas nuevas — nada de lo existente (tropera.*) cambia.
 */
export const migrations = schemaMigrations({
  migrations: [
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
