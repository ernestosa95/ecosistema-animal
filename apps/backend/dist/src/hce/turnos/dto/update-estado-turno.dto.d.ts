export declare class UpdateEstadoTurnoDto {
    estado: 'confirmado' | 'reprogramado' | 'cancelado' | 'atendido' | 'ausente';
    fechaHora?: string;
    veterinarioId?: string;
}
