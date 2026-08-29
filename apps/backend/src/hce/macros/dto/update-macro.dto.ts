import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateMacroDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  tag?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  texto?: string;
}
