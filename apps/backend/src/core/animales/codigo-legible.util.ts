/**
 * Identificación unívoca del paciente — código legible del carnet.
 *
 * Formato:  ESP-PAIS-SECUENCIA-DV      ej.  CAN-AR-0009IX-3  (secuencia 12345)
 *
 *   ESP        Código de especie (core.especies.codigo): CAN, FEL, BOV, ...
 *   PAIS       ISO 3166-1 alpha-2 (por defecto AR)
 *   SECUENCIA  Secuencia global en base36, en MAYÚSCULAS, con padding fijo.
 *              El número lo entrega una secuencia de Postgres (ver .sql al pie),
 *              por eso el código se asigna en el backend al crear el animal.
 *   DV         Dígito verificador (Luhn mod 36) sobre ESP+PAIS+SECUENCIA.
 *              Detecta errores de tipeo y la mayoría de las transposiciones al
 *              cargar el código a mano desde un carnet.
 *
 * Separación de responsabilidades:
 *   - El `id` UUID de core.animales es la identidad interna (se genera offline).
 *   - `codigo_legible` es una etiqueta amigable que asigna el servidor, lo que
 *     permite garantizar unicidad global mediante la secuencia.
 *   - Si el animal tiene microchip ISO, ese es el identificador externo natural
 *     (ver resolverIdentificadorExterno).
 */

const ALFABETO = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // base36
const BASE = ALFABETO.length; // 36
const LARGO_SECUENCIA = 6; // ancho fijo del bloque de secuencia en el carnet

function valorDe(caracter: string): number {
  const v = ALFABETO.indexOf(caracter.toUpperCase());
  if (v === -1) throw new Error(`Carácter inválido para base36: "${caracter}"`);
  return v;
}

function caracterDe(valor: number): string {
  return ALFABETO[valor];
}

/**
 * Calcula el dígito verificador (Luhn mod 36) de una cadena alfanumérica.
 * Generalización del algoritmo de Luhn para el alfabeto base36.
 */
function calcularDV(payload: string): string {
  let factor = 2;
  let suma = 0;
  for (let i = payload.length - 1; i >= 0; i--) {
    let addend = factor * valorDe(payload[i]);
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / BASE) + (addend % BASE);
    suma += addend;
  }
  const resto = suma % BASE;
  const dv = (BASE - resto) % BASE;
  return caracterDe(dv);
}

/**
 * Verifica el DV de un payload que YA incluye el dígito verificador al final.
 */
function dvValido(payloadConDV: string): boolean {
  let factor = 1;
  let suma = 0;
  for (let i = payloadConDV.length - 1; i >= 0; i--) {
    let addend = factor * valorDe(payloadConDV[i]);
    factor = factor === 1 ? 2 : 1;
    addend = Math.floor(addend / BASE) + (addend % BASE);
    suma += addend;
  }
  return suma % BASE === 0;
}

export interface CodigoLegible {
  especie: string;
  pais: string;
  secuencia: number;
  dv: string;
  completo: string;
}

/**
 * Genera el código legible a partir del código de especie y el número de
 * secuencia (obtenido de la secuencia de Postgres en el backend).
 */
export function generarCodigoLegible(
  especieCodigo: string,
  secuencia: number,
  pais: string = 'AR',
): string {
  if (!/^[A-Z]{2,4}$/.test(especieCodigo.toUpperCase())) {
    throw new Error(`Código de especie inválido: "${especieCodigo}"`);
  }
  if (!Number.isInteger(secuencia) || secuencia < 0) {
    throw new Error(`Secuencia inválida: ${secuencia}`);
  }
  if (!/^[A-Z]{2}$/.test(pais.toUpperCase())) {
    throw new Error(`País inválido (se espera ISO alpha-2): "${pais}"`);
  }

  const esp = especieCodigo.toUpperCase();
  const pa = pais.toUpperCase();
  const seq = secuencia.toString(36).toUpperCase().padStart(LARGO_SECUENCIA, '0');

  const payload = `${esp}${pa}${seq}`;
  const dv = calcularDV(payload);

  return `${esp}-${pa}-${seq}-${dv}`;
}

/**
 * Parsea y valida un código legible. Devuelve null si el formato o el DV fallan.
 */
export function parsearCodigoLegible(codigo: string): CodigoLegible | null {
  const limpio = codigo.trim().toUpperCase();
  const m = limpio.match(/^([A-Z]{2,4})-([A-Z]{2})-([0-9A-Z]+)-([0-9A-Z])$/);
  if (!m) return null;

  const [, especie, pais, seq, dv] = m;
  const payloadConDV = `${especie}${pais}${seq}${dv}`;
  if (!dvValido(payloadConDV)) return null;

  return {
    especie,
    pais,
    secuencia: parseInt(seq, 36),
    dv,
    completo: limpio,
  };
}

/** Atajo booleano: ¿es un código legible válido (formato + DV)? */
export function validarCodigoLegible(codigo: string): boolean {
  return parsearCodigoLegible(codigo) !== null;
}

/**
 * Valida un microchip ISO 11784/11785: 15 dígitos numéricos.
 * (Los 3 primeros son el código de país o del fabricante).
 */
export function validarMicrochipISO(microchip: string): boolean {
  return /^\d{15}$/.test(microchip.trim());
}

/**
 * Identificador externo a mostrar/priorizar: si hay microchip ISO válido, ese
 * es el identificador natural; si no, el código legible generado.
 */
export function resolverIdentificadorExterno(
  microchip: string | null | undefined,
  codigoLegible: string | null | undefined,
): string | null {
  if (microchip && validarMicrochipISO(microchip)) return microchip.trim();
  if (codigoLegible && validarCodigoLegible(codigoLegible)) {
    return codigoLegible.trim().toUpperCase();
  }
  return null;
}
