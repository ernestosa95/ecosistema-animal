// apps/backend/src/common/facturacion.util.ts
// Extraído de admin/admin.service.ts para poder reusarlo también desde
// core/organizacion/ (el propio propietario viendo su vencimiento), sin
// duplicar la lógica de fechas en dos lugares.

/** Primer día (00:00 UTC) del mes calendario que contiene `fecha`. */
export function inicioDeMes(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
}

/** `fecha` truncada a día (00:00 UTC), sin hora — para comparar sólo fechas. */
export function inicioDeDia(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
}

/**
 * Próxima fecha de facturación: mismo día-del-mes que `activacion`, la
 * primera ocurrencia que no sea anterior a `hoy` (comparando sólo fechas,
 * no hora — si hoy es justo el día de facturación, vence hoy, no el mes que
 * viene). Si el mes no tiene ese día (ej. activación el 31 y el mes tiene
 * 30) se clampea al último día del mes.
 */
export function proximoVencimiento(activacion: Date, hoy: Date): Date {
  const dia = activacion.getUTCDate();
  const hoyDia = inicioDeDia(hoy);
  const candidato = (año: number, mes: number) => {
    const ultimoDia = new Date(Date.UTC(año, mes + 1, 0)).getUTCDate();
    return new Date(Date.UTC(año, mes, Math.min(dia, ultimoDia)));
  };
  const esteMes = candidato(hoyDia.getUTCFullYear(), hoyDia.getUTCMonth());
  return esteMes >= hoyDia ? esteMes : candidato(hoyDia.getUTCFullYear(), hoyDia.getUTCMonth() + 1);
}
