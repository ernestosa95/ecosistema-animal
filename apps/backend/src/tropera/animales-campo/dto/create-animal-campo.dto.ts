import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { CATEGORIAS_HACIENDA, CategoriaHacienda } from '../../existencias/dto/set-existencia.dto';

export class CreateAnimalCampoDto {
  @IsUUID()
  establecimientoId!: string;

  @IsIn(CATEGORIAS_HACIENDA)
  categoria!: CategoriaHacienda;

  /** Si no se manda, es alta express transitoria (§5.2): el service asigna "TEMP-N". */
  @IsOptional()
  @IsString()
  @MinLength(1)
  caravana?: string;

  @IsOptional()
  @IsString()
  sexo?: string;

  /** Fase E, §5.3: potrero donde se lo da de alta (opcional). */
  @IsOptional()
  @IsUUID()
  potreroId?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
