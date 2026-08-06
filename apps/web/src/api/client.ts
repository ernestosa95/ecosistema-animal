import type { Sesion, Especie, Animal, Consulta, Persona, Turno, EstadoTurno, RecordatorioVacuna } from './types';

const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

function headers(sesion?: Sesion | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sesion?.token) h['Authorization'] = `Bearer ${sesion.token}`;
  if (sesion?.organizacionId) h['X-Organizacion-Id'] = sesion.organizacionId;
  return h;
}

async function handle(res: Response) {
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  nombreOrganizacion: string;
}

export const api = {
  register(data: RegisterData): Promise<{ accessToken: string }> {
    return fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    }).then(handle);
  },

  login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; organizaciones: { organizacionId: string; rol: string }[] }> {
    return fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email, password }),
    }).then(handle);
  },

  especies(s: Sesion): Promise<Especie[]> {
    return fetch(`${API}/especies`, { headers: headers(s) }).then(handle);
  },

  animales(s: Sesion): Promise<Animal[]> {
    return fetch(`${API}/animales`, { headers: headers(s) }).then(handle);
  },

  crearAnimal(s: Sesion, data: Partial<Animal>): Promise<Animal> {
    return fetch(`${API}/animales`, {
      method: 'POST',
      headers: headers(s),
      body: JSON.stringify(data),
    }).then(handle);
  },

  actualizarAnimal(s: Sesion, id: string, data: Record<string, unknown>): Promise<Animal> {
    return fetch(`${API}/animales/${id}`, {
      method: 'PATCH',
      headers: headers(s),
      body: JSON.stringify(data),
    }).then(handle);
  },

  personas(s: Sesion): Promise<Persona[]> {
    return fetch(`${API}/personas`, { headers: headers(s) }).then(handle);
  },

  crearPersona(s: Sesion, data: Record<string, unknown>): Promise<Persona> {
    return fetch(`${API}/personas`, {
      method: 'POST',
      headers: headers(s),
      body: JSON.stringify(data),
    }).then(handle);
  },

  actualizarPersona(s: Sesion, id: string, data: Record<string, unknown>): Promise<Persona> {
    return fetch(`${API}/personas/${id}`, {
      method: 'PATCH',
      headers: headers(s),
      body: JSON.stringify(data),
    }).then(handle);
  },

  animalesDePersona(s: Sesion, personaId: string): Promise<Animal[]> {
    return fetch(`${API}/personas/${personaId}/animales`, { headers: headers(s) }).then(handle);
  },

  consultasDeAnimal(s: Sesion, animalId: string): Promise<Consulta[]> {
    return fetch(`${API}/consultas/animal/${animalId}`, { headers: headers(s) }).then(handle);
  },

  crearConsulta(s: Sesion, data: Record<string, unknown>): Promise<Consulta> {
    return fetch(`${API}/consultas`, {
      method: 'POST',
      headers: headers(s),
      body: JSON.stringify(data),
    }).then(handle);
  },

  turnos(s: Sesion, desde?: string, hasta?: string): Promise<Turno[]> {
    const q = new URLSearchParams();
    if (desde) q.set('desde', desde);
    if (hasta) q.set('hasta', hasta);
    const qs = q.toString();
    return fetch(`${API}/turnos${qs ? `?${qs}` : ''}`, { headers: headers(s) }).then(handle);
  },

  crearTurno(
    s: Sesion,
    data: { animalId: string; fechaHora: string; motivo?: string; canal?: string },
  ): Promise<Turno> {
    return fetch(`${API}/turnos`, {
      method: 'POST',
      headers: headers(s),
      body: JSON.stringify(data),
    }).then(handle);
  },

  cambiarEstadoTurno(
    s: Sesion,
    id: string,
    data: { estado: EstadoTurno; fechaHora?: string; veterinarioId?: string },
  ): Promise<Turno> {
    return fetch(`${API}/turnos/${id}/estado`, {
      method: 'PATCH',
      headers: headers(s),
      body: JSON.stringify(data),
    }).then(handle);
  },

  turnosDeAnimal(s: Sesion, animalId: string): Promise<Turno[]> {
    return fetch(`${API}/turnos/animal/${animalId}`, { headers: headers(s) }).then(handle);
  },

  recordatoriosVacunas(s: Sesion, dias = 30): Promise<RecordatorioVacuna[]> {
    return fetch(`${API}/vacunaciones/recordatorios?dias=${dias}`, { headers: headers(s) }).then(handle);
  },

};
