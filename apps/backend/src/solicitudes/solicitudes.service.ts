import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { solicitudes, usuarios, organizaciones, membresias } from '../database/schema';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { AprobarSolicitudDto, RechazarSolicitudDto } from './dto/aprobar-solicitud.dto';

type Rol = 'propietario' | 'admin' | 'capataz' | 'veterinario' | 'recepcion';
type TipoOrg = 'clinica' | 'establecimiento' | 'mixta';

// Campos que se exponen (sin passwordHash).
const CAMPOS = {
  id: solicitudes.id,
  tipo: solicitudes.tipo,
  estado: solicitudes.estado,
  nombre: solicitudes.nombre,
  apellido: solicitudes.apellido,
  email: solicitudes.email,
  telefono: solicitudes.telefono,
  nombreOrganizacion: solicitudes.nombreOrganizacion,
  tipoOrganizacion: solicitudes.tipoOrganizacion,
  organizacionSolicitada: solicitudes.organizacionSolicitada,
  motivoRechazo: solicitudes.motivoRechazo,
  createdAt: solicitudes.createdAt,
  resolvedAt: solicitudes.resolvedAt,
};

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

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const [sol] = await this.db
      .insert(solicitudes)
      .values({
        tipo: dto.tipo,
        nombre: dto.nombre,
        apellido: dto.apellido,
        email: dto.email,
        passwordHash,
        telefono: dto.telefono,
        nombreOrganizacion: dto.tipo === 'crear' ? dto.nombreOrganizacion : null,
        tipoOrganizacion: dto.tipo === 'crear' ? (dto.tipoOrganizacion ?? 'clinica') : null,
        organizacionSolicitada: dto.tipo === 'unirse' ? dto.organizacionSolicitada : null,
      })
      .returning({ id: solicitudes.id });

    return { ok: true, id: sol.id };
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
      throw new BadRequestException('Elegí la veterinaria destino para aprobar el "unirse"');
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
          })
          .returning();
      }

      if (sol.tipo === 'crear') {
        const [org] = await tx
          .insert(organizaciones)
          .values({
            nombre: sol.nombreOrganizacion ?? `${sol.nombre} ${sol.apellido}`,
            tipo: (sol.tipoOrganizacion ?? 'clinica') as TipoOrg,
          })
          .returning();
        await tx.insert(membresias).values({
          usuarioId: usuario.id,
          organizacionId: org.id,
          rol: 'propietario',
        });
      } else {
        const [org] = await tx
          .select({ id: organizaciones.id })
          .from(organizaciones)
          .where(eq(organizaciones.id, dto.organizacionId!))
          .limit(1);
        if (!org) throw new NotFoundException('Veterinaria destino no encontrada');

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
            rol: (dto.rol ?? 'veterinario') as Rol,
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
