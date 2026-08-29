import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';
import { Establecimiento } from './models/Establecimiento';
import { Existencia } from './models/Existencia';
import { Movimiento } from './models/Movimiento';
import { Evento } from './models/Evento';
import { Persona } from './models/Persona';
import { Animal } from './models/Animal';
import { Consulta } from './models/Consulta';
import { Vacunacion } from './models/Vacunacion';
import { Turno } from './models/Turno';

// jsi: false (bridge asíncrono estándar) a propósito: el binding JSI de
// WatermelonDB en Android necesita registrar WatermelonDBJSIPackage vía
// getJSIModulePackage(), una API de RN que ya no existe en el template
// Bridgeless de Expo 57 (@morrowdigital/watermelondb-expo-plugin quedó
// desactualizado para esto). El bridge async alcanza de sobra para el
// volumen de datos de Tropera en un dispositivo.
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: false,
  onSetUpError: (error) => {
    console.error('Error inicializando WatermelonDB', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    Establecimiento, Existencia, Movimiento, Evento,
    Persona, Animal, Consulta, Vacunacion, Turno,
  ],
});
