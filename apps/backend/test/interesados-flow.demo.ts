/**
 * Prueba de InteresadosService (`apps/backend/src/interesados/`): captura de
 * interés para el lanzamiento, con cupo fijo de 10 (ver la constante
 * CUPO_MAXIMO en el service), más el flujo de activación (invitarTodos /
 * datosActivacion / activar) que convierte un interesado en cuenta real.
 *
 * Correr: pnpm --filter backend test:interesados-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { JwtService } from '@nestjs/jwt';
import * as core from '../src/database/schema/core';
import * as plataforma from '../src/database/schema/plataforma';
import { InteresadosService } from '../src/interesados/interesados.service';

let ok = 0, fail = 0;
const check = (n: string, c: boolean) => { c ? (ok++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ FALLA: ${n}`)); };

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core;
    CREATE SCHEMA plataforma;
    CREATE TYPE core.rol_membresia AS ENUM ('propietario', 'admin', 'capataz', 'veterinario', 'recepcion');
    CREATE TABLE plataforma.interesados (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre text NOT NULL, email text, contacto text, nombre_veterinaria text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE core.organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      huella_activa boolean NOT NULL DEFAULT true, tropera_activa boolean NOT NULL DEFAULT false, cuit text, direccion text, localidad text, provincia text, telefono text, email text,
      activo boolean NOT NULL DEFAULT true,
      grupo_id uuid, plan_id uuid, acceso_hasta timestamptz, fecha_activacion timestamptz, es_demo boolean NOT NULL DEFAULT false, logo_url text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL,
      nombre text, apellido text, dni text, email_verificado boolean NOT NULL DEFAULT false, ultimo_login timestamptz, password_changed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
    CREATE TABLE core.membresias (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id uuid NOT NULL REFERENCES core.usuarios(id) ON DELETE CASCADE,
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      rol core.rol_membresia[] NOT NULL, activo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
  `);

  const db = drizzle(client, { schema: { ...core, ...plataforma } });
  // Sin RESEND_API_KEY en este entorno, un MailService real ya loguea en vez
  // de enviar — este stub evita instanciar Nest sólo para eso, y deja
  // inspeccionar qué se intentó mandar.
  const enviados: Array<{ destinatario: string; asunto: string }> = [];
  const mailStub = { enviar: async (destinatario: string, asunto: string) => { enviados.push({ destinatario, asunto }); } } as any;
  const jwt = new JwtService({ secret: 'secreto-de-prueba' });
  // emitirTokens() real de AuthService no hace falta acá — ya está cubierto
  // por auth-demo; sólo importa que activar() lo llame y use lo que devuelve.
  const authStub = { emitirTokens: (sub: string, email: string) => ({ accessToken: `access-${sub}`, refreshToken: `refresh-${sub}`, email }) } as any;
  const service = new InteresadosService(db as any, mailStub, jwt, authStub);

  console.log('1) cupo() arranca con las 10 plazas disponibles');
  const cupoInicial = await service.cupo();
  check('disponible: true', cupoInicial.disponible === true);
  check('restantes: 10', cupoInicial.restantes === 10);

  console.log('2) crear() registra un interesado y descuenta el cupo');
  await service.crear({ nombre: 'Marta Ruiz', email: 'marta@vet.com', nombreVeterinaria: 'Vet Marta' });
  const cupoTrasUno = await service.cupo();
  check('restantes: 9', cupoTrasUno.restantes === 9);
  check('mandó la confirmación (sin SUPERADMIN_EMAILS en este entorno, no hay aviso a admin)', enviados.length === 1);

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

  console.log('6) editar() corrige un dato a mano sin borrar el registro');
  const marta = lista[lista.length - 1]!;
  await service.editar(marta.id, { celular: '3441234567' });
  const listaTrasEditar = await service.listar();
  check('el celular quedó cargado', listaTrasEditar.find((i) => i.id === marta.id)?.celular === '3441234567');
  check('el email no se tocó', listaTrasEditar.find((i) => i.id === marta.id)?.email === 'marta@vet.com');

  console.log('7) invitarTodos() manda el link sólo a los que tienen email');
  enviados.length = 0;
  const resultadoInvitacion = await service.invitarTodos();
  check('enviados: 10 (todos tienen email)', resultadoInvitacion.enviados === 10);
  check('se mandaron 10 mails', enviados.length === 10);

  console.log('8) datosActivacion()/activar() con el token real emitido arriba, de punta a punta');
  // El link que se mandó no queda expuesto por invitarTodos() (por diseño —
  // sólo se sabe cuántos se mandaron) así que se firma uno nuevo acá mismo,
  // exactamente como lo haría el mail real.
  const tokenMarta = jwt.sign({ sub: marta.id, scope: 'activar_interesado' }, { expiresIn: '30d' });
  const datos = await service.datosActivacion(tokenMarta);
  check('precarga nombre/veterinaria/email correctos', datos.nombre === 'Marta Ruiz' && datos.email === 'marta@vet.com' && datos.nombreVeterinaria === 'Vet Marta');

  const sesion = await service.activar({ token: tokenMarta, apellido: 'Ruiz', password: 'unaPassword123' });
  check('devuelve tokens de sesión', typeof sesion.accessToken === 'string' && sesion.accessToken.length > 0);
  check('devuelve organizacionId', typeof sesion.organizacionId === 'string');
  check('roles: propietario', JSON.stringify(sesion.roles) === JSON.stringify(['propietario']));
  check('huellaActiva por default', sesion.huellaActiva === true);

  const [usuarioCreado] = await db.select().from(core.usuarios).where(eq(core.usuarios.email, 'marta@vet.com'));
  check('el usuario quedó creado con el nombre del interesado', usuarioCreado?.nombre === 'Marta Ruiz' && usuarioCreado?.apellido === 'Ruiz');
  const [orgCreada] = await db.select().from(core.organizaciones).where(eq(core.organizaciones.id, sesion.organizacionId));
  check('la organización tomó el nombre de la veterinaria', orgCreada?.nombre === 'Vet Marta');

  console.log('9) activar() con el mismo token de nuevo rechaza (ya existe la cuenta), no duplica nada');
  let yaExisteRechazado = false;
  try {
    await service.activar({ token: tokenMarta, apellido: 'Ruiz', password: 'otraPassword123' });
  } catch (e: any) {
    yaExisteRechazado = e?.status === 409;
  }
  check('rechaza con 409', yaExisteRechazado);
  const usuariosConEseEmail = await db.select().from(core.usuarios).where(eq(core.usuarios.email, 'marta@vet.com'));
  check('sigue habiendo un solo usuario con ese email', usuariosConEseEmail.length === 1);

  console.log('10) activar() con un token trucho/vencido rechaza con un mensaje claro');
  let tokenInvalidoRechazado = false;
  try {
    await service.activar({ token: 'esto-no-es-un-jwt', apellido: 'X', password: 'unaPassword123' });
  } catch (e: any) {
    tokenInvalidoRechazado = e?.status === 400;
  }
  check('rechaza con 400', tokenInvalidoRechazado);

  console.log('11) eliminar() saca el registro y libera el cupo');
  const cupoAntesDeEliminar = await service.cupo();
  const interesadoEliminado = lista[0]!;
  await service.eliminar(interesadoEliminado.id);
  const cupoTrasEliminar = await service.cupo();
  check('el cupo subió en 1', cupoTrasEliminar.restantes === cupoAntesDeEliminar.restantes + 1);
  let noEncontrado = false;
  try {
    await service.eliminar(interesadoEliminado.id);
  } catch (e: any) {
    noEncontrado = e?.status === 404;
  }
  check('eliminar de nuevo el mismo id da 404, no rompe', noEncontrado);

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
