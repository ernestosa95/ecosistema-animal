export declare class CreateAnimalDto {
    nombre: string;
    especieId: string;
    personaId?: string;
    sexo?: 'macho' | 'hembra' | 'indefinido';
    fechaNacimiento?: string;
    fechaNacEstimada?: boolean;
    fotoUrl?: string;
    microchip?: string;
    datosEspecificos?: Record<string, unknown>;
}
