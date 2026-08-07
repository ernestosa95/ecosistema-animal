import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTurnoDto {
  @IsUUID()
  animalId!: string;

  @IsDateString()
  fechaHora!: string;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsIn(['portal', 'telefono', 'mostrador'])
  canal?: 'portal' | 'telefono' | 'mostrador';

  @IsOptional()
  @IsUUID()
  veterinarioId?: string;
}
