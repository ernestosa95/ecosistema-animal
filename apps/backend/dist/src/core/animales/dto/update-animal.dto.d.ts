export declare class UpdateAnimalDto {
    nombre?: string;
    especieId?: string;
    personaId?: string;
    sexo?: 'macho' | 'hembra' | 'indefinido';
    fechaNacimiento?: string;
    fechaNacEstimada?: boolean;
    fotoUrl?: string;
    microchip?: string;
    estado?: 'activo' | 'inactivo' | 'fallecido';
    datosEspecificos?: Record<string, unknown>;
}
