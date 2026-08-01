import { ConsultasService } from './consultas.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
export declare class ConsultasController {
    private readonly consultas;
    constructor(consultas: ConsultasService);
    crear(organizacionId: string, user: {
        sub: string;
    }, dto: CreateConsultaDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        organizacionId: string;
        animalId: string;
        veterinarioId: string | null;
        fecha: Date;
        motivo: string | null;
        anamnesis: string | null;
        examenFisico: string | null;
        diagnostico: string | null;
        tratamiento: string | null;
        pesoKg: string | null;
        temperaturaC: string | null;
        observaciones: string | null;
    }>;
    historia(organizacionId: string, animalId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        organizacionId: string;
        animalId: string;
        veterinarioId: string | null;
        fecha: Date;
        motivo: string | null;
        anamnesis: string | null;
        examenFisico: string | null;
        diagnostico: string | null;
        tratamiento: string | null;
        pesoKg: string | null;
        temperaturaC: string | null;
        observaciones: string | null;
    }[]>;
    obtener(organizacionId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        organizacionId: string;
        animalId: string;
        veterinarioId: string | null;
        fecha: Date;
        motivo: string | null;
        anamnesis: string | null;
        examenFisico: string | null;
        diagnostico: string | null;
        tratamiento: string | null;
        pesoKg: string | null;
        temperaturaC: string | null;
        observaciones: string | null;
    }>;
}
