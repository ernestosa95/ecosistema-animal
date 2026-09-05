import { database } from './database';
import { uuid } from './uuid';
import { Persona } from './models/Persona';
import { Animal } from './models/Animal';
import type { Sesion } from '../auth/useSesion';
import { api } from '../api/client';

export const NUEVO_DUENO = '__nuevo__';

interface DatosDuenoNuevo {
  nombre: string;
  apellido: string;
  celular?: string;
  dni: string;
}

interface DatosAltaPaciente {
  nombre: string;
  especieId: string;
  sexo?: string | null;
  microchip?: string | null;
  /** Id de un dueño ya existente, `NUEVO_DUENO` para crear uno inline, o undefined/null para ninguno. */
  duenoId?: string | null;
  duenoNuevo?: DatosDuenoNuevo;
}

/**
 * Alta offline de paciente (+ dueño inline si hace falta), en una sola
 * transacción — misma lógica que usaba `paciente/nuevo.tsx` a mano, ahora
 * compartida con `SeleccionarAnimalModal` (accesos rápidos del Home) para
 * no mantener dos copias del mismo alta.
 */
export async function altaPacienteOffline(sesion: Sesion, dto: DatosAltaPaciente): Promise<string> {
  let animalId = '';
  await database.write(async () => {
    let personaId: string | null = dto.duenoId ?? null;
    if (dto.duenoId === NUEVO_DUENO && dto.duenoNuevo) {
      const persona = await database.get<Persona>('personas').create((p) => {
        p._raw.id = uuid();
        p.organizacionId = sesion.organizacionId;
        p.nombre = dto.duenoNuevo!.nombre.trim();
        p.apellido = dto.duenoNuevo!.apellido.trim();
        p.celular = dto.duenoNuevo!.celular?.trim() || null;
        p.dni = dto.duenoNuevo!.dni?.trim() || null;
        p.sexo = null;
        p.fechaNacimiento = null;
        p.telefono = null;
        p.email = null;
      });
      personaId = persona.id;
    }

    const animal = await database.get<Animal>('animales').create((a) => {
      a._raw.id = uuid();
      a.organizacionId = sesion.organizacionId;
      a.especieId = dto.especieId;
      a.personaId = personaId;
      a.nombre = dto.nombre.trim();
      a.sexo = dto.sexo || null;
      a.fechaNacimiento = null;
      a.fechaNacEstimada = false;
      a.fotoUrl = null;
      a.microchip = dto.microchip?.trim() || null;
      a.codigoLegible = null;
      a.estado = 'activo';
      a.datosEspecificos = '{}';
    });
    animalId = animal.id;
  });
  api.registrarEvento(sesion, 'accion', 'animal-crear');
  return animalId;
}
