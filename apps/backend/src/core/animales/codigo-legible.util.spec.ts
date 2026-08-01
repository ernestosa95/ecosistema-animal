import {
  generarCodigoLegible,
  parsearCodigoLegible,
  validarCodigoLegible,
  validarMicrochipISO,
  resolverIdentificadorExterno,
} from './codigo-legible.util';

let ok = 0, fail = 0;
function check(nombre: string, cond: boolean) {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`); }
  else { fail++; console.log(`  ✗ FALLA: ${nombre}`); }
}

console.log('1) Generación y round-trip');
const c1 = generarCodigoLegible('CAN', 12345, 'AR');
console.log(`     ejemplo -> ${c1}`);
check('genera formato ESP-PAIS-SEQ-DV', /^[A-Z]{3}-AR-[0-9A-Z]{6}-[0-9A-Z]$/.test(c1));
check('el código generado es válido', validarCodigoLegible(c1));
const p1 = parsearCodigoLegible(c1)!;
check('parsea la especie', p1.especie === 'CAN');
check('parsea el país', p1.pais === 'AR');
check('recupera la secuencia original', p1.secuencia === 12345);

console.log('2) El DV detecta errores');
// corromper un carácter del payload
const partes = c1.split('-');
const seqCorrupta = partes[2].split('');
seqCorrupta[0] = seqCorrupta[0] === 'A' ? 'B' : 'A';
const corrupto = `${partes[0]}-${partes[1]}-${seqCorrupta.join('')}-${partes[3]}`;
check('rechaza un carácter alterado', !validarCodigoLegible(corrupto));

// transposición de dos caracteres adyacentes de la secuencia
const c2 = generarCodigoLegible('BOV', 987654, 'AR');
const pz = c2.split('-');
const s = pz[2].split('');
if (s[2] !== s[3]) { const t = s[2]; s[2] = s[3]; s[3] = t; }
const transp = `${pz[0]}-${pz[1]}-${s.join('')}-${pz[3]}`;
check('detecta transposición adyacente', s[2] === s[3] || !validarCodigoLegible(transp));

console.log('3) Unicidad entre especies con misma secuencia');
const a = generarCodigoLegible('CAN', 42, 'AR');
const b = generarCodigoLegible('FEL', 42, 'AR');
check('distinta especie -> distinto código', a !== b);

console.log('4) Robustez de generación en volumen');
let todosValidos = true;
const vistos = new Set<string>();
for (let i = 1; i <= 5000; i++) {
  const cod = generarCodigoLegible('EQU', i, 'AR');
  if (!validarCodigoLegible(cod)) todosValidos = false;
  vistos.add(cod);
}
check('5000 códigos consecutivos válidos', todosValidos);
check('5000 códigos son únicos', vistos.size === 5000);

console.log('5) Entradas inválidas');
check('rechaza especie con números', (() => { try { generarCodigoLegible('C4N', 1); return false; } catch { return true; } })());
check('rechaza secuencia negativa', (() => { try { generarCodigoLegible('CAN', -1); return false; } catch { return true; } })());
check('parseo de basura -> null', parsearCodigoLegible('no-es-un-codigo') === null);

console.log('6) Microchip ISO e identificador externo');
check('microchip 15 dígitos válido', validarMicrochipISO('941000024630000'));
check('microchip corto inválido', !validarMicrochipISO('9410000'));
check('microchip con letras inválido', !validarMicrochipISO('941000024ABC000'));
check('prioriza microchip sobre código', resolverIdentificadorExterno('941000024630000', c1) === '941000024630000');
check('usa código si no hay microchip', resolverIdentificadorExterno(null, c1) === c1);
check('null si no hay ninguno válido', resolverIdentificadorExterno('123', 'xx') === null);

console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
process.exit(fail === 0 ? 0 : 1);
