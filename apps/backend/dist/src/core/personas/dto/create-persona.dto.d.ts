export declare class CreatePersonaDto {
    dni?: string;
    nombre: string;
    apellido: string;
    sexo?: 'masculino' | 'femenino' | 'otro';
    fechaNacimiento?: string;
    celular?: string;
    telefono?: string;
    email?: string;
}
