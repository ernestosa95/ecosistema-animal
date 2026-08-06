// Contrato de datos que consume el documento del carnet.
// El service arma este objeto a partir de la base; el documento sólo lo pinta.

export interface CarnetVacuna {
  nombre: string;
  aplicada: string;   // dd/mm/aaaa (ya formateada)
  proxima: string;    // dd/mm/aaaa o '—'
}

export interface CarnetPaciente {
  nombre: string;
  especie: string;
  raza: string;
  sexo: string;
  nacimiento: string;
  pelaje: string;
  esterilizado: string;
  codigoLegible: string;   // ESP-PAÍS-SECUENCIA-DV
  microchip: string;
}

export interface CarnetDueno {
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
  domicilio: string;
}

export interface CarnetData {
  emitidoEl: string;                 // dd/mm/aaaa
  qrDataUrl: string;                 // PNG data-url del QR al portal (nuevo)
  paciente: CarnetPaciente;
  dueno: CarnetDueno;
  vacunaciones: CarnetVacuna[];
}
