/**
 * Prueba de InteresadosService (`apps/backend/src/interesados/`): captura de
 * interés para el lanzamiento, con cupo fijo de 10 (ver la constante
 * CUPO_MAXIMO en el service). Sin tabla dependiente de ninguna otra —
 * `plataforma.interesados` no tiene FKs.
 *
 * Correr: pnpm --filter backend test:interesados-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { interesados } from '../src/database/schema/plataforma';
import { InteresadosService } from '../src/interesados/interesados.service';

let ok = 0, fail = 0;
const check = (n: string, c: boolean) => { c ? (ok++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ FALLA: ${n}`)); };

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA plataforma;
    CREATE TABLE plataforma.interesados (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre text NOT NULL, email text, contacto text, nombre_veterinaria text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now());
  `);

  const db = drizzle(client, { schema: { interesados } });
  // Sin RESEND_API_KEY en este entorno, un MailService real ya loguea en vez
  // de enviar — este stub evita instanciar Nest sólo para eso.
  const mailStub = { enviar: async () => {} } as any;
  const service = new InteresadosService(db as any, mailStub);

  console.log('1) cupo() arranca con las 10 plazas disponibles');
  const cupoInicial = await service.cupo();
  check('disponible: true', cupoInicial.disponible === true);
  check('restantes: 10', cupoInicial.restantes === 10);

  console.log('2) crear() registra un interesado y descuenta el cupo');
  await service.crear({ nombre: 'Marta Ruiz', email: 'marta@vet.com', nombreVeterinaria: 'Vet Marta' });
  const cupoTrasUno = await service.cupo();
  check('restantes: 9', cupoTrasUno.restantes === 9);

  console.log('3) llenar el cupo (9 interesados más) y confirmar que se cierra solo');
  for (let i = 0; i < 9; i++) {
    await service.crear({ nombre: `Interesado ${i}`, email: `i${i}@vet.com`, nombreVeterinaria: `Vet ${i}` });
  }
  const cupoLleno = await service.cupo();
  check('restantes: 0', cupoLleno.restantes === 0);
  check('disponible: false', cupoLleno.disponible === false);

  console.log('4) crear() rechaza el número 11 con un mensaje claro, no un 500 genérico');
  let rechazado = false;
  try {
    await service.crear({ nombre: 'Once', email: 'once@vet.com', nombreVeterinaria: 'Vet Once' });
  } catch (e: any) {
    rechazado = e?.status === 409 && typeof e?.message === 'string' && e.message.includes('10');
  }
  check('rechaza con 409 y menciona el cupo', rechazado);
  const cupoTrasRechazo = await service.cupo();
  check('el rechazado no descontó cupo (sigue en 0, no negativo)', cupoTrasRechazo.restantes === 0);

  console.log('5) listar() trae los 10 registrados, más reciente primero');
  const lista = await service.listar();
  check('son exactamente 10', lista.length === 10);
  check('el primero es el último insertado (Interesado 8)', lista[0]?.nombre === 'Interesado 8');
  check('el más viejo (Marta) queda al final', lista[lista.length - 1]?.nombre === 'Marta Ruiz');

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
