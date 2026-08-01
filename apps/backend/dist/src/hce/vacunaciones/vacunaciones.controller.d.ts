import { VacunacionesService } from './vacunaciones.service';
import { CreateVacunacionDto } from './dto/create-vacunacion.dto';
export declare class VacunacionesController {
    private readonly vacunaciones;
    constructor(vacunaciones: VacunacionesService);
    registrar(organizacionId: string, user: {
        sub: string;
    }, dto: CreateVacunacionDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        organizacionId: string;
        animalId: string;
        veterinarioId: string | null;
        fecha: string;
        producto: string | null;
        vademecumId: string | null;
        proximaDosis: string | null;
        loteProducto: string | null;
    }>;
    recordatorios(organizacionId: string, dias?: string): Promise<{
        id: string;
        animalId: string;
        animalNombre: string;
        codigoLegible: string | null;
        producto: string | null;
        proximaDosis: string | null;
        loteProducto: string | null;
    }[]>;
    historia(organizacionId: string, animalId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        organizacionId: string;
        animalId: string;
        veterinarioId: string | null;
        fecha: string;
        producto: string | null;
        vademecumId: string | null;
        proximaDosis: string | null;
        loteProducto: string | null;
    }[]>;
}
