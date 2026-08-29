export interface Sesion {
  token: string;
  refreshToken: string;
  organizacionId: string;
  roles: string[]; // roles apilables — un usuario puede tener más de uno en la misma organización
  tipo?: string; // tipo de organización ('clinica'|'establecimiento'|'mixta'), para elegir el dashboard
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
  anamnesis?: string | null;
  examenFisico?: string | null;
  diagnostico?: string | null;
  tratamiento?: string | null;
  pesoKg?: string | null;
  temperaturaC?: string | null;
  observaciones?: string | null;
  veterinarioId?: string | null;
}

// --- Macros (Fase B, §3.1: bloques de texto predefinidos por categoría) ---

export type CategoriaMacro = 'anamnesis' | 'examenFisico' | 'diagnostico' | 'tratamiento';

export interface Macro {
  id: string;
  categoria: CategoriaMacro;
  tag: string;
  texto: string;
}

// --- Indicaciones / prescripción (Fase B, §3.2 y §3.3) ---

export type OrigenIndicacion = 'stock_interno' | 'receta_externa';

export interface Indicacion {
  id: string;
  consultaId: string;
  animalId: string;
  origen: OrigenIndicacion;
  productoId?: string | null;
  productoNombre?: string | null;
  dosis?: string | null;
  cantidadStock?: number | null;
  frecuencia?: string | null;
  duracionDias?: number | null; // null = indicación puntual; con valor = esquema continuo
  observaciones?: string | null;
  activo: boolean;
  createdAt: string;
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
  // `GET /turnos` (agenda) los trae con join — no todos los callers los necesitan (por eso opcionales).
  pacienteNombre?: string | null;
  especie?: string | null;
  duenoNombre?: string | null;
  duenoApellido?: string | null;
}

/** `GET /consultas` (drill-down del dashboard, §4.2) — consultas de toda la organización con el nombre del paciente. */
export interface ConsultaResumen {
  id: string;
  fecha: string;
  motivo?: string | null;
  diagnostico?: string | null;
  pesoKg?: string | null;
  animalId: string;
  pacienteNombre?: string | null;
}

export interface Vacunacion {
  id: string;
  animalId: string;
  producto?: string | null;
  vademecumId?: string | null;
  fecha: string;                // 'YYYY-MM-DD'
  proximaDosis?: string | null; // 'YYYY-MM-DD'
  loteProducto?: string | null;
  veterinarioId?: string | null;
}

export interface RecordatorioVacuna {
  id: string;
  animalId: string;
  animalNombre: string;
  codigoLegible: string | null;
  producto: string;
  proximaDosis: string;        // 'YYYY-MM-DD'
  loteProducto?: string | null;
}

// --- Tropera (hacienda) ---

export type CategoriaHacienda = 'vaca' | 'toro' | 'ternero' | 'ternera' | 'vaquillona' | 'novillo';

export interface Establecimiento {
  id: string;
  nombre: string;
  ubicacion?: string | null;
  superficieHa?: string | null;
}

export interface Existencia {
  categoria: CategoriaHacienda;
  cantidad: number;
}

export type TipoMovimiento = 'nacimiento' | 'compra' | 'muerte' | 'venta' | 'traslado';

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  categoria: CategoriaHacienda;
  cantidad: number;
  establecimientoOrigenId?: string | null;
  establecimientoDestinoId?: string | null;
  fecha: string;              // 'YYYY-MM-DD'
  observaciones?: string | null;
}

export type TipoEvento =
  | 'vacunacion' | 'desparasitacion' | 'tratamiento'
  | 'servicio' | 'diagnostico_prenez' | 'destete';

export interface Evento {
  id: string;
  establecimientoId: string;
  tipo: TipoEvento;
  categoria?: CategoriaHacienda | null;
  cantidad?: number | null;
  producto?: string | null;
  fecha: string;               // 'YYYY-MM-DD'
  observaciones?: string | null;
}

// --- Farmacia (vademécum + stock) ---

export interface Producto {
  id: string;
  nombre: string;
  presentacion?: string | null;
  unidad?: string | null;
  categoria?: string | null;
  activo: boolean;
  // Datos opcionales para la calculadora de dosificación (Fase B).
  concentracion?: string | null;
  unidadConcentracion?: string | null;
  dosisSugeridaMgKg?: string | null;
  // Precio de venta unitario (Fase D) — opcional, no todo se vende suelto en mostrador.
  precio?: string | null;
}

export interface StockItem {
  productoId: string;
  nombre: string;
  unidad?: string | null;
  cantidad: number;
}

export type TipoMovimientoStock = 'compra' | 'uso' | 'vencimiento' | 'merma' | 'venta';

export interface MovimientoStock {
  id: string;
  productoId: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  fecha: string;               // 'YYYY-MM-DD'
  observaciones?: string | null;
  consultaId?: string | null;  // sólo en dispensas (F4.3): la consulta que originó el uso
}

// --- Dashboard de indicadores ---

export interface ResumenClinica {
  pacientesActivos: number;
  consultasEsteMes: number;
  turnosPorEstado: Record<string, number>;
  vacunasPorVencer: number;
}

export interface ResumenTropera {
  existenciasPorCategoria: { establecimientoId: string; categoria: CategoriaHacienda; cantidad: number }[];
  movimientosPorTipo: Record<string, number>;
}

export interface ResumenDashboard {
  tipo: string;
  clinica?: ResumenClinica;
  tropera?: ResumenTropera;
}

// --- Admin: grupos, planes, acceso, mensajes ---

export interface GrupoOrganizacion {
  id: string;
  nombre: string;
  descripcion?: string | null;
}

export interface Plan {
  id: string;
  nombre: string;
  precio?: string | null;
  descripcion?: string | null;
  activo: boolean;
}

export type DestinatarioTipo = 'todas' | 'organizacion' | 'grupo';

export interface MensajePlataforma {
  id: string;
  titulo: string;
  cuerpo: string;
  destinatarioTipo: DestinatarioTipo;
  organizacionId?: string | null;
  grupoId?: string | null;
  publicadoEn: string;
}

// --- Caja (Fase D: §2.6 caja chica, §4.1 auditoría de cierres, §4.4 honorarios) ---

export type EstadoCaja = 'abierta' | 'cerrada';
export type EstadoAuditoriaCaja = 'pendiente' | 'aceptado' | 'en_revision' | 'rechazado';

export interface Caja {
  id: string;
  montoInicial: string;
  montoDeclarado?: string | null;
  montoCalculado?: string | null;
  diferencia?: string | null;
  estado: EstadoCaja;
  estadoAuditoria?: EstadoAuditoriaCaja | null;
  observacionesCierre?: string | null;
  observacionesAuditoria?: string | null;
  abiertaEn: string;
  cerradaEn?: string | null;
  auditadaEn?: string | null;
}

export interface Cobro {
  id: string;
  cajaId: string;
  veterinarioId?: string | null;
  concepto: string;
  monto: string;
  metodoPago?: string | null;
  productoId?: string | null;
  cantidad?: number | null;
  consultaId?: string | null;
  liquidado: boolean;
  liquidadoEn?: string | null;
  createdAt: string;
}

export interface Egreso {
  id: string;
  cajaId: string;
  concepto: string;
  monto: string;
  createdAt: string;
}