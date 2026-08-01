import { DrizzleDB } from '../../database/drizzle.provider';
import { CreateVacunacionDto } from './dto/create-vacunacion.dto';
export declare class VacunacionesService {
    private readonly db;
    constructor(db: DrizzleDB);
    private verificarAnimal;
    registrar(organizacionId: string, veterinarioId: string, dto: CreateVacunacionDto): Promise<{
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
    historiaPorAnimal(organizacionId: string, animalId: string): Promise<{
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
    recordatorios(organizacionId: string, dias?: number): Promise<{
        id: string;
        animalId: string;
        animalNombre: string;
        codigoLegible: string | null;
        producto: string | null;
        proximaDosis: string | null;
        loteProducto: string | null;
    }[]>;
}
