import { IsNotEmpty, IsString } from 'class-validator';

export class CanjearCodigoDto {
  @IsString()
  @IsNotEmpty()
  dni!: string;

  @IsString()
  @IsNotEmpty()
  codigo!: string;
}
