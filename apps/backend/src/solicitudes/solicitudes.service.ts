import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { solicitudes, usuarios, organizaciones, membresias, planes } from '../database/schema';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { AprobarSolicitudDto, RechazarSolicitudDto } from './dto/aprobar-solicitud.dto';

type Rol = 'propietario' | 'admin' | 'capataz' | 'veterinario' | 'recepcion';

/**
 * El form público de alta sigue pidiendo un único "tipo" (clínica/
 * establecimiento/mixta, texto libre en `solicitudes.tipoOrganizacion`) — más
 * simple para quien se da de alta por primera vez. Se traduce a los dos
 * booleans de `organizaciones` recién acá, al aprobar (el super-admin puede
 * ajustarlos después desde /admin si hace falta).
 */
function solucionesDeTipoOrg(tipo: string | null): { huellaActiva: boolean; troperaActiva: boolean } {
  const t = tipo ?? 'clinica';
  return {
    huellaActiva: t === 'clinica' || t === 'mixta',
    troperaActiva: t === 'establecimiento' || t === 'mixta',
  };
}

// Campos que se exponen (sin passwordHash).
const CAMPOS = {
  id: solicitudes.id,
  tipo: solicitudes.tipo,
  estado: solicitudes.estado,
  nombre: solicitudes.nombre,
  apellido: solicitudes.apellido,
  dni: solicitudes.dni,
  email: solicitudes.email,
  telefono: solicitudes.telefono,
  planId: solicitudes.planId,
  nombreOrganizacion: solicitudes.nombreOrganizacion,
  tipoOrganizacion: solicitudes.tipoOrganizacion,
  direccionOrganizacion: solicitudes.direccionOrganizacion,
  localidadOrganizacion: solicitudes.localidadOrganizacion,
  provinciaOrganizacion: solicitudes.provinciaOrganizacion,
  telefonoOrganizacion: solicitudes.telefonoOrganizacion,
  emailOrganizacion: solicitudes.emailOrganizacion,
  organizacionSolicitada: solicitudes.organizacionSolicitada,
  motivoRechazo: solicitudes.motivoRechazo,
  terminosAceptadosEn: solicitudes.terminosAceptadosEn,
  terminosVersion: solicitudes.terminosVersion,
  createdAt: solicitudes.createdAt,
  resolvedAt: solicitudes.resolvedAt,
};

// Debe coincidir con TERMINOS_VERSION en apps/web/src/legal/terminos.ts —
// si cambia el texto de los términos, subir la fecha acá también.
const TERMINOS_VERSION = '2026-08-30';

@Injectable()
export class SolicitudesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Alta pública de una solicitud de registro. */
  async crear(dto: CrearSolicitudDto) {
    const [usuarioExistente] = await this.db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.email, dto.email))
      .limit(1);
    if (usuarioExistente) {
      throw new ConflictException('Ese email ya tiene una cuenta');
    }

    const [pendiente] = await this.db
      .select({ id: solicitudes.id })
      .from(solicitudes)
      .where(and(eq(solicitudes.email, dto.email), eq(solicitudes.estado, 'pendiente')))
      .limit(1);
    if (pendiente) {
      throw new ConflictException('Ya hay una solicitud pendiente con ese email');
    }

    const [plan] = await this.db
      .select({ activo: planes.activo })
      .from(planes)
      .where(and(eq(planes.id, dto.planId), isNull(planes.deletedAt)))
      .limit(1);
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (!plan.activo) throw new BadRequestException('Este plan no está disponible para nuevas organizaciones');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const [sol] = await this.db
      .insert(solicitudes)
      .values({
        tipo: dto.tipo,
        nombre: dto.nombre,
        apellido: dto.apellido,
        dni: dto.dni,
        email: dto.email,
        passwordHash,
        telefono: dto.telefono,
        planId: dto.planId,
        nombreOrganizacion: dto.nombreOrganizacion,
        tipoOrganizacion: dto.tipoOrganizacion ?? 'clinica',
        direccionOrganizacion: dto.direccionOrganizacion,
        localidadOrganizacion: dto.localidadOrganizacion,
        provinciaOrganizacion: dto.provinciaOrganizacion,
        telefonoOrganizacion: dto.telefonoOrganizacion,
        emailOrganizacion: dto.emailOrganizacion,
        terminosAceptadosEn: new Date(),
        terminosVersion: TERMINOS_VERSION,
      })
      .returning({ id: solicitudes.id });

    return { ok: true, id: sol.id };
  }

  /** Planes disponibles para elegir en el form público de alta (sólo los habilitados para altas nuevas). */
  planesDisponibles() {
    return this.db
      .select({
        id: planes.id,
        nombre: planes.nombre,
        precioMensual: planes.precioMensual,
        precioAnual: planes.precioAnual,
        limitesRoles: planes.limitesRoles,
        descripcion: planes.descripcion,
      })
      .from(planes)
      .where(and(eq(planes.activo, true), isNull(planes.deletedAt)))
      .orderBy(asc(planes.precioMensual));
  }

  /** Bandeja del admin: solicitudes por estado ('pendiente' por defecto, 'todas' para todo). */
  listar(estado = 'pendiente') {
    const base = this.db.select(CAMPOS).from(solicitudes);
    const q = estado === 'todas' ? base : base.where(eq(solicitudes.estado, estado));
    return q.orderBy(desc(solicitudes.createdAt));
  }

  /** Aprueba una solicitud: crea usuario/organización/membresía según corresponda. */
  async aprobar(id: string, adminUserId: string, dto: AprobarSolicitudDto) {
    const [sol] = await this.db.select().from(solicitudes).where(eq(solicitudes.id, id)).limit(1);
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    if (sol.estado !== 'pendiente') throw new BadRequestException('La solicitud ya fue resuelta');

    if (sol.tipo === 'unirse' && !dto.organizacionId) {
      throw new BadRequestException('Elegí la organización destino para aprobar el "unirse"');
    }

    let [usuario] = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, sol.email))
      .limit(1);

    await this.db.transaction(async (tx) => {
      if (!usuario) {
        [usuario] = await tx
          .insert(usuarios)
          .values({
            email: sol.email,
            passwordHash: sol.passwordHash,
            nombre: sol.nombre,
            apellido: sol.apellido,
            dni: sol.dni,
          })
          .returning();
      }

      if (sol.tipo === 'crear') {
        const [org] = await tx
          .insert(organizaciones)
          .values({
            nombre: sol.nombreOrganizacion ?? `${sol.nombre} ${sol.apellido}`,
            ...solucionesDeTipoOrg(sol.tipoOrganizacion),
            direccion: sol.direccionOrganizacion,
            localidad: sol.localidadOrganizacion,
            provincia: sol.provinciaOrganizacion,
            telefono: sol.telefonoOrganizacion,
            email: sol.emailOrganizacion,
            // El plan elegido al solicitar la cuenta pasa directo a la
            // organización, y queda activada (para el cálculo de "próximo
            // vencimiento" de /admin) desde el momento en que se aprueba,
            // no desde que se cargó la solicitud.
            planId: sol.planId,
            fechaActivacion: new Date(),
          })
          .returning();
        await tx.insert(membresias).values({
          usuarioId: usuario.id,
          organizacionId: org.id,
          roles: ['propietario'],
        });
      } else {
        const [org] = await tx
          .select({ id: organizaciones.id })
          .from(organizaciones)
          .where(eq(organizaciones.id, dto.organizacionId!))
          .limit(1);
        if (!org) throw new NotFoundException('Organización destino no encontrada');

        const [ya] = await tx
          .select({ id: membresias.id })
          .from(membresias)
          .where(
            and(
              eq(membresias.usuarioId, usuario.id),
              eq(membresias.organizacionId, dto.organizacionId!),
            ),
          )
          .limit(1);
        if (!ya) {
          await tx.insert(membresias).values({
            usuarioId: usuario.id,
            organizacionId: dto.organizacionId!,
            roles: [(dto.rol ?? 'veterinario') as Rol],
          });
        }
      }

      await tx
        .update(solicitudes)
        .set({ estado: 'aprobada', resolvedAt: new Date(), resolvedPor: adminUserId })
        .where(eq(solicitudes.id, id));
    });

    return { ok: true };
  }

  /** Rechaza una solicitud. */
  async rechazar(id: string, adminUserId: string, dto: RechazarSolicitudDto) {
    const [sol] = await this.db
      .select({ estado: solicitudes.estado })
      .from(solicitudes)
      .where(eq(solicitudes.id, id))
      .limit(1);
    if (!sol) throw new NotFoundException('Solicitud no encontrada');
    if (sol.estado !== 'pendiente') throw new BadRequestException('La solicitud ya fue resuelta');

    await this.db
      .update(solicitudes)
      .set({
        estado: 'rechazada',
        motivoRechazo: dto.motivo,
        resolvedAt: new Date(),
        resolvedPor: adminUserId,
      })
      .where(eq(solicitudes.id, id));

    return { ok: true };
  }
}
