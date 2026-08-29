import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreateEgresoDto {
  @IsString()
  @MinLength(1)
  concepto!: string;

  @IsNumber()
  @Min(0.01)
  monto!: number;
}
