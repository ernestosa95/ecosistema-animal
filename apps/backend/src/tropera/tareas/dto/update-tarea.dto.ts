import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateTareaDto {
  @IsIn(['completada', 'cancelada'])
  estado!: 'completada' | 'cancelada';

  @IsOptional()
  @IsString()
  observaciones?: string;
}
