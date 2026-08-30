/**
 * Flujo de trabajo: Farmacia — vademécum (productos), stock (corrección
 * directa) y movimientos (ledger transaccional que ajusta stock, incluida
 * la dispensa ligada a consulta, F4.3), contra Postgres real (PGlite/WASM).
 * Misma lógica que productos/stock/movimientos .service.ts.
 *
 * Correr:  pnpm --filter backend test:farmacia-demo
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, asc, eq, sql } from 'drizzle-orm';
import { organizaciones, animales, especies } from '../src/database/schema/core';
import { consultas } from '../src/database/schema/hce';
import { productos, stock, movimientosStock } from '../src/database/schema/farmacia';

let ok = 0, fail = 0;
function check(n: string, c: boolean) {
  if (c) { ok++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ FALLA: ${n}`); }
}

const TIPOS_ALTA = new Set(['compra']);

async function main() {
  const client = new PGlite();
  await client.exec(`
    CREATE SCHEMA core;
    CREATE SCHEMA hce;
    CREATE SCHEMA farmacia;
    CREATE TYPE core.tipo_organizacion AS ENUM ('establecimiento','clinica','mixta');
    CREATE TYPE core.sexo_animal AS ENUM ('macho','hembra','indefinido');
    CREATE TYPE core.estado_animal AS ENUM ('activo','inactivo','fallecido');
    CREATE TABLE core.organizaciones (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL,
      tipo core.tipo_organizacion NOT NULL DEFAULT 'clinica', cuit text, direccion text, localidad text, provincia text, telefono text, email text,
      activo boolean NOT NULL DEFAULT true,
      grupo_id uuid, plan_id uuid, acceso_hasta timestamptz, es_demo boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE core.usuarios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL,
      nombre text, apellido text, dni text, email_verificado boolean NOT NULL DEFAULT false, ultimo_login timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE core.especies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo text NOT NULL UNIQUE, nombre text NOT NULL);
    CREATE TABLE core.animales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      especie_id uuid NOT NULL REFERENCES core.especies(id), persona_id uuid,
      codigo_legible text UNIQUE, microchip text UNIQUE, nombre text NOT NULL,
      sexo core.sexo_animal, fecha_nacimiento date, fecha_nac_estimada boolean NOT NULL DEFAULT false,
      foto_url text, estado core.estado_animal NOT NULL DEFAULT 'activo',
      datos_especificos jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE hce.consultas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      animal_id uuid NOT NULL REFERENCES core.animales(id), veterinario_id uuid REFERENCES core.usuarios(id),
      fecha timestamptz NOT NULL DEFAULT now(), motivo text, anamnesis text, examen_fisico text,
      diagnostico text, tratamiento text, peso_kg numeric(6,2), temperatura_c numeric(4,1), observaciones text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE farmacia.productos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      nombre text NOT NULL, presentacion text, unidad text, categoria text,
      concentracion numeric(10,3), unidad_concentracion text, dosis_sugerida_mg_kg numeric(10,3), precio numeric(12,2),
      activo boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    );
    CREATE TABLE farmacia.stock (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      producto_id uuid NOT NULL REFERENCES farmacia.productos(id) ON DELETE CASCADE,
      cantidad integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TYPE farmacia.tipo_movimiento_stock AS ENUM ('compra','uso','vencimiento','merma','venta');
    CREATE TABLE farmacia.movimientos_stock (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES core.organizaciones(id) ON DELETE CASCADE,
      producto_id uuid NOT NULL REFERENCES farmacia.productos(id) ON DELETE CASCADE,
      tipo farmacia.tipo_movimiento_stock NOT NULL, cantidad integer NOT NULL,
      fecha date NOT NULL DEFAULT current_date, observaciones text,
      consulta_id uuid REFERENCES hce.consultas(id), usuario_id uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const db = drizzle(client, { schema: { organizaciones, animales, especies, consultas, productos, stock, movimientosStock } });
  const [orgA] = await db.insert(organizaciones).values({ nombre: 'Clínica A' }).returning();
  const [orgB] = await db.insert(organizaciones).values({ nombre: 'Clínica B' }).returning();
  const [can] = await db.insert(especies).values({ codigo: 'CAN', nombre: 'Canino' }).returning();
  const [firulais] = await db.insert(animales).values({ organizacionId: orgA.id, especieId: can.id, nombre: 'Firulais' }).returning();
  const [consulta] = await db.insert(consultas).values({ organizacionId: orgA.id, animalId: firulais.id, motivo: 'Control' }).returning();

  // ---- Lógica replicada de ProductosService ----
  async function crearProducto(orgId: string, dto: { nombre: string; precio?: number; concentracion?: number; dosisSugeridaMgKg?: number }) {
    const [p] = await db.insert(productos).values({
      organizacionId: orgId, nombre: dto.nombre,
      precio: dto.precio?.toString(), concentracion: dto.concentracion?.toString(), dosisSugeridaMgKg: dto.dosisSugeridaMgKg?.toString(),
    }).returning();
    return p;
  }
  async function listarProductos(orgId: string) {
    return db.select().from(productos).where(and(eq(productos.organizacionId, orgId), eq(productos.activo, true))).orderBy(asc(productos.nombre));
  }

  // ---- Lógica replicada de StockService ----
  async function listarStock(orgId: string) {
    return db.select({
      productoId: productos.id, nombre: productos.nombre,
      cantidad: sql<number>`coalesce(${stock.cantidad}, 0)`.mapWith(Number),
    }).from(productos)
      .leftJoin(stock, and(eq(stock.productoId, productos.id), eq(stock.organizacionId, orgId)))
      .where(and(eq(productos.organizacionId, orgId), eq(productos.activo, true)))
      .orderBy(asc(productos.nombre));
  }
  async function fijarStock(orgId: string, productoId: string, cantidad: number) {
    const [existente] = await db.select({ id: stock.id }).from(stock)
      .where(and(eq(stock.productoId, productoId), eq(stock.organizacionId, orgId))).limit(1);
    if (existente) await db.update(stock).set({ cantidad, updatedAt: new Date() }).where(eq(stock.id, existente.id));
    else await db.insert(stock).values({ organizacionId: orgId, productoId, cantidad });
  }

  // ---- Lógica replicada de MovimientosService (farmacia) ----
  async function crearMovimiento(orgId: string, dto: { productoId: string; tipo: string; cantidad: number; consultaId?: string }) {
    const esAlta = TIPOS_ALTA.has(dto.tipo);
    const delta = esAlta ? dto.cantidad : -dto.cantidad;
    return db.transaction(async (tx) => {
      const [existente] = await tx.select({ id: stock.id, cantidad: stock.cantidad }).from(stock)
        .where(and(eq(stock.productoId, dto.productoId), eq(stock.organizacionId, orgId))).limit(1);
      const actual = existente?.cantidad ?? 0;
      const nueva = actual + delta;
      if (nueva < 0) throw new Error(`Stock insuficiente (hay ${actual})`);
      if (existente) await tx.update(stock).set({ cantidad: nueva, updatedAt: new Date() }).where(eq(stock.id, existente.id));
      else await tx.insert(stock).values({ organizacionId: orgId, productoId: dto.productoId, cantidad: nueva });

      const [mov] = await tx.insert(movimientosStock).values({
        organizacionId: orgId, productoId: dto.productoId, tipo: dto.tipo as any, cantidad: dto.cantidad, consultaId: dto.consultaId,
      }).returning();
      return mov;
    });
  }

  // ============================== Pruebas ==============================
  console.log('1) Productos: alta con datos de la calculadora de dosis y precio');
  const amoxi = await crearProducto(orgA.id, { nombre: 'Amoxicilina 50mg/ml', precio: 45, concentracion: 50, dosisSugeridaMgKg: 10 });
  check('se creó con precio', Number(amoxi.precio) === 45);
  check('se creó con concentración', Number(amoxi.concentracion) === 50);
  const listadoA = await listarProductos(orgA.id);
  check('aparece en el listado de la organización', listadoA.some((p) => p.id === amoxi.id));
  const listadoB = await listarProductos(orgB.id);
  check('no aparece en el listado de otra organización', !listadoB.some((p) => p.id === amoxi.id));

  console.log('2) Stock: arranca en 0 sin cargar nada, fijar es upsert');
  const stockInicial = await listarStock(orgA.id);
  check('el producto recién creado tiene 0 de stock (sin fila en stock)', stockInicial.find((s) => s.productoId === amoxi.id)?.cantidad === 0);
  await fijarStock(orgA.id, amoxi.id, 20);
  await fijarStock(orgA.id, amoxi.id, 25);
  const stockFijado = await listarStock(orgA.id);
  check('fijar dos veces actualiza, no duplica', stockFijado.find((s) => s.productoId === amoxi.id)?.cantidad === 25);

  console.log('3) Movimientos: compra suma, uso/venta restan, rechaza stock negativo');
  await crearMovimiento(orgA.id, { productoId: amoxi.id, tipo: 'compra', cantidad: 10 });
  let stockAmoxi = (await listarStock(orgA.id)).find((s) => s.productoId === amoxi.id)!.cantidad;
  check('compra sumó (25+10=35)', stockAmoxi === 35);

  await crearMovimiento(orgA.id, { productoId: amoxi.id, tipo: 'venta', cantidad: 5 });
  stockAmoxi = (await listarStock(orgA.id)).find((s) => s.productoId === amoxi.id)!.cantidad;
  check('venta de mostrador restó (35-5=30)', stockAmoxi === 30);

  let rechazoNegativo = false;
  try { await crearMovimiento(orgA.id, { productoId: amoxi.id, tipo: 'merma', cantidad: 999 }); } catch { rechazoNegativo = true; }
  check('merma que dejaría stock negativo se rechaza', rechazoNegativo);
  stockAmoxi = (await listarStock(orgA.id)).find((s) => s.productoId === amoxi.id)!.cantidad;
  check('el rechazo no dejó nada aplicado a medias', stockAmoxi === 30);

  console.log('4) Dispensa ligada a consulta (F4.3): un "uso" con consultaId');
  await crearMovimiento(orgA.id, { productoId: amoxi.id, tipo: 'uso', cantidad: 2, consultaId: consulta.id });
  stockAmoxi = (await listarStock(orgA.id)).find((s) => s.productoId === amoxi.id)!.cantidad;
  check('la dispensa restó del stock (30-2=28)', stockAmoxi === 28);
  const dispensasDeLaConsulta = await db.select().from(movimientosStock).where(eq(movimientosStock.consultaId, consulta.id));
  check('la dispensa queda asociada a la consulta', dispensasDeLaConsulta.length === 1 && dispensasDeLaConsulta[0].tipo === 'uso');

  console.log('5) Producto sin precio/dosis sigue siendo válido (no todo se vende suelto)');
  const comida = await crearProducto(orgA.id, { nombre: 'Comida para perro' });
  check('precio queda null si no se carga', comida.precio === null);

  console.log('6) Aislamiento entre organizaciones');
  const stockDeB = await listarStock(orgB.id);
  check('la organización B no ve stock de productos de A', stockDeB.length === 0);

  console.log(`\nRESULTADO: ${ok} OK, ${fail} fallas`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
