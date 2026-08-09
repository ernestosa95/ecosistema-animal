// apps/web/src/config/especieDatos.ts
// Catálogo de campos "datos específicos" por especie.
// Se guardan en animales.datosEspecificos (JSONB). Editá libremente este archivo:
// agregar/quitar campos acá alcanza para que aparezcan en alta, edición y ficha.

import type { Especie } from '../api/types';

export type TipoCampo = 'text' | 'number' | 'select' | 'checkbox';

export interface CampoEspecie {
  clave: string;        // clave dentro de datosEspecificos
  etiqueta: string;     // label visible
  tipo: TipoCampo;
  opciones?: string[];  // para tipo 'select'
  placeholder?: string;
}

// Campos por CÓDIGO de especie (core.especies.codigo).
const POR_CODIGO: Record<string, CampoEspecie[]> = {
  CAN: [
    { clave: 'raza', etiqueta: 'Raza', tipo: 'text', placeholder: 'Ej: Labrador Retriever' },
    { clave: 'pelaje', etiqueta: 'Pelaje / color', tipo: 'text' },
    { clave: 'tamano', etiqueta: 'Tamaño', tipo: 'select', opciones: ['Toy', 'Pequeño', 'Mediano', 'Grande', 'Gigante'] },
    { clave: 'esterilizado', etiqueta: 'Esterilizado', tipo: 'checkbox' },
  ],
  FEL: [
    { clave: 'raza', etiqueta: 'Raza', tipo: 'text', placeholder: 'Ej: Siamés' },
    { clave: 'pelaje', etiqueta: 'Pelaje / color', tipo: 'text' },
    { clave: 'pelo', etiqueta: 'Pelo', tipo: 'select', opciones: ['Corto', 'Largo'] },
    { clave: 'esterilizado', etiqueta: 'Esterilizado', tipo: 'checkbox' },
  ],
  EQU: [
    { clave: 'raza', etiqueta: 'Raza', tipo: 'text', placeholder: 'Ej: Criollo' },
    { clave: 'capa', etiqueta: 'Capa / pelaje', tipo: 'text', placeholder: 'Ej: Zaino' },
    { clave: 'alzada', etiqueta: 'Alzada (cm)', tipo: 'number' },
    { clave: 'disciplina', etiqueta: 'Disciplina', tipo: 'text' },
  ],
  BOV: [
    { clave: 'raza', etiqueta: 'Raza', tipo: 'text', placeholder: 'Ej: Angus' },
    { clave: 'categoria', etiqueta: 'Categoría', tipo: 'select', opciones: ['Ternero/a', 'Vaquillona', 'Novillo', 'Vaca', 'Toro'] },
    { clave: 'caravana', etiqueta: 'Caravana / RFID', tipo: 'text' },
  ],
  AVE: [
    { clave: 'especieAve', etiqueta: 'Especie', tipo: 'text', placeholder: 'Ej: Calopsita' },
    { clave: 'anillo', etiqueta: 'N.º de anillo', tipo: 'text' },
  ],
  CON: [
    { clave: 'raza', etiqueta: 'Raza', tipo: 'text' },
    { clave: 'pelaje', etiqueta: 'Pelaje / color', tipo: 'text' },
  ],
};

// Fallback por NOMBRE, por si algún código no coincide con el esperado.
const NOMBRE_A_CODIGO: Record<string, string> = {
  Canino: 'CAN', Perro: 'CAN',
  Felino: 'FEL', Gato: 'FEL',
  Equino: 'EQU', Caballo: 'EQU',
  Bovino: 'BOV', Vaca: 'BOV',
  Ave: 'AVE',
  Conejo: 'CON',
};

// Para cualquier especie no configurada arriba.
const DEFECTO: CampoEspecie[] = [
  { clave: 'raza', etiqueta: 'Raza', tipo: 'text' },
  { clave: 'color', etiqueta: 'Color / seña particular', tipo: 'text' },
];

/** Devuelve la lista de campos para una especie (o [] si no hay especie elegida). */
export function camposDeEspecie(especie?: Especie | null): CampoEspecie[] {
  if (!especie) return [];
  const porCodigo = POR_CODIGO[(especie.codigo || '').toUpperCase()];
  if (porCodigo) return porCodigo;
  const codigo = NOMBRE_A_CODIGO[especie.nombre];
  if (codigo && POR_CODIGO[codigo]) return POR_CODIGO[codigo];
  return DEFECTO;
}
