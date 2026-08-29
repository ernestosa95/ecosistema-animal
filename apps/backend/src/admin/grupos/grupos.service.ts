import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/drizzle.provider';
import { gruposOrganizaciones } from '../../database/schema';
import { CrearGrupoDto } from './dto/crear-grupo.dto';
import { ActualizarGrupoDto } from './dto/actualizar-grupo.dto';

@Injectable()
export class GruposService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  listar() {
    return this.db
      .select()
      .from(gruposOrganizaciones)
      .where(isNull(gruposOrganizaciones.deletedAt))
      .orderBy(asc(gruposOrganizaciones.nombre));
  }

  async crear(dto: CrearGrupoDto) {
    const [grupo] = await this.db
      .insert(gruposOrganizaciones)
      .values({ nombre: dto.nombre, descripcion: dto.descripcion })
      .returning();
    return grupo;
  }

  async actualizar(id: string, dto: ActualizarGrupoDto) {
    await this.verificar(id);
    const [grupo] = await this.db
      .update(gruposOrganizaciones)
      .set({
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        updatedAt: new Date(),
      })
      .where(eq(gruposOrganizaciones.id, id))
      .returning();
    return grupo;
  }

  async eliminar(id: string) {
    await this.verificar(id);
    await this.db
      .update(gruposOrganizaciones)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(gruposOrganizaciones.id, id));
    return { ok: true };
  }

  private async verificar(id: string) {
    const [g] = await this.db
      .select({ id: gruposOrganizaciones.id })
      .from(gruposOrganizaciones)
      .where(and(eq(gruposOrganizaciones.id, id), isNull(gruposOrganizaciones.deletedAt)))
      .limit(1);
    if (!g) throw new NotFoundException('Grupo no encontrado');
  }
}
