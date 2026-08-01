"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const codigo_legible_util_1 = require("./codigo-legible.util");
let ok = 0, fail = 0;
function check(nombre, cond) {
    if (cond) {
        ok++;
        console.log(`  ✓ ${nombre}`);
    }
    else {
        fail++;
        console.log(`  ✗ FALLA: ${nombre}`);
    }
}
console.log('1) Generación y round-trip');
const c1 = (0, codigo_legible_util_1.generarCodigoLegible)('CAN', 12345, 'AR');
console.log(`     ejemplo -> ${c1}`);
check('genera formato ESP-PAIS-SEQ-DV', /^[A-Z]{3}-AR-[0-9A-Z]{6}-[0-9A-Z]$/.test(c1));
check('el código generado es válido', (0, codigo_legible_util_1.validarCodigoLegible)(c1));
const p1 = (0, codigo_legible_util_1.parsearCodigoLegible)(c1);
check('parsea la especie', p1.especie === 'CAN');
check('parsea el país', p1.pais === 'AR');
check('recupera la secuencia original', p1.secuencia === 12345);
console.log('2) El DV detecta errores');
const partes = c1.split('-');
const seqCorrupta = partes[2].split('');
seqCorrupta[0] = seqCorrupta[0] === 'A' ? 'B' : 'A';
const corrupto = `${partes[0]}-${partes[1]}-${seqCorrupta.join('')}-${partes[3]}`;
check('rechaza un carácter alterado', !(0, codigo_legible_util_1.validarCodigoLegible)(corrupto));
const c2 = (0, codigo_legible_util_1.generarCodigoLegible)('BOV', 987654, 'AR');
const pz = c2.split('-');
const s = pz[2].split('');
if (s[2] !== s[3]) {
    const t = s[2];
    s[2] = s[3];
    s[3] = t;
}
const transp = `${pz[0]}-${pz[1]}-${s.join('')}-${pz[3]}`;
check('detecta transposición adyacente', s[2] === s[3] || !(0, codigo_legible_util_1.validarCodigoLegible)(transp));
console.log('3) Unicidad entre especies con misma secuencia');
const a = (0, codigo_legible_util_1.generarCodigoLegible)('CAN', 42, 'AR');
const b = (0, codigo_legible_util_1.generarCodigoLegible)('FEL', 42, 'AR');
check('distinta especie -> distinto código', a !== b);
console.log('4) Robustez de generación en volumen');
let todosValidos = true;
const vistos = new Set();
for (let i = 1; i <= 5000; i++) {
    const cod = (0, codigo_legible_util_1.generarCodigoLegible)('EQU', i, 'AR');
    if (!(0, codigo_legible_util_1.validarCodigoLegible)(cod))
        todosValidos = false;
    vistos.add(cod);
}
check('5000 códigos consecutivos válidos', todosValidos);
check('5000 códigos son únicos', vistos.size === 5000);
console.log('5) Entradas inválidas');
check('rechaza especie con números', (() => { try {
    (0, codigo_legible_util_1.generarCodigoLegible)('C4N', 1);
    return false;
}
catch {
    return true;
} })());
check('rechaza secuencia negativa', (() => { try {
    (0, codigo_legible_util_1.generarCodigoLegible)('CAN', -1);
    return false;
}
catch {
    return true;
} })());
check('parseo de basura -> null', (0, codigo_legible_util_1.parsearCodigoLegible)('no-es-un-codigo') === null);
console.log('6) Microchip ISO e identificador externo');
check('microchip 15 dígitos válido', (0, codigo_legible_util_1.validarMicrochipISO)('941000024630000'));
check('microchip corto inválido', !(0, codigo_legible_util_1.validarMicrochipISO)('9410000'));
check('microchip con letras inválido', !(0, codigo_legible_util_1.validarMicrochipISO)('941000024ABC000'));
check('prioriza microchip sobre código', (0, codigo_legible_util_1.resolverIdentificadorExterno)('941000024630000', c1) === '941000024630000');
check('usa código si no hay microchip', (0, codigo_legible_util_1.resolverIdentificadorExterno)(null, c1) === c1);
check('null si no hay ninguno válido', (0, codigo_legible_util_1.resolverIdentificadorExterno)('123', 'xx') === null);
console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
process.exit(fail === 0 ? 0 : 1);
//# sourceMappingURL=codigo-legible.util.spec.js.map