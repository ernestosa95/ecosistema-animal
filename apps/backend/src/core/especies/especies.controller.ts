import { Controller, Get, UseGuards } from '@nestjs/common';
import { EspeciesService } from './especies.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('especies')
@UseGuards(JwtAuthGuard)
export class EspeciesController {
  constructor(private readonly especies: EspeciesService) {}

  @Get()
  listar() {
    return this.especies.listar();
  }
}
