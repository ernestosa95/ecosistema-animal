import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { desc, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../database/drizzle.provider';
import { interesados } from '../database/schema';
import { MailService } from '../common/mail/mail.service';
import { CrearInteresadoDto } from './dto/crear-interesado.dto';

/**
 * Cupo fijo para el lanzamiento — a propósito en el código, no en una tabla
 * de configuración: es una decisión puntual de esta etapa, no un parámetro
 * que el super-admin necesite tocar desde una pantalla.
 */
const CUPO_MAXIMO = 10;

@Injectable()
export class InteresadosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly mail: MailService,
  ) {}

  private async contar(): Promise<number> {
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)::int` }).from(interesados);
    return count;
  }

  /** Público — la landing lo consulta al cargar para decidir si muestra el botón o el aviso de cupo lleno. */
  async cupo(): Promise<{ disponible: boolean; restantes: number }> {
    const usados = await this.contar();
    const restantes = Math.max(0, CUPO_MAXIMO - usados);
    return { disponible: restantes > 0, restantes };
  }

  /**
   * Público — registra un interesado si todavía hay cupo. Dispara dos mails
   * en paralelo (no bloquean el alta si fallan — mismo criterio que
   * `analitica/`, esta acción nunca debe romperse por el envío de mail):
   * confirmación al interesado y aviso a cada email de SUPERADMIN_EMAILS,
   * para que el seguimiento no dependa de entrar a mirar el panel.
   */
  async crear(dto: CrearInteresadoDto): Promise<{ ok: true }> {
    const usados = await this.contar();
    if (usados >= CUPO_MAXIMO) {
      throw new ConflictException('Ya completamos las primeras 10 solicitudes de esta etapa.');
    }
    await this.db.insert(interesados).values(dto);
    void this.notificar(dto).catch(() => {});
    return { ok: true };
  }

  private async notificar(dto: CrearInteresadoDto): Promise<void> {
    const confirmacion = this.mail.enviar(
      dto.email,
      '¡Recibimos tu interés en Huella!',
      `<p>Hola ${dto.nombre},</p>
       <p>Ya anotamos a <b>${dto.nombreVeterinaria}</b> entre los primeros en probar Huella — te vamos a contactar en breve para coordinar el alta y los primeros 3 meses gratis.</p>
       <p>Gracias por las ganas de probarlo.</p>`,
    );

    const admins = (process.env.SUPERADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    const avisos = admins.map((admin) =>
      this.mail.enviar(
        admin,
        `Nuevo interesado: ${dto.nombreVeterinaria}`,
        `<p><b>${dto.nombre}</b> (${dto.nombreVeterinaria}) dejó sus datos en la landing.</p>
         <p>Email: ${dto.email}${dto.celular ? `<br>Celular: ${dto.celular}` : ''}</p>`,
      ),
    );
    await Promise.all([confirmacion, ...avisos]);
  }

  /** STAFF (super-admin) — lista completa para hacer el seguimiento manual. */
  async listar() {
    return this.db.select().from(interesados).orderBy(desc(interesados.createdAt));
  }
}
