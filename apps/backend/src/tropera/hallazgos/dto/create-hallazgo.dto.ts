import { IsString, MinLength } from 'class-validator';

export class CreateHallazgoDto {
  @IsString()
  @MinLength(1)
  nombre!: string;
}
