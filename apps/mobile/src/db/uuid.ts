/**
 * El generador de ids por defecto de WatermelonDB produce strings alfanuméricos
 * de 16 caracteres, no UUIDs — pero las columnas `id` del backend son `uuid` en
 * Postgres. Sin esto, cualquier alta hecha offline falla al sincronizar con
 * "invalid input syntax for type uuid" (ver apps/backend/.../db-error.filter.ts,
 * que lo traduce a un 404 "Recurso no encontrado" confuso).
 *
 * Usar así en cada `.create((r) => { r._raw.id = uuid(); ... })` — hay que
 * pisar `_raw.id` dentro del callback de creación, antes de que WatermelonDB
 * persista la fila, para reemplazar el id que ya le asignó por defecto.
 */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
