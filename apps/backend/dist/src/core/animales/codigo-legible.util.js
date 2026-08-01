"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarCodigoLegible = generarCodigoLegible;
exports.parsearCodigoLegible = parsearCodigoLegible;
exports.validarCodigoLegible = validarCodigoLegible;
exports.validarMicrochipISO = validarMicrochipISO;
exports.resolverIdentificadorExterno = resolverIdentificadorExterno;
const ALFABETO = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = ALFABETO.length;
const LARGO_SECUENCIA = 6;
function valorDe(caracter) {
    const v = ALFABETO.indexOf(caracter.toUpperCase());
    if (v === -1)
        throw new Error(`Carácter inválido para base36: "${caracter}"`);
    return v;
}
function caracterDe(valor) {
    return ALFABETO[valor];
}
function calcularDV(payload) {
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
function dvValido(payloadConDV) {
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
function generarCodigoLegible(especieCodigo, secuencia, pais = 'AR') {
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
function parsearCodigoLegible(codigo) {
    const limpio = codigo.trim().toUpperCase();
    const m = limpio.match(/^([A-Z]{2,4})-([A-Z]{2})-([0-9A-Z]+)-([0-9A-Z])$/);
    if (!m)
        return null;
    const [, especie, pais, seq, dv] = m;
    const payloadConDV = `${especie}${pais}${seq}${dv}`;
    if (!dvValido(payloadConDV))
        return null;
    return {
        especie,
        pais,
        secuencia: parseInt(seq, 36),
        dv,
        completo: limpio,
    };
}
function validarCodigoLegible(codigo) {
    return parsearCodigoLegible(codigo) !== null;
}
function validarMicrochipISO(microchip) {
    return /^\d{15}$/.test(microchip.trim());
}
function resolverIdentificadorExterno(microchip, codigoLegible) {
    if (microchip && validarMicrochipISO(microchip))
        return microchip.trim();
    if (codigoLegible && validarCodigoLegible(codigoLegible)) {
        return codigoLegible.trim().toUpperCase();
    }
    return null;
}
//# sourceMappingURL=codigo-legible.util.js.map