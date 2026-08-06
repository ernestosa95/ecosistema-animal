export interface Sesion {
  token: string;
  organizacionId: string;
  rol: string;
}

export interface Especie {
  id: string;
  codigo: string;
  nombre: string;
}

export interface Animal {
  id: string;
  nombre: string;
  especieId: string;
  sexo?: string | null;
  fechaNacimiento?: string | null;
  codigoLegible?: string | null;
  microchip?: string | null;
  estado: string;
  datosEspecificos?: Record<string, unknown>;
  personaId?: string | null;
}

export interface Persona {
  id: string;
  dni?: string | null;
  nombre: string;
  apellido: string;
  sexo?: string | null;
  fechaNacimiento?: string | null;
  celular?: string | null;
  telefono?: string | null;
  email?: string | null;
}

export interface Consulta {
  id: string;
  fecha: string;
  motivo?: string | null;
  diagnostico?: string | null;
  tratamiento?: string | null;
  pesoKg?: string | null;
  veterinarioId?: string | null;
}

export type EstadoTurno =
  | 'solicitado' | 'confirmado' | 'reprogramado' | 'cancelado' | 'atendido' | 'ausente';

export interface Turno {
  id: string;
  animalId: string;
  personaId?: string | null;
  fechaHora: string;            // ISO (timestamptz)
  estado: EstadoTurno;
  motivo?: string | null;
  canal?: string | null;
  veterinarioId?: string | null;
}